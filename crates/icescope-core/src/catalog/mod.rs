//! Catalog abstraction for listing namespaces and tables.

pub mod local;
pub mod s3;

use crate::models::{ConnectionProfile, NamespaceInfo, StorageType, TableInfo};
use crate::storage::s3_exec;
use std::path::Path;

pub fn list_namespaces(profile: &ConnectionProfile) -> anyhow::Result<Vec<NamespaceInfo>> {
    match &profile.storage_type {
        StorageType::Local => local::list_namespaces(Path::new(&profile.warehouse_path)),
        StorageType::S3 => s3_exec::block_on(s3::list_namespaces(profile)),
    }
}

pub fn list_tables(profile: &ConnectionProfile, namespace: &str) -> anyhow::Result<Vec<TableInfo>> {
    match &profile.storage_type {
        StorageType::Local => local::list_tables(Path::new(&profile.warehouse_path), namespace),
        StorageType::S3 => s3_exec::block_on(s3::list_tables(profile, namespace)),
    }
}
