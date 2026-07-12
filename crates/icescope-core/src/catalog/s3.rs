use crate::models::{ConnectionProfile, NamespaceInfo, TableInfo};
use crate::storage::s3::{config_from_warehouse, object_store};
use object_store::path::Path;
use std::collections::BTreeSet;

pub async fn list_namespaces(profile: &ConnectionProfile) -> anyhow::Result<Vec<NamespaceInfo>> {
    let config = config_from_warehouse(&profile.warehouse_path, profile.s3.as_ref())?;
    let store = object_store(&config)?;
    let prefix = object_path(&config.root);
    let listing = store.list_with_delimiter(prefix.as_ref()).await?;
    let namespaces = listing
        .common_prefixes
        .into_iter()
        .filter_map(|path| first_path_segment(path.as_ref(), &config.root))
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
    let store = object_store(&config)?;
    let prefix = object_path(&join_key(&config.root, namespace));
    let listing = store.list_with_delimiter(prefix.as_ref()).await?;
    let mut table_names = BTreeSet::new();

    for table_prefix in listing.common_prefixes {
        let Some(table_name) = child_path_segment(table_prefix.as_ref(), &config.root, namespace)
        else {
            continue;
        };
        let metadata_prefix = object_path(&join_key(
            &config.root,
            &format!("{namespace}/{table_name}/metadata"),
        ));
        if store
            .list_with_delimiter(metadata_prefix.as_ref())
            .await
            .is_ok_and(|listing| !listing.objects.is_empty() || !listing.common_prefixes.is_empty())
        {
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

fn object_path(path: &str) -> Option<Path> {
    let trimmed = path.trim_matches('/');
    (!trimmed.is_empty()).then(|| Path::from(trimmed))
}

fn join_key(root: &str, child: &str) -> String {
    match (root.trim_matches('/'), child.trim_matches('/')) {
        ("", child) => child.to_string(),
        (root, "") => root.to_string(),
        (root, child) => format!("{root}/{child}"),
    }
}

fn first_path_segment(path: &str, root: &str) -> Option<String> {
    let path = strip_root(path, root);
    path.trim_matches('/')
        .split('/')
        .next()
        .filter(|segment| !segment.is_empty())
        .map(ToString::to_string)
}

fn child_path_segment(path: &str, root: &str, namespace: &str) -> Option<String> {
    let path = strip_root(path, root);
    let prefix = format!("{}/", namespace.trim_matches('/'));
    path.strip_prefix(&prefix)
        .and_then(|remaining| remaining.trim_matches('/').split('/').next())
        .filter(|segment| !segment.is_empty())
        .map(ToString::to_string)
}

fn strip_root<'a>(path: &'a str, root: &str) -> &'a str {
    let root = root.trim_matches('/');
    if root.is_empty() {
        return path;
    }

    path.trim_matches('/')
        .strip_prefix(root)
        .unwrap_or(path)
        .trim_start_matches('/')
}
