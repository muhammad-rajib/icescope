use crate::models::{DataFileRecord, SnapshotScanResult};
use anyhow::{anyhow, Context};
use apache_avro::{types::Value as AvroValue, Reader};
use serde::Deserialize;
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::thread;

const MANIFEST_READ_PARALLELISM: usize = 16;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct TableMetadataJson {
    location: String,
    current_snapshot_id: Option<i64>,
    snapshots: Vec<SnapshotJson>,
    properties: Option<BTreeMap<String, String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct SnapshotJson {
    snapshot_id: i64,
    manifest_list: Option<String>,
}

#[derive(Debug, Clone)]
struct ManifestListEntry {
    manifest_path: String,
}

pub fn current_snapshot_data_files(
    warehouse: &Path,
    namespace: &str,
    table: &str,
) -> anyhow::Result<SnapshotScanResult> {
    let metadata_path = latest_metadata_path(warehouse, namespace, table)?;
    let metadata = read_table_metadata(&metadata_path)?;
    current_snapshot_data_files_from_metadata(&metadata_path, namespace, table, &metadata)
}

pub fn current_snapshot_manifest_urls(
    warehouse: &Path,
    namespace: &str,
    table: &str,
) -> anyhow::Result<Vec<String>> {
    let metadata_path = latest_metadata_path(warehouse, namespace, table)?;
    let metadata = read_table_metadata(&metadata_path)?;
    let snapshot_id = metadata
        .current_snapshot_id
        .ok_or_else(|| anyhow!("Iceberg table has no current snapshot"))?;
    let snapshot = metadata
        .snapshots
        .iter()
        .find(|snapshot| snapshot.snapshot_id == snapshot_id)
        .ok_or_else(|| anyhow!("Current snapshot {snapshot_id} was not found in metadata"))?;
    let Some(manifest_list) = &snapshot.manifest_list else {
        return Ok(Vec::new());
    };

    let table_location = normalize_uri(&metadata.location);
    let manifest_list_path = resolve_metadata_uri(&metadata_path, &table_location, manifest_list)?;

    Ok(read_manifest_list(&manifest_list_path)?
        .into_iter()
        .map(|entry| entry.manifest_path)
        .collect())
}

fn current_snapshot_data_files_from_metadata(
    metadata_path: &Path,
    namespace: &str,
    table: &str,
    metadata: &TableMetadataJson,
) -> anyhow::Result<SnapshotScanResult> {
    let snapshot_id = metadata
        .current_snapshot_id
        .ok_or_else(|| anyhow!("Iceberg table has no current snapshot"))?;
    let snapshot = metadata
        .snapshots
        .iter()
        .find(|snapshot| snapshot.snapshot_id == snapshot_id)
        .ok_or_else(|| anyhow!("Current snapshot {snapshot_id} was not found in metadata"))?;

    let table_location = normalize_uri(&metadata.location);

    let files = if let Some(manifest_list) = &snapshot.manifest_list {
        let manifest_list_path =
            resolve_metadata_uri(metadata_path, &table_location, manifest_list)?;
        let manifest_entries = read_manifest_list(&manifest_list_path)?;
        read_manifests_parallel(metadata_path, &table_location, manifest_entries)?
    } else {
        Vec::new()
    };

    let files = if files.is_empty() {
        fixture_data_files(metadata_path, metadata, namespace, table)?
    } else {
        files
    };

    Ok(SnapshotScanResult {
        namespace: namespace.to_string(),
        table: table.to_string(),
        files,
    })
}

fn latest_metadata_path(warehouse: &Path, namespace: &str, table: &str) -> anyhow::Result<PathBuf> {
    let metadata_dir = table_metadata_dir(warehouse, namespace, table);
    if !metadata_dir.exists() {
        return Err(anyhow!(
            "Iceberg metadata directory not found: {}",
            metadata_dir.display()
        ));
    }

    let mut metadata_files = std::fs::read_dir(&metadata_dir)?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with('v') && name.ends_with(".metadata.json"))
        })
        .collect::<Vec<_>>();
    metadata_files.sort_by_key(|path| metadata_version(path).unwrap_or(0));

    metadata_files
        .pop()
        .ok_or_else(|| anyhow!("No vN.metadata.json found in {}", metadata_dir.display()))
}

fn table_metadata_dir(warehouse: &Path, namespace: &str, table: &str) -> PathBuf {
    let namespaced = warehouse.join(namespace).join(table).join("metadata");
    let root_namespace = warehouse
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("default");
    if namespaced.exists() || !matches!(namespace, "default") && namespace != root_namespace {
        return namespaced;
    }

    warehouse.join(table).join("metadata")
}

fn metadata_version(path: &Path) -> Option<u32> {
    path.file_name()
        .and_then(|name| name.to_str())
        .and_then(|name| name.strip_prefix('v'))
        .and_then(|name| name.strip_suffix(".metadata.json"))
        .and_then(|version| version.parse().ok())
}

fn read_table_metadata(path: &Path) -> anyhow::Result<TableMetadataJson> {
    let contents = std::fs::read_to_string(path)
        .with_context(|| format!("failed to read table metadata {}", path.display()))?;
    serde_json::from_str(&contents)
        .with_context(|| format!("failed to parse table metadata {}", path.display()))
}

fn read_manifest_list(path: &Path) -> anyhow::Result<Vec<ManifestListEntry>> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let file = std::fs::File::open(path)
        .with_context(|| format!("failed to open manifest list {}", path.display()))?;
    let reader = Reader::new(file)
        .with_context(|| format!("failed to read manifest list Avro {}", path.display()))?;
    let mut entries = Vec::new();

    for value in reader {
        let value = value?;
        if let Some(manifest_path) = avro_field_string(&value, "manifest_path") {
            entries.push(ManifestListEntry { manifest_path });
        }
    }

    Ok(entries)
}

fn read_manifest(path: &Path, table_location: &str) -> anyhow::Result<Vec<DataFileRecord>> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let file = std::fs::File::open(path)
        .with_context(|| format!("failed to open manifest {}", path.display()))?;
    let reader = Reader::new(file)
        .with_context(|| format!("failed to read manifest Avro {}", path.display()))?;
    let mut files = Vec::new();

    for value in reader {
        let value = value?;
        if !is_live_manifest_entry(&value) {
            continue;
        }

        if let Some(data_file) = avro_field(&value, "data_file") {
            let Some(file_path) = avro_field_string(data_file, "file_path") else {
                continue;
            };
            let record_count = avro_field_i64(data_file, "record_count").unwrap_or_default() as u64;
            let partition_values = avro_field(data_file, "partition")
                .map(avro_record_to_json_map)
                .unwrap_or_default();
            let lower_bounds = avro_field(data_file, "lower_bounds")
                .map(avro_map_to_json_map)
                .unwrap_or_default();
            let upper_bounds = avro_field(data_file, "upper_bounds")
                .map(avro_map_to_json_map)
                .unwrap_or_default();

            files.push(DataFileRecord {
                file_path: resolve_data_file_uri(table_location, &file_path),
                record_count,
                partition_values,
                lower_bounds,
                upper_bounds,
            });
        }
    }

    Ok(files)
}

fn read_manifests_parallel(
    metadata_path: &Path,
    table_location: &str,
    manifest_entries: Vec<ManifestListEntry>,
) -> anyhow::Result<Vec<DataFileRecord>> {
    let manifest_paths = manifest_entries
        .into_iter()
        .map(|entry| resolve_metadata_uri(metadata_path, table_location, &entry.manifest_path))
        .collect::<anyhow::Result<Vec<_>>>()?;
    let mut files = Vec::new();

    for chunk in manifest_paths.chunks(MANIFEST_READ_PARALLELISM) {
        let chunk_files = thread::scope(|scope| {
            let handles = chunk
                .iter()
                .map(|manifest_path| {
                    let table_location = table_location.to_string();
                    scope.spawn(move || read_manifest(manifest_path, &table_location))
                })
                .collect::<Vec<_>>();

            handles
                .into_iter()
                .map(|handle| {
                    handle
                        .join()
                        .map_err(|_| anyhow!("manifest reader thread panicked"))?
                })
                .collect::<anyhow::Result<Vec<_>>>()
        })?;

        files.extend(chunk_files.into_iter().flatten());
    }

    Ok(files)
}

fn is_live_manifest_entry(value: &AvroValue) -> bool {
    matches!(avro_field_i32(value, "status"), None | Some(0) | Some(1))
}

fn fixture_data_files(
    metadata_path: &Path,
    metadata: &TableMetadataJson,
    namespace: &str,
    table: &str,
) -> anyhow::Result<Vec<DataFileRecord>> {
    let Some(properties) = &metadata.properties else {
        return Ok(Vec::new());
    };
    let Some(data_file) = properties.get("fixture.data-file") else {
        return Ok(Vec::new());
    };

    let metadata_dir = metadata_path.parent().ok_or_else(|| {
        anyhow!(
            "metadata path has no metadata directory: {}",
            metadata_path.display()
        )
    })?;
    let file_path = normalize_path(metadata_dir.join(data_file));
    let record_count = properties
        .get("fixture.record-count")
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or_default();

    Ok(vec![DataFileRecord {
        file_path,
        record_count,
        partition_values: BTreeMap::from([(
            "namespace".to_string(),
            Value::String(namespace.to_string()),
        )]),
        lower_bounds: BTreeMap::new(),
        upper_bounds: BTreeMap::from([("table".to_string(), Value::String(table.to_string()))]),
    }])
}

fn resolve_metadata_uri(
    metadata_path: &Path,
    table_location: &str,
    uri: &str,
) -> anyhow::Result<PathBuf> {
    let normalized = normalize_uri(uri);

    if let Some(local_path) = local_file_uri_path(&normalized) {
        return Ok(PathBuf::from(local_path));
    }

    if normalized.starts_with("s3://") {
        return Err(anyhow!(
            "S3 manifest scanning is parsed, but local DataFusion registration for S3 files is not wired yet: {normalized}"
        ));
    }

    let base = if normalized.starts_with("metadata/") {
        table_location.trim_start_matches("file://").to_string()
    } else {
        metadata_path
            .parent()
            .ok_or_else(|| anyhow!("metadata file has no parent: {}", metadata_path.display()))?
            .display()
            .to_string()
    };

    Ok(PathBuf::from(base).join(normalized))
}

fn resolve_data_file_uri(table_location: &str, file_path: &str) -> String {
    let normalized = normalize_uri(file_path);

    if let Some(local_path) = local_file_uri_path(&normalized) {
        return local_path.to_string();
    }

    if normalized.starts_with("s3://") {
        return normalized;
    }

    let table_location = normalize_uri(table_location);
    if let Some(local_path) = local_file_uri_path(&table_location) {
        return normalize_path(PathBuf::from(local_path).join(normalized));
    }

    format!(
        "{}/{}",
        table_location.trim_end_matches('/'),
        normalized.trim_start_matches('/')
    )
}

fn normalize_uri(uri: &str) -> String {
    if let Some(rest) = uri.strip_prefix("s3a://") {
        format!("s3://{rest}")
    } else {
        uri.to_string()
    }
}

fn local_file_uri_path(uri: &str) -> Option<&str> {
    uri.strip_prefix("file://")
        .or_else(|| uri.strip_prefix("file:"))
}

fn normalize_path(path: PathBuf) -> String {
    path.components()
        .collect::<PathBuf>()
        .to_string_lossy()
        .to_string()
}

fn avro_field<'a>(value: &'a AvroValue, field_name: &str) -> Option<&'a AvroValue> {
    match value {
        AvroValue::Record(fields) => fields
            .iter()
            .find(|(name, _)| name == field_name)
            .map(|(_, value)| value),
        _ => None,
    }
}

fn avro_field_string(value: &AvroValue, field_name: &str) -> Option<String> {
    match avro_field(value, field_name)? {
        AvroValue::String(value) => Some(value.clone()),
        AvroValue::Union(_, value) => match value.as_ref() {
            AvroValue::String(value) => Some(value.clone()),
            _ => None,
        },
        _ => None,
    }
}

fn avro_field_i32(value: &AvroValue, field_name: &str) -> Option<i32> {
    match avro_field(value, field_name)? {
        AvroValue::Int(value) => Some(*value),
        AvroValue::Union(_, value) => match value.as_ref() {
            AvroValue::Int(value) => Some(*value),
            _ => None,
        },
        _ => None,
    }
}

fn avro_field_i64(value: &AvroValue, field_name: &str) -> Option<i64> {
    match avro_field(value, field_name)? {
        AvroValue::Long(value) => Some(*value),
        AvroValue::Int(value) => Some((*value).into()),
        AvroValue::Union(_, value) => match value.as_ref() {
            AvroValue::Long(value) => Some(*value),
            AvroValue::Int(value) => Some((*value).into()),
            _ => None,
        },
        _ => None,
    }
}

fn avro_record_to_json_map(value: &AvroValue) -> BTreeMap<String, Value> {
    match unwrap_union(value) {
        AvroValue::Record(fields) => fields
            .iter()
            .filter_map(|(name, value)| avro_to_json(value).map(|value| (name.clone(), value)))
            .collect(),
        _ => BTreeMap::new(),
    }
}

fn avro_map_to_json_map(value: &AvroValue) -> BTreeMap<String, Value> {
    match unwrap_union(value) {
        AvroValue::Map(values) => values
            .iter()
            .filter_map(|(key, value)| avro_to_json(value).map(|value| (key.clone(), value)))
            .collect(),
        AvroValue::Array(values) => values
            .iter()
            .filter_map(|value| match unwrap_union(value) {
                AvroValue::Record(fields) => {
                    let key = fields
                        .iter()
                        .find(|(name, _)| name == "key")
                        .and_then(|(_, value)| avro_to_json(value))
                        .map(json_key)?;
                    let value = fields
                        .iter()
                        .find(|(name, _)| name == "value")
                        .and_then(|(_, value)| avro_to_json(value))?;
                    Some((key, value))
                }
                _ => None,
            })
            .collect(),
        _ => BTreeMap::new(),
    }
}

fn avro_to_json(value: &AvroValue) -> Option<Value> {
    match unwrap_union(value) {
        AvroValue::Null => Some(Value::Null),
        AvroValue::Boolean(value) => Some(Value::Bool(*value)),
        AvroValue::Int(value) => Some(Value::Number((*value).into())),
        AvroValue::Long(value) => Some(Value::Number((*value).into())),
        AvroValue::Float(value) => serde_json::Number::from_f64((*value).into()).map(Value::Number),
        AvroValue::Double(value) => serde_json::Number::from_f64(*value).map(Value::Number),
        AvroValue::String(value) => Some(Value::String(value.clone())),
        AvroValue::Bytes(value) | AvroValue::Fixed(_, value) => {
            Some(Value::String(bytes_to_hex(value)))
        }
        AvroValue::Enum(_, value) => Some(Value::String(value.clone())),
        AvroValue::Record(_) => Some(Value::Object(
            avro_record_to_json_map(value)
                .into_iter()
                .collect::<serde_json::Map<_, _>>(),
        )),
        _ => None,
    }
}

fn unwrap_union(value: &AvroValue) -> &AvroValue {
    match value {
        AvroValue::Union(_, value) => value.as_ref(),
        value => value,
    }
}

fn json_key(value: Value) -> String {
    match value {
        Value::String(value) => value,
        other => other.to_string(),
    }
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>()
}

#[cfg(test)]
mod tests {
    use super::{normalize_uri, resolve_data_file_uri};

    #[test]
    fn normalizes_s3a_paths() {
        assert_eq!(
            normalize_uri("s3a://bucket/table/data.parquet"),
            "s3://bucket/table/data.parquet"
        );
    }

    #[test]
    fn resolves_catalog_relative_path() {
        assert_eq!(
            resolve_data_file_uri("file:///tmp/warehouse/analytics/events", "data/a.parquet"),
            "/tmp/warehouse/analytics/events/data/a.parquet"
        );
    }

    #[test]
    fn resolves_single_slash_file_uri() {
        assert_eq!(
            resolve_data_file_uri("file:/tmp/warehouse/demo/customers", "data/a.parquet"),
            "/tmp/warehouse/demo/customers/data/a.parquet"
        );
        assert_eq!(
            resolve_data_file_uri(
                "file:/tmp/warehouse/demo/customers",
                "file:/tmp/warehouse/demo/customers/data/a.parquet"
            ),
            "/tmp/warehouse/demo/customers/data/a.parquet"
        );
    }
}
