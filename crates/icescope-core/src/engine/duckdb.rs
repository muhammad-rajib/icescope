use crate::models::{ConnectionProfile, QueryPage, StorageType};
use anyhow::anyhow;

pub async fn execute_page(
    profile: &ConnectionProfile,
    _sql: &str,
    _page_size: usize,
    _offset: usize,
) -> anyhow::Result<QueryPage> {
    if !matches!(profile.storage_type, StorageType::Local | StorageType::S3) {
        return Err(anyhow!("DuckDB supports local and S3 warehouse profiles"));
    }

    Err(anyhow!(
        "DuckDB query execution is routed but not enabled in this build yet. Switch this connection to DataFusion, or add the DuckDB runtime dependency."
    ))
}
