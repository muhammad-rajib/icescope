//! Query execution routing for supported query engines.

use crate::engine;
use crate::models::{ConnectionProfile, QueryEngine, QueryPage, SnapshotScanResult};
use std::collections::BTreeMap;

pub async fn execute_page(
    profile: &ConnectionProfile,
    snapshot_scans: Option<&BTreeMap<String, SnapshotScanResult>>,
    sql: &str,
    page_size: usize,
    offset: usize,
) -> anyhow::Result<QueryPage> {
    match &profile.query_engine {
        QueryEngine::Datafusion => {
            engine::datafusion::execute_page(profile, snapshot_scans, sql, page_size, offset).await
        }
        QueryEngine::Duckdb => engine::duckdb::execute_page(profile, sql, page_size, offset).await,
        QueryEngine::Athena => engine::athena::execute_page(profile, sql, page_size, offset).await,
    }
}
