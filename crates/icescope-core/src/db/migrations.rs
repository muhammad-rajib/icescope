pub const INITIAL_SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  profile_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metadata_cache (
  key TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  cache_type TEXT NOT NULL,
  value_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS overview_cache (
  connection_id TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS query_history (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  sql TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS query_result_cache (
  key TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  sql_hash TEXT NOT NULL,
  page_size INTEGER NOT NULL,
  offset INTEGER NOT NULL,
  value_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
"#;
