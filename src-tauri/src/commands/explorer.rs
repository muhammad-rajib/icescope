use crate::state::AppState;
use icescope_core::{
    cache::CacheKind, catalog, iceberg, query, storage::s3_error::friendly_s3_error, NamespaceInfo,
    PartitionField, PreviewSource, SnapshotInfo, StorageType, TableInfo, TableMetadata,
    TablePreviewPage,
};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::time::Instant;
use tauri::State;

#[tauri::command]
pub fn list_namespaces(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<NamespaceInfo>, String> {
    let profile = {
        let db = state.db.lock().map_err(|error| error.to_string())?;
        db.get_connection(&connection_id)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| format!("Connection not found: {connection_id}"))?
    };

    if matches!(profile.storage_type, StorageType::S3) {
        let db = state.db.lock().map_err(|error| error.to_string())?;
        if let Some(namespaces) = db
            .get_metadata_cache::<Vec<NamespaceInfo>>(&connection_id, CacheKind::Namespaces, "all")
            .map_err(|error| error.to_string())?
        {
            if !namespaces.is_empty() {
                return Ok(namespaces);
            }
        }
    }

    let namespaces = catalog::list_namespaces(&profile)
        .map_err(|error| friendly_s3_error(&error.to_string()))?;
    if matches!(profile.storage_type, StorageType::S3) {
        state
            .db
            .lock()
            .map_err(|error| error.to_string())?
            .put_metadata_cache(&connection_id, CacheKind::Namespaces, "all", &namespaces)
            .map_err(|error| error.to_string())?;
    }
    Ok(namespaces)
}

#[tauri::command]
pub fn list_tables(
    state: State<'_, AppState>,
    connection_id: String,
    namespace: String,
) -> Result<Vec<TableInfo>, String> {
    let profile = {
        let db = state.db.lock().map_err(|error| error.to_string())?;
        db.get_connection(&connection_id)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| format!("Connection not found: {connection_id}"))?
    };

    if matches!(profile.storage_type, StorageType::S3) {
        let db = state.db.lock().map_err(|error| error.to_string())?;
        if let Some(tables) = db
            .get_metadata_cache::<Vec<TableInfo>>(&connection_id, CacheKind::Tables, &namespace)
            .map_err(|error| error.to_string())?
        {
            if !tables.is_empty() {
                return Ok(tables);
            }
        }
    }

    let tables = catalog::list_tables(&profile, &namespace)
        .map_err(|error| friendly_s3_error(&error.to_string()))?;
    if matches!(profile.storage_type, StorageType::S3) {
        state
            .db
            .lock()
            .map_err(|error| error.to_string())?
            .put_metadata_cache(&connection_id, CacheKind::Tables, &namespace, &tables)
            .map_err(|error| error.to_string())?;
    }
    Ok(tables)
}

#[tauri::command]
pub fn get_table_metadata(
    state: State<'_, AppState>,
    connection_id: String,
    namespace: String,
    table: String,
) -> Result<TableMetadata, String> {
    let cache_key = format!("{namespace}.{table}");
    if let Some(metadata) = state
        .db
        .lock()
        .map_err(|error| error.to_string())?
        .get_metadata_cache::<TableMetadata>(&connection_id, CacheKind::Metadata, &cache_key)
        .map_err(|error| error.to_string())?
    {
        if !is_empty_table_metadata(&metadata) {
            return Ok(metadata);
        }
    }

    let profile = {
        let db = state.db.lock().map_err(|error| error.to_string())?;
        db.get_connection(&connection_id)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| format!("Connection not found: {connection_id}"))?
    };

    let metadata = if matches!(profile.storage_type, StorageType::Local) {
        let warehouse =
            resolve_warehouse_path(&profile.warehouse_path).map_err(|error| error.to_string())?;
        iceberg::local::load_table_metadata(&warehouse, &namespace, &table)
            .map_err(|error| error.to_string())?
    } else {
        TableMetadata {
            namespace,
            table,
            schema: Vec::new(),
            snapshots: Vec::<SnapshotInfo>::new(),
            properties: BTreeMap::new(),
            partitions: Vec::<PartitionField>::new(),
        }
    };

    state
        .db
        .lock()
        .map_err(|error| error.to_string())?
        .put_metadata_cache(&connection_id, CacheKind::Metadata, &cache_key, &metadata)
        .map_err(|error| error.to_string())?;

    Ok(metadata)
}

fn resolve_warehouse_path(warehouse_path: &str) -> anyhow::Result<PathBuf> {
    let path = PathBuf::from(warehouse_path);
    if path.is_absolute() {
        return Ok(path);
    }

    Ok(std::env::current_dir()?.join(Path::new(warehouse_path)))
}

fn is_empty_table_metadata(metadata: &TableMetadata) -> bool {
    metadata.schema.is_empty()
        && metadata.snapshots.is_empty()
        && metadata.properties.is_empty()
        && metadata.partitions.is_empty()
}

#[tauri::command]
pub async fn get_table_preview(
    state: State<'_, AppState>,
    connection_id: String,
    namespace: String,
    table: String,
    page_size: usize,
    offset: usize,
    sort_column: Option<String>,
    sort_direction: Option<String>,
) -> Result<TablePreviewPage, String> {
    let profile = {
        let db = state.db.lock().map_err(|error| error.to_string())?;
        db.get_connection(&connection_id)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| format!("Connection not found: {connection_id}"))?
    };
    let started_at = Instant::now();
    let bounded_page_size = page_size.clamp(50, 1000);
    let table_ref = format!("{namespace}.{table}");
    let order_by = sort_clause(sort_column.as_deref(), sort_direction.as_deref())?;
    let sql = format!("SELECT * FROM {table_ref}{order_by}");
    let count_sql = format!("SELECT COUNT(*) AS total_count FROM {table_ref}");

    let page = query::execute_page(&profile, None, &sql, bounded_page_size, offset)
        .await
        .map_err(|error| friendly_preview_error(&profile.storage_type, &error.to_string()))?;
    let total_count = query::execute_page(&profile, None, &count_sql, 50, 0)
        .await
        .ok()
        .and_then(|page| {
            page.rows
                .first()
                .and_then(|row| row.get("total_count"))
                .and_then(json_value_to_u64)
        });

    Ok(TablePreviewPage {
        columns: page.columns,
        rows: page.rows,
        total_count,
        page_size: page.page_size,
        offset: page.offset,
        has_more: page.has_more,
        execution_time_ms: started_at.elapsed().as_millis(),
        source: PreviewSource::Warehouse,
        error: None,
    })
}

fn friendly_preview_error(storage_type: &StorageType, error: &str) -> String {
    if matches!(storage_type, StorageType::S3) {
        return friendly_s3_error(error);
    }

    error.to_string()
}

fn sort_clause(column: Option<&str>, direction: Option<&str>) -> Result<String, String> {
    let Some(column) = column.filter(|column| !column.trim().is_empty()) else {
        return Ok(String::new());
    };
    if !column
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || character == '_')
    {
        return Err("Sort column must be a simple column name.".to_string());
    }

    let direction = match direction.unwrap_or("asc").to_ascii_lowercase().as_str() {
        "desc" => "DESC",
        _ => "ASC",
    };

    Ok(format!(" ORDER BY {column} {direction}"))
}

fn json_value_to_u64(value: &serde_json::Value) -> Option<u64> {
    match value {
        serde_json::Value::Number(number) => number.as_u64(),
        serde_json::Value::String(value) => value.parse().ok(),
        _ => None,
    }
}
