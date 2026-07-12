//! Catalog abstraction for listing namespaces and tables.

pub mod glue;
pub mod hive;
pub mod local;
pub mod nessie;
pub mod rest;
pub mod s3;

use crate::models::{CatalogType, ConnectionProfile, NamespaceInfo, StorageType, TableInfo};
use crate::storage::s3_exec;
use std::path::Path;

pub fn list_namespaces(profile: &ConnectionProfile) -> anyhow::Result<Vec<NamespaceInfo>> {
    match &profile.catalog_type {
        CatalogType::Hadoop => match &profile.storage_type {
            StorageType::Local => local::list_namespaces(Path::new(&profile.warehouse_path)),
            StorageType::S3 => s3_exec::block_on(s3::list_namespaces(profile)),
            StorageType::Gcs => {
                anyhow::bail!("GCS Hadoop catalog storage is not enabled in this build")
            }
            StorageType::Azure => {
                anyhow::bail!("Azure Hadoop catalog storage is not enabled in this build")
            }
        },
        CatalogType::Rest => s3_exec::block_on(rest::list_namespaces(profile)),
        CatalogType::Glue => s3_exec::block_on(glue::list_namespaces(profile)),
        CatalogType::Hive => s3_exec::block_on(hive::list_namespaces(profile)),
        CatalogType::Nessie => s3_exec::block_on(nessie::list_namespaces(profile)),
    }
}

pub fn list_tables(profile: &ConnectionProfile, namespace: &str) -> anyhow::Result<Vec<TableInfo>> {
    match &profile.catalog_type {
        CatalogType::Hadoop => match &profile.storage_type {
            StorageType::Local => local::list_tables(Path::new(&profile.warehouse_path), namespace),
            StorageType::S3 => s3_exec::block_on(s3::list_tables(profile, namespace)),
            StorageType::Gcs => {
                anyhow::bail!("GCS Hadoop catalog storage is not enabled in this build")
            }
            StorageType::Azure => {
                anyhow::bail!("Azure Hadoop catalog storage is not enabled in this build")
            }
        },
        CatalogType::Rest => s3_exec::block_on(rest::list_tables(profile, namespace)),
        CatalogType::Glue => s3_exec::block_on(glue::list_tables(profile, namespace)),
        CatalogType::Hive => s3_exec::block_on(hive::list_tables(profile, namespace)),
        CatalogType::Nessie => s3_exec::block_on(nessie::list_tables(profile, namespace)),
    }
}
