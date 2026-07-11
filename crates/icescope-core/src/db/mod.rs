//! SQLite database wrapper for IceScope application state and caches.

pub mod migrations;

use crate::cache::{CacheKind, CachePolicy};
use crate::models::{ConnectionProfile, OverviewSummary, QueryPage, SnapshotScanResult};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{de::DeserializeOwned, Serialize};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct AppDb {
    connection: Connection,
}

impl AppDb {
    pub fn open(path: &Path) -> anyhow::Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let connection = Connection::open(path)?;
        connection.execute_batch(migrations::INITIAL_SCHEMA)?;
        run_compat_migrations(&connection)?;
        create_indexes(&connection)?;

        Ok(Self { connection })
    }

    pub fn in_memory() -> anyhow::Result<Self> {
        let connection = Connection::open_in_memory()?;
        connection.execute_batch(migrations::INITIAL_SCHEMA)?;
        run_compat_migrations(&connection)?;
        create_indexes(&connection)?;
        Ok(Self { connection })
    }

    pub fn list_connections(&self) -> anyhow::Result<Vec<ConnectionProfile>> {
        let mut statement = self
            .connection
            .prepare("SELECT profile_json FROM connections ORDER BY name COLLATE NOCASE")?;

        let profiles = statement
            .query_map([], |row| {
                let profile_json: String = row.get(0)?;
                serde_json::from_str::<ConnectionProfile>(&profile_json).map_err(|error| {
                    rusqlite::Error::FromSqlConversionFailure(
                        0,
                        rusqlite::types::Type::Text,
                        Box::new(error),
                    )
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(profiles)
    }

    pub fn get_connection(&self, id: &str) -> anyhow::Result<Option<ConnectionProfile>> {
        self.connection
            .query_row(
                "SELECT profile_json FROM connections WHERE id = ?1",
                params![id],
                |row| {
                    let profile_json: String = row.get(0)?;
                    serde_json::from_str::<ConnectionProfile>(&profile_json).map_err(|error| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(error),
                        )
                    })
                },
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn save_connection(&self, profile: &ConnectionProfile) -> anyhow::Result<()> {
        let profile_json = serde_json::to_string(profile)?;

        self.connection.execute(
            r#"
            INSERT INTO connections (id, name, profile_json, updated_at)
            VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              profile_json = excluded.profile_json,
              updated_at = CURRENT_TIMESTAMP
            "#,
            params![profile.id, profile.name, profile_json],
        )?;

        self.invalidate_connection(&profile.id)?;
        Ok(())
    }

    pub fn delete_connection(&self, connection_id: &str) -> anyhow::Result<()> {
        self.connection.execute(
            "DELETE FROM connections WHERE id = ?1",
            params![connection_id],
        )?;
        self.invalidate_connection(connection_id)?;
        Ok(())
    }

    pub fn invalidate_connection(&self, connection_id: &str) -> anyhow::Result<()> {
        self.connection.execute(
            "DELETE FROM metadata_cache WHERE connection_id = ?1",
            params![connection_id],
        )?;
        self.connection.execute(
            "DELETE FROM query_result_cache WHERE connection_id = ?1",
            params![connection_id],
        )?;
        self.connection.execute(
            "DELETE FROM overview_cache WHERE connection_id = ?1",
            params![connection_id],
        )?;
        self.connection.execute(
            "DELETE FROM query_history WHERE connection_id = ?1",
            params![connection_id],
        )?;
        Ok(())
    }

    pub fn clear_caches(&self) -> anyhow::Result<()> {
        self.connection.execute("DELETE FROM metadata_cache", [])?;
        self.connection
            .execute("DELETE FROM query_result_cache", [])?;
        self.connection.execute("DELETE FROM overview_cache", [])?;
        Ok(())
    }

    pub fn get_metadata_cache<T: DeserializeOwned>(
        &self,
        connection_id: &str,
        kind: CacheKind,
        key: &str,
    ) -> anyhow::Result<Option<T>> {
        self.prune_expired()?;
        let cache_key = metadata_cache_key(connection_id, kind, key);

        let value_json = self
            .connection
            .query_row(
                r#"
                SELECT value_json
                FROM metadata_cache
                WHERE key = ?1 AND connection_id = ?2 AND cache_type = ?3 AND expires_at > ?4
                "#,
                params![cache_key, connection_id, kind.as_str(), now_epoch_seconds()],
                |row| row.get::<_, String>(0),
            )
            .optional()?;

        value_json
            .map(|value| serde_json::from_str(&value).map_err(Into::into))
            .transpose()
    }

    pub fn put_metadata_cache<T: Serialize>(
        &self,
        connection_id: &str,
        kind: CacheKind,
        key: &str,
        value: &T,
    ) -> anyhow::Result<()> {
        let policy = CachePolicy::for_kind(kind);
        let now = now_epoch_seconds();
        let expires_at = now + policy.ttl_seconds();
        let cache_key = metadata_cache_key(connection_id, kind, key);
        let value_json = serde_json::to_string(value)?;

        self.connection.execute(
            r#"
            INSERT INTO metadata_cache
              (key, connection_id, cache_type, value_json, expires_at, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
            ON CONFLICT(key) DO UPDATE SET
              value_json = excluded.value_json,
              expires_at = excluded.expires_at,
              updated_at = excluded.updated_at
            "#,
            params![
                cache_key,
                connection_id,
                kind.as_str(),
                value_json,
                expires_at,
                now
            ],
        )?;

        self.prune_metadata_cache(kind, policy.max_entries())?;
        Ok(())
    }

    pub fn get_snapshot_urls_cache(
        &self,
        connection_id: &str,
        table_key: &str,
    ) -> anyhow::Result<Option<Vec<String>>> {
        self.get_metadata_cache(connection_id, CacheKind::SnapshotUrls, table_key)
    }

    pub fn put_snapshot_urls_cache(
        &self,
        connection_id: &str,
        table_key: &str,
        snapshot_urls: &[String],
    ) -> anyhow::Result<()> {
        self.put_metadata_cache(
            connection_id,
            CacheKind::SnapshotUrls,
            table_key,
            &snapshot_urls,
        )
    }

    pub fn get_snapshot_scan_cache(
        &self,
        connection_id: &str,
        table_key: &str,
    ) -> anyhow::Result<Option<SnapshotScanResult>> {
        self.get_metadata_cache(
            connection_id,
            CacheKind::SnapshotUrls,
            &format!("scan:{table_key}"),
        )
    }

    pub fn put_snapshot_scan_cache(
        &self,
        connection_id: &str,
        table_key: &str,
        scan: &SnapshotScanResult,
    ) -> anyhow::Result<()> {
        self.put_metadata_cache(
            connection_id,
            CacheKind::SnapshotUrls,
            &format!("scan:{table_key}"),
            scan,
        )
    }

    pub fn get_overview_cache(
        &self,
        connection_id: &str,
    ) -> anyhow::Result<Option<OverviewSummary>> {
        self.get_metadata_cache(connection_id, CacheKind::Metadata, "overview")
    }

    pub fn put_overview_cache(
        &self,
        connection_id: &str,
        overview: &OverviewSummary,
    ) -> anyhow::Result<()> {
        self.put_metadata_cache(connection_id, CacheKind::Metadata, "overview", overview)
    }

    pub fn get_query_result_cache(
        &self,
        connection_id: &str,
        sql: &str,
        page_size: usize,
        offset: usize,
    ) -> anyhow::Result<Option<QueryPage>> {
        self.prune_expired()?;
        let sql_hash = stable_hash(sql);
        let key = query_cache_key(connection_id, &sql_hash, page_size, offset);

        let value_json = self
            .connection
            .query_row(
                r#"
                SELECT value_json
                FROM query_result_cache
                WHERE key = ?1 AND connection_id = ?2 AND expires_at > ?3
                "#,
                params![key, connection_id, now_epoch_seconds()],
                |row| row.get::<_, String>(0),
            )
            .optional()?;

        value_json
            .map(|value| serde_json::from_str(&value).map_err(Into::into))
            .transpose()
    }

    pub fn put_query_result_cache(
        &self,
        connection_id: &str,
        sql: &str,
        page_size: usize,
        offset: usize,
        page: &QueryPage,
    ) -> anyhow::Result<()> {
        let policy = CachePolicy::for_kind(CacheKind::QueryResults);
        let now = now_epoch_seconds();
        let expires_at = now + policy.ttl_seconds();
        let sql_hash = stable_hash(sql);
        let key = query_cache_key(connection_id, &sql_hash, page_size, offset);
        let value_json = serde_json::to_string(page)?;

        self.connection.execute(
            r#"
            INSERT INTO query_result_cache
              (key, connection_id, sql_hash, page_size, offset, value_json, expires_at, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
            ON CONFLICT(key) DO UPDATE SET
              value_json = excluded.value_json,
              expires_at = excluded.expires_at,
              updated_at = excluded.updated_at
            "#,
            params![
                key,
                connection_id,
                sql_hash,
                page_size as i64,
                offset as i64,
                value_json,
                expires_at,
                now
            ],
        )?;

        self.prune_query_result_cache(policy.max_entries())?;
        Ok(())
    }

    pub fn prune_expired(&self) -> anyhow::Result<()> {
        let now = now_epoch_seconds();
        self.connection.execute(
            "DELETE FROM metadata_cache WHERE expires_at <= ?1",
            params![now],
        )?;
        self.connection.execute(
            "DELETE FROM query_result_cache WHERE expires_at <= ?1",
            params![now],
        )?;
        Ok(())
    }

    pub fn prune_query_result_cache(&self, max_entries: usize) -> anyhow::Result<()> {
        self.connection.execute(
            r#"
            DELETE FROM query_result_cache
            WHERE key IN (
              SELECT key
              FROM query_result_cache
              ORDER BY updated_at DESC
              LIMIT -1 OFFSET ?1
            )
            "#,
            params![max_entries as i64],
        )?;
        Ok(())
    }

    fn prune_metadata_cache(&self, kind: CacheKind, max_entries: usize) -> anyhow::Result<()> {
        self.connection.execute(
            r#"
            DELETE FROM metadata_cache
            WHERE key IN (
              SELECT key
              FROM metadata_cache
              WHERE cache_type = ?1
              ORDER BY updated_at DESC
              LIMIT -1 OFFSET ?2
            )
            "#,
            params![kind.as_str(), max_entries as i64],
        )?;
        Ok(())
    }
}

pub fn open(path: &Path) -> anyhow::Result<AppDb> {
    AppDb::open(path)
}

fn run_compat_migrations(connection: &Connection) -> anyhow::Result<()> {
    let _ = connection.execute(
        "ALTER TABLE metadata_cache ADD COLUMN cache_type TEXT NOT NULL DEFAULT 'metadata'",
        [],
    );
    let _ = connection.execute(
        "ALTER TABLE metadata_cache ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0",
        [],
    );
    let _ = connection.execute(
        "ALTER TABLE metadata_cache ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0",
        [],
    );
    Ok(())
}

fn create_indexes(connection: &Connection) -> anyhow::Result<()> {
    connection.execute_batch(
        r#"
        CREATE INDEX IF NOT EXISTS idx_metadata_cache_connection_type
        ON metadata_cache(connection_id, cache_type);

        CREATE INDEX IF NOT EXISTS idx_metadata_cache_expires_at
        ON metadata_cache(expires_at);

        CREATE INDEX IF NOT EXISTS idx_query_result_cache_connection
        ON query_result_cache(connection_id);

        CREATE INDEX IF NOT EXISTS idx_query_result_cache_expires_at
        ON query_result_cache(expires_at);
        "#,
    )?;
    Ok(())
}

fn metadata_cache_key(connection_id: &str, kind: CacheKind, key: &str) -> String {
    format!("{}:{}:{}", connection_id, kind.as_str(), key)
}

fn query_cache_key(connection_id: &str, sql_hash: &str, page_size: usize, offset: usize) -> String {
    format!("{connection_id}:query:{sql_hash}:{page_size}:{offset}")
}

fn now_epoch_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default()
}

fn stable_hash(value: &str) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in value.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}
