//! Core IceScope domain library.
//!
//! This crate contains the non-UI logic used by the Tauri shell:
//! connection models, catalog discovery, Iceberg metadata scanning,
//! query execution, storage access, caching, and overview summaries.

/// Cache policies and query-result cache helpers.
pub mod cache;
/// Catalog discovery for local and remote Iceberg warehouses.
pub mod catalog;
/// SQLite persistence for connections, metadata, overview, and query caches.
pub mod db;
/// Query engine adapters and pruning helpers.
pub mod engine;
/// Iceberg metadata, manifest, and snapshot scanning helpers.
pub mod iceberg;
/// Shared serializable models used across Rust and Tauri IPC.
pub mod models;
/// Warehouse overview summary generation.
pub mod overview;
/// Query routing across supported engines.
pub mod query;
/// Storage adapters and S3 execution helpers.
pub mod storage;

pub use models::*;
