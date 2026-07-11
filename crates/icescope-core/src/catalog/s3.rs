use crate::models::{ConnectionProfile, NamespaceInfo, TableInfo};
use crate::storage::s3::{config_from_warehouse, opendal_operator};
use std::collections::BTreeSet;

pub async fn list_namespaces(profile: &ConnectionProfile) -> anyhow::Result<Vec<NamespaceInfo>> {
    let config = config_from_warehouse(&profile.warehouse_path, profile.s3.as_ref())?;
    let op = opendal_operator(&config)?;
    let entries = op.list("").await?;
    let namespaces = entries
        .into_iter()
        .filter_map(|entry| first_path_segment(entry.path()))
        .collect::<BTreeSet<_>>()
        .into_iter()
        .map(|name| NamespaceInfo { name })
        .collect();

    Ok(namespaces)
}

pub async fn list_tables(
    profile: &ConnectionProfile,
    namespace: &str,
) -> anyhow::Result<Vec<TableInfo>> {
    let config = config_from_warehouse(&profile.warehouse_path, profile.s3.as_ref())?;
    let op = opendal_operator(&config)?;
    let prefix = format!("{}/", namespace.trim_matches('/'));
    let entries = op.list(&prefix).await?;
    let mut table_names = BTreeSet::new();

    for entry in entries {
        let Some(table_name) = child_path_segment(entry.path(), namespace) else {
            continue;
        };
        let metadata_path = format!("{namespace}/{table_name}/metadata/");
        if op.stat(&metadata_path).await.is_ok() {
            table_names.insert(table_name);
        }
    }

    Ok(table_names
        .into_iter()
        .map(|name| TableInfo {
            namespace: namespace.to_string(),
            name,
        })
        .collect())
}

fn first_path_segment(path: &str) -> Option<String> {
    path.trim_matches('/')
        .split('/')
        .next()
        .filter(|segment| !segment.is_empty())
        .map(ToString::to_string)
}

fn child_path_segment(path: &str, namespace: &str) -> Option<String> {
    let prefix = format!("{}/", namespace.trim_matches('/'));
    path.strip_prefix(&prefix)
        .and_then(|remaining| remaining.trim_matches('/').split('/').next())
        .filter(|segment| !segment.is_empty())
        .map(ToString::to_string)
}
