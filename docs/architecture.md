# Architecture

IceScope is a native desktop application with a React frontend, Tauri IPC boundary, and Rust domain library.

## High-Level Architecture

```text
React UI -> Tauri commands -> src-tauri shell -> icescope-core -> catalogs/storage/query engines
                                      |
                                      +-> SQLite app database and caches
```

The frontend owns presentation, routing, UI state, and optimistic interactions. The Rust backend owns persistence, catalog access, Iceberg metadata parsing, manifest scanning, caching, and query execution.

## Frontend

The frontend lives in `src/` and uses React, React Router, Zustand, CodeMirror, TanStack Virtual, Tailwind CSS, and CSS variables.

## Rust Backend

The Tauri shell lives in `src-tauri/` and exposes typed commands for connections, Explorer metadata, SQL execution, overview summaries, settings, logs, and cache actions.

Core domain logic lives in `crates/icescope-core/`.

## Data Loading Pipeline

1. Resolve the active connection.
2. Load catalog namespaces and tables.
3. Read Iceberg table metadata.
4. Resolve the current snapshot.
5. Read manifest lists and manifests.
6. Return current-snapshot Parquet files.
7. Register files with the selected query engine.

## Cache Layer

SQLite-backed caches store metadata, overview summaries, snapshot URLs, query results, and preview pages. TTLs and size caps keep the application responsive without relying on stale data forever.

## Catalog Abstraction

Catalog modules isolate warehouse discovery from query execution. Current implementations focus on local Hadoop-style layouts and S3 object storage. Planned implementations include REST Catalog, AWS Glue, Hive Metastore, and Nessie.

## Future Plugin Architecture

Future releases may expose plugin points for catalog providers, query engines, authentication providers, export formats, and custom metadata views.
