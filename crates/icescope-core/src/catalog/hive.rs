use crate::models::{ConnectionProfile, NamespaceInfo, TableInfo};
use anyhow::anyhow;

pub async fn list_namespaces(_profile: &ConnectionProfile) -> anyhow::Result<Vec<NamespaceInfo>> {
    Err(anyhow!(
        "Hive Metastore catalog browsing is configured but the Hive Thrift client is not enabled in this build"
    ))
}

pub async fn list_tables(
    _profile: &ConnectionProfile,
    _namespace: &str,
) -> anyhow::Result<Vec<TableInfo>> {
    Err(anyhow!(
        "Hive Metastore catalog browsing is configured but the Hive Thrift client is not enabled in this build"
    ))
}
