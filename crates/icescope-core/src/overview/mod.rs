//! Overview summary generation for Iceberg warehouses.

use crate::catalog;
use crate::iceberg::scan;
use crate::models::{
    CatalogType, ConnectionProfile, OverviewSummary, OverviewTableRow, StorageType,
};
use anyhow::anyhow;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn get_overview(profile: &ConnectionProfile) -> anyhow::Result<OverviewSummary> {
    match profile.storage_type {
        StorageType::Local if matches!(profile.catalog_type, CatalogType::Hadoop) => {
            local_overview(&resolve_warehouse_path(&profile.warehouse_path)?)
        }
        StorageType::S3 => Err(anyhow!("S3 overview is not implemented yet")),
        StorageType::Gcs => Err(anyhow!("GCS overview is not implemented yet")),
        StorageType::Azure => Err(anyhow!("Azure overview is not implemented yet")),
        StorageType::Local => Err(anyhow!(
            "Overview is not implemented for this catalog type yet"
        )),
    }
}

pub fn refresh_overview(profile: &ConnectionProfile) -> anyhow::Result<OverviewSummary> {
    get_overview(profile)
}

fn local_overview(warehouse: &Path) -> anyhow::Result<OverviewSummary> {
    let mut rows = Vec::new();

    for namespace in catalog::local::list_namespaces(warehouse)? {
        for table in catalog::local::list_tables(warehouse, &namespace.name)? {
            rows.push(table_overview_row(
                warehouse,
                &table.namespace,
                &table.name,
            )?);
        }
    }

    rows.sort_by(|left, right| {
        left.namespace
            .cmp(&right.namespace)
            .then(left.table.cmp(&right.table))
    });

    let table_count = rows.len();
    let record_count = rows.iter().map(|row| row.record_count).sum();
    let total_size_bytes = rows.iter().map(|row| row.total_size_bytes).sum();
    let changed_today = rows
        .iter()
        .filter(|row| row.last_updated_ms.is_some_and(is_today))
        .count();

    Ok(OverviewSummary {
        table_count,
        record_count,
        total_size_bytes,
        changed_today,
        tables: rows,
    })
}

fn table_overview_row(
    warehouse: &Path,
    namespace: &str,
    table: &str,
) -> anyhow::Result<OverviewTableRow> {
    let scan = scan::current_snapshot_data_files(warehouse, namespace, table)?;
    let record_count = scan.files.iter().map(|file| file.record_count).sum();
    let mut total_size_bytes = 0;
    let mut last_updated_ms = None;

    for file in &scan.files {
        let path = PathBuf::from(&file.file_path);
        if let Ok(metadata) = std::fs::metadata(path) {
            total_size_bytes += metadata.len();
            if let Ok(modified) = metadata.modified() {
                let modified_ms = system_time_ms(modified);
                last_updated_ms = Some(
                    last_updated_ms.map_or(modified_ms, |current: i64| current.max(modified_ms)),
                );
            }
        }
    }

    Ok(OverviewTableRow {
        namespace: namespace.to_string(),
        table: table.to_string(),
        record_count,
        file_count: scan.files.len(),
        total_size_bytes,
        last_updated_ms,
    })
}

fn resolve_warehouse_path(warehouse_path: &str) -> anyhow::Result<PathBuf> {
    let path = PathBuf::from(warehouse_path);
    if path.is_absolute() {
        return Ok(path);
    }

    Ok(std::env::current_dir()?.join(path))
}

fn system_time_ms(time: SystemTime) -> i64 {
    time.duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

fn is_today(timestamp_ms: i64) -> bool {
    const DAY_MS: i64 = 24 * 60 * 60 * 1000;
    let now_ms = system_time_ms(SystemTime::now());
    timestamp_ms / DAY_MS == now_ms / DAY_MS
}
