use crate::state::AppState;
use icescope_core::{
    cache::query_result,
    engine::{datafusion::parse_table_refs, sql_error::friendly_sql_error},
    iceberg::scan,
    query,
    storage::s3_error::friendly_s3_error,
    QueryPage, SnapshotScanResult, StorageType,
};
use std::collections::BTreeMap;
use std::path::PathBuf;
use tauri::State;

#[tauri::command]
pub async fn run_query(
    state: State<'_, AppState>,
    connection_id: String,
    sql: String,
    page_size: usize,
    offset: usize,
) -> Result<QueryPage, String> {
    let profile = {
        let db = state.db.lock().map_err(|error| error.to_string())?;
        if let Some(page) = query_result::get(&db, &connection_id, &sql, page_size, offset)
            .map_err(|error| error.to_string())?
        {
            return Ok(page);
        }

        db.get_connection(&connection_id)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| format!("Connection not found: {connection_id}"))?
    };

    let snapshot_scans = if matches!(profile.storage_type, StorageType::Local) {
        preload_snapshot_scans(&state, &profile.warehouse_path, &connection_id, &sql)?
    } else {
        BTreeMap::new()
    };

    let page = query::execute_page(&profile, Some(&snapshot_scans), &sql, page_size, offset)
        .await
        .map_err(|error| friendly_query_error(&profile.storage_type, &error.to_string()))?;

    state
        .db
        .lock()
        .map_err(|error| error.to_string())?
        .put_query_result_cache(&connection_id, &sql, page_size, offset, &page)
        .map_err(|error| error.to_string())?;

    Ok(page)
}

fn friendly_query_error(storage_type: &StorageType, error: &str) -> String {
    let sql_error = friendly_sql_error(error);
    if matches!(storage_type, StorageType::S3) {
        return friendly_s3_error(&sql_error);
    }

    sql_error
}

fn preload_snapshot_scans(
    state: &State<'_, AppState>,
    warehouse_path: &str,
    connection_id: &str,
    sql: &str,
) -> Result<BTreeMap<String, SnapshotScanResult>, String> {
    let warehouse = resolve_warehouse_path(warehouse_path).map_err(|error| error.to_string())?;
    let table_refs = parse_table_refs(sql).map_err(|error| error.to_string())?;
    let db = state.db.lock().map_err(|error| error.to_string())?;
    let mut scans = BTreeMap::new();

    for table_ref in table_refs {
        let table_key = format!("{}.{}", table_ref.namespace, table_ref.table);
        if let Some(scan) = db
            .get_snapshot_scan_cache(connection_id, &table_key)
            .map_err(|error| error.to_string())?
        {
            scans.insert(table_key, scan);
            continue;
        }

        if db
            .get_snapshot_urls_cache(connection_id, &table_key)
            .map_err(|error| error.to_string())?
            .is_none()
        {
            let snapshot_urls = scan::current_snapshot_manifest_urls(
                &warehouse,
                &table_ref.namespace,
                &table_ref.table,
            )
            .map_err(|error| error.to_string())?;
            db.put_snapshot_urls_cache(connection_id, &table_key, &snapshot_urls)
                .map_err(|error| error.to_string())?;
        }

        let scan =
            scan::current_snapshot_data_files(&warehouse, &table_ref.namespace, &table_ref.table)
                .map_err(|error| error.to_string())?;
        db.put_snapshot_scan_cache(connection_id, &table_key, &scan)
            .map_err(|error| error.to_string())?;
        scans.insert(table_key, scan);
    }

    Ok(scans)
}

fn resolve_warehouse_path(warehouse_path: &str) -> anyhow::Result<PathBuf> {
    let path = PathBuf::from(warehouse_path);
    if path.is_absolute() {
        return Ok(path);
    }

    Ok(std::env::current_dir()?.join(path))
}
