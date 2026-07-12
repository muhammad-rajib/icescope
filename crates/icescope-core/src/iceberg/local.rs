use crate::models::{ColumnInfo, PartitionField, SnapshotInfo, TableMetadata};
use crate::storage::s3::{config_from_warehouse, object_store};
use anyhow::{anyhow, Context};
use futures::TryStreamExt;
use object_store::{path::Path as ObjectPath, ObjectStore};
use serde::Deserialize;
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct IcebergMetadataJson {
    current_schema_id: Option<i32>,
    schemas: Vec<IcebergSchemaJson>,
    snapshots: Option<Vec<IcebergSnapshotJson>>,
    properties: Option<BTreeMap<String, String>>,
    partition_specs: Option<Vec<IcebergPartitionSpecJson>>,
    default_spec_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct IcebergSchemaJson {
    schema_id: Option<i32>,
    fields: Vec<IcebergFieldJson>,
}

#[derive(Debug, Deserialize)]
struct IcebergFieldJson {
    name: String,
    #[serde(default)]
    required: bool,
    #[serde(rename = "type")]
    data_type: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct IcebergSnapshotJson {
    snapshot_id: i64,
    timestamp_ms: i64,
    summary: Option<BTreeMap<String, String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct IcebergPartitionSpecJson {
    spec_id: Option<i32>,
    fields: Vec<IcebergPartitionFieldJson>,
}

#[derive(Debug, Deserialize)]
struct IcebergPartitionFieldJson {
    name: Option<String>,
    transform: String,
}

pub fn load_table_metadata(
    warehouse: &Path,
    namespace: &str,
    table: &str,
) -> anyhow::Result<TableMetadata> {
    let metadata_path = latest_metadata_path(warehouse, namespace, table)?;
    let contents = std::fs::read_to_string(&metadata_path)
        .with_context(|| format!("failed to read table metadata {}", metadata_path.display()))?;
    let metadata: IcebergMetadataJson = serde_json::from_str(&contents)
        .with_context(|| format!("failed to parse table metadata {}", metadata_path.display()))?;

    build_table_metadata(namespace, table, metadata)
}

pub async fn load_table_metadata_s3(
    warehouse_uri: &str,
    settings: Option<&crate::models::S3Settings>,
    namespace: &str,
    table: &str,
) -> anyhow::Result<TableMetadata> {
    let config = config_from_warehouse(warehouse_uri, settings)?;
    let store = object_store(&config)?;
    let metadata_key =
        latest_metadata_key_s3(store.as_ref(), &config.root, namespace, table).await?;
    let bytes = store
        .get(&ObjectPath::from(metadata_key.as_str()))
        .await
        .with_context(|| {
            format!(
                "failed to read table metadata s3://{}/{}",
                config.bucket, metadata_key
            )
        })?
        .bytes()
        .await?;
    let metadata: IcebergMetadataJson = serde_json::from_slice(&bytes).with_context(|| {
        format!(
            "failed to parse table metadata s3://{}/{}",
            config.bucket, metadata_key
        )
    })?;

    build_table_metadata(namespace, table, metadata)
}

fn build_table_metadata(
    namespace: &str,
    table: &str,
    metadata: IcebergMetadataJson,
) -> anyhow::Result<TableMetadata> {
    let schema = metadata
        .schemas
        .iter()
        .find(|schema| schema.schema_id == metadata.current_schema_id)
        .or_else(|| metadata.schemas.first())
        .map(|schema| {
            schema
                .fields
                .iter()
                .map(|field| ColumnInfo {
                    name: field.name.clone(),
                    data_type: format_iceberg_type(&field.data_type),
                    required: field.required,
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let snapshots = metadata
        .snapshots
        .unwrap_or_default()
        .into_iter()
        .map(|snapshot| SnapshotInfo {
            snapshot_id: snapshot.snapshot_id,
            timestamp_ms: snapshot.timestamp_ms,
            operation: snapshot
                .summary
                .and_then(|summary| summary.get("operation").cloned()),
        })
        .collect();

    let partitions = metadata
        .partition_specs
        .unwrap_or_default()
        .into_iter()
        .find(|spec| spec.spec_id == metadata.default_spec_id)
        .map(|spec| spec.fields)
        .unwrap_or_default()
        .into_iter()
        .map(|field| PartitionField {
            name: field.name.unwrap_or_else(|| "partition".to_string()),
            transform: field.transform,
        })
        .collect();

    Ok(TableMetadata {
        namespace: namespace.to_string(),
        table: table.to_string(),
        schema,
        snapshots,
        properties: metadata.properties.unwrap_or_default(),
        partitions,
    })
}

async fn latest_metadata_key_s3(
    store: &dyn ObjectStore,
    root: &str,
    namespace: &str,
    table: &str,
) -> anyhow::Result<String> {
    let metadata_dir = join_s3_key(root, &format!("{namespace}/{table}/metadata"));
    let version_hint = join_s3_key(&metadata_dir, "version-hint.text");

    if let Ok(bytes) = store.get(&ObjectPath::from(version_hint.as_str())).await {
        if let Ok(bytes) = bytes.bytes().await {
            if let Ok(version_hint) = std::str::from_utf8(&bytes) {
                if let Ok(version) = version_hint.trim().parse::<u32>() {
                    let key = join_s3_key(&metadata_dir, &format!("v{version}.metadata.json"));
                    if store.head(&ObjectPath::from(key.as_str())).await.is_ok() {
                        return Ok(key);
                    }
                }
            }
        }
    }

    let prefix = ObjectPath::from(metadata_dir.as_str());
    let mut stream = store.list(Some(&prefix));
    let mut latest: Option<(u32, String)> = None;

    while let Some(meta) = stream.try_next().await? {
        let key = meta.location.to_string();
        let Some(version) = metadata_version_from_key(&key) else {
            continue;
        };
        if latest
            .as_ref()
            .is_none_or(|(current, _)| version > *current)
        {
            latest = Some((version, key));
        }
    }

    latest
        .map(|(_, key)| key)
        .ok_or_else(|| anyhow!("No vN.metadata.json found in S3 metadata directory {metadata_dir}"))
}

fn join_s3_key(left: &str, right: &str) -> String {
    match (left.trim_matches('/'), right.trim_matches('/')) {
        ("", right) => right.to_string(),
        (left, "") => left.to_string(),
        (left, right) => format!("{left}/{right}"),
    }
}

fn metadata_version_from_key(key: &str) -> Option<u32> {
    key.rsplit('/')
        .next()
        .and_then(|name| name.strip_prefix('v'))
        .and_then(|name| name.strip_suffix(".metadata.json"))
        .and_then(|version| version.parse().ok())
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

fn format_iceberg_type(value: &Value) -> String {
    match value {
        Value::String(value) => value.clone(),
        Value::Object(object) => object
            .get("type")
            .and_then(Value::as_str)
            .map(ToString::to_string)
            .unwrap_or_else(|| value.to_string()),
        _ => value.to_string(),
    }
}
