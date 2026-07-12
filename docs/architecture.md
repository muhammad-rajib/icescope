# Architecture

IceScope is a Tauri desktop app with a React frontend and Rust backend.

```text
React UI
  ↓ Tauri commands
src-tauri shell
  ↓
icescope-core
  ├─ catalog discovery
  ├─ storage access
  ├─ Iceberg metadata and manifests
  ├─ query engines
  └─ SQLite cache/state
```

## Frontend

The frontend is built with React, TypeScript, Vite, Tailwind CSS, Zustand, CodeMirror, and TanStack Virtual.

Main areas:

- Explorer
- SQL Lab
- Overview
- Connections
- Settings

## Rust backend

The Tauri layer exposes typed commands for connection management, catalog browsing, table preview, SQL execution, overview summaries, settings, logs, and cache operations.

## Data loading pipeline

1. Resolve the active connection.
2. Load namespaces and tables through the catalog layer.
3. Read Iceberg table metadata.
4. Resolve the current snapshot.
5. Read manifest lists and manifests.
6. Return current snapshot Parquet files.
7. Register files with the query engine.
8. Return paginated rows or query results to the UI.

## Cache layer

SQLite stores connections, metadata cache entries, overview cache data, query history, and query result cache entries.

Cache entries use TTLs and cache keys that include connection, table, query, pagination, filters, and sorting where relevant.

## Catalog abstraction

IceScope separates catalog, storage, and engine concepts so future integrations can be added without reshaping the UI.

## Future plugin architecture

Planned plugin boundaries include:

- Catalog providers.
- Storage providers.
- Query engines.
- Export targets.
- Metadata visualizations.
