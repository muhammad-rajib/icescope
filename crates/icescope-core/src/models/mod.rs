//! Shared application models serialized across Tauri commands.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionProfile {
    pub id: String,
    pub name: String,
    pub warehouse_path: String,
    pub storage_type: StorageType,
    #[serde(default)]
    pub catalog_type: CatalogType,
    pub query_engine: QueryEngine,
    pub s3: Option<S3Settings>,
    #[serde(default)]
    pub rest: Option<RestCatalogSettings>,
    #[serde(default)]
    pub glue: Option<GlueCatalogSettings>,
    #[serde(default)]
    pub hive: Option<HiveCatalogSettings>,
    #[serde(default)]
    pub nessie: Option<NessieCatalogSettings>,
    pub athena: Option<AthenaSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StorageType {
    Local,
    S3,
    Gcs,
    Azure,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum CatalogType {
    #[default]
    Hadoop,
    Rest,
    Glue,
    Hive,
    Nessie,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum QueryEngine {
    Datafusion,
    Duckdb,
    Athena,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct S3Settings {
    pub region: Option<String>,
    pub endpoint: Option<String>,
    pub path_style: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestCatalogSettings {
    pub url: String,
    pub warehouse: Option<String>,
    pub token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlueCatalogSettings {
    pub region: Option<String>,
    pub catalog_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HiveCatalogSettings {
    pub uri: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NessieCatalogSettings {
    pub url: String,
    pub branch: Option<String>,
    pub token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AthenaSettings {
    pub database: Option<String>,
    pub workgroup: Option<String>,
    pub output_location: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NamespaceInfo {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableInfo {
    pub namespace: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableMetadata {
    pub namespace: String,
    pub table: String,
    pub schema: Vec<ColumnInfo>,
    pub snapshots: Vec<SnapshotInfo>,
    pub properties: BTreeMap<String, String>,
    pub partitions: Vec<PartitionField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotInfo {
    pub snapshot_id: i64,
    pub timestamp_ms: i64,
    pub operation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartitionField {
    pub name: String,
    pub transform: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryPage {
    pub columns: Vec<String>,
    pub rows: Vec<BTreeMap<String, serde_json::Value>>,
    pub page_size: usize,
    pub offset: usize,
    pub has_more: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PreviewSource {
    Cached,
    Warehouse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TablePreviewPage {
    pub columns: Vec<String>,
    pub rows: Vec<BTreeMap<String, serde_json::Value>>,
    pub total_count: Option<u64>,
    pub page_size: usize,
    pub offset: usize,
    pub has_more: bool,
    pub execution_time_ms: u128,
    pub source: PreviewSource,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverviewSummary {
    pub table_count: usize,
    pub record_count: u64,
    pub total_size_bytes: u64,
    pub changed_today: usize,
    pub tables: Vec<OverviewTableRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverviewTableRow {
    pub namespace: String,
    pub table: String,
    pub record_count: u64,
    pub file_count: usize,
    pub total_size_bytes: u64,
    pub last_updated_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotScanResult {
    pub namespace: String,
    pub table: String,
    pub files: Vec<DataFileRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataFileRecord {
    pub file_path: String,
    pub record_count: u64,
    pub partition_values: BTreeMap<String, serde_json::Value>,
    pub lower_bounds: BTreeMap<String, serde_json::Value>,
    pub upper_bounds: BTreeMap<String, serde_json::Value>,
}
