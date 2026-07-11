# IceScope

IceScope is a modern desktop explorer for Apache Iceberg warehouses. It helps engineers inspect catalogs, browse namespaces and tables, preview data, inspect metadata, and run SQL locally from a fast Tauri + React application.

IceScope is early-stage software. The first public release focuses on local Iceberg warehouses, S3-backed metadata loading, DataFusion query execution, and a polished desktop workflow for exploration.

## Features

- Desktop UI built with Tauri 2, React 19, TypeScript, Vite, and Tailwind CSS.
- Catalog Explorer with namespace tree, table browser, schema view, catalog metadata view, and paginated data grid.
- SQL Lab with multi-tab editor, query history, result grid, CSV export, and DataFusion query execution.
- Local filesystem warehouse support and S3 storage access through OpenDAL/object-store.
- Manifest-based Iceberg scans for current snapshots.
- SQLite-backed connection storage, metadata cache, overview cache, query history, and preview cache.
- Overview dashboard with warehouse KPIs and sortable table summaries.
- Dark desktop UI, app settings, toasts, query hints, and friendly error messages.

## Screenshots

Screenshots are stored in `assets/screenshots/`. Add release screenshots before publishing a GitHub release.

Suggested first-release screenshots:

- Explorer namespace tree and data grid.
- SQL Lab editor and result grid.
- Connections form for local and S3 warehouses.
- Overview KPI dashboard.

## Supported Platforms

IceScope targets native desktop builds for:

- macOS Intel and Apple Silicon
- Windows x64
- Linux x64

See `docs/installation.md` for platform-specific notes.

## Installation

Prebuilt installers will be published on the GitHub Releases page after the first public release.

Until then, build from source:

```bash
make install
make dev
```

## Quick Start

1. Open **Connections**.
2. Add a local connection pointing at an Iceberg warehouse path, or click **Add sample data**.
3. Open **Explorer** to browse namespaces and tables.
4. Select a table to preview rows, schema, and catalog metadata.
5. Open **SQL Lab** and run:

```sql
SELECT *
FROM analytics.events
LIMIT 10;
```

## Supported Iceberg Catalogs

Current support:

- Hadoop-style local warehouse layout
- S3-backed Iceberg metadata and data files

Planned support:

- REST Catalog
- AWS Glue
- Hive Metastore
- Nessie

See `docs/supported-catalogs.md`.

For the beginner-friendly connection wizard and enterprise connection options, see `docs/connections.md`.

## Build From Source

Prerequisites:

- Node.js 22+
- Rust stable
- Platform dependencies for Tauri 2

Commands:

```bash
make install
make dev
make test
make build
```

See `docs/build.md` for complete build instructions.

## Repository Layout

- `src/` — React frontend.
- `src-tauri/` — Tauri shell and IPC commands.
- `crates/icescope-core/` — Rust library for Iceberg metadata, catalogs, caching, and query engines.
- `assets/` — icons, logos, and screenshots.
- `docs/` — user, developer, and architecture documentation.
- `examples/` — catalog setup examples.
- `scripts/` — fixture and release helper scripts.

## Roadmap

The public roadmap is tracked in `docs/roadmap.md`.

Near-term priorities:

- Improve local and S3 catalog reliability.
- Expand SQL Lab ergonomics.
- Add REST Catalog and AWS Glue support.
- Harden release packaging and signed installers.

## Contributing

Contributions are welcome. Please read:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

## License

IceScope is licensed under the Apache License 2.0. See `LICENSE`.
