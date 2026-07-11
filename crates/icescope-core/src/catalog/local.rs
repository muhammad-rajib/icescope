use crate::models::{NamespaceInfo, TableInfo};
use std::path::Path;

pub fn list_namespaces(warehouse: &Path) -> anyhow::Result<Vec<NamespaceInfo>> {
    let mut namespaces = Vec::new();
    let mut has_default_tables = false;

    if !warehouse.exists() {
        return Ok(namespaces);
    }

    for entry in std::fs::read_dir(warehouse)? {
        let path = entry?.path();
        if !path.is_dir() {
            continue;
        }

        if is_table_dir(&path) {
            has_default_tables = true;
            continue;
        }

        if has_table_children(&path)? {
            if let Some(name) = path.file_name().and_then(|name| name.to_str()) {
                namespaces.push(NamespaceInfo {
                    name: name.to_string(),
                });
            }
        }
    }

    if has_default_tables {
        namespaces.push(NamespaceInfo {
            name: root_namespace(warehouse),
        });
    }

    namespaces.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(namespaces)
}

pub fn list_tables(warehouse: &Path, namespace: &str) -> anyhow::Result<Vec<TableInfo>> {
    let root_namespace = root_namespace(warehouse);
    let namespace_path = if namespace == root_namespace || namespace == "default" {
        warehouse.to_path_buf()
    } else {
        warehouse.join(namespace)
    };
    let mut tables = Vec::new();

    if !namespace_path.exists() {
        return Ok(tables);
    }

    for entry in std::fs::read_dir(namespace_path)? {
        let path = entry?.path();
        if !path.is_dir() || !is_table_dir(&path) {
            continue;
        }

        if let Some(name) = path.file_name().and_then(|name| name.to_str()) {
            tables.push(TableInfo {
                namespace: namespace.to_string(),
                name: name.to_string(),
            });
        }
    }

    tables.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(tables)
}

fn has_table_children(path: &Path) -> anyhow::Result<bool> {
    for entry in std::fs::read_dir(path)? {
        if is_table_dir(&entry?.path()) {
            return Ok(true);
        }
    }

    Ok(false)
}

fn is_table_dir(path: &Path) -> bool {
    path.join("metadata").is_dir()
}

fn root_namespace(warehouse: &Path) -> String {
    warehouse
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or("default")
        .to_string()
}
