# Changelog

All notable changes to IceScope are documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## [Unreleased]

### Added

- Production release automation for GitHub Actions.
- GitHub Pages documentation publishing.
- Release helper script for synchronized version bumps.

## [0.1.0-preview] - Unreleased

### Added

- Initial Tauri 2 desktop application shell.
- React 19, TypeScript, Vite, and Tailwind frontend.
- Rust `icescope-core` workspace crate.
- SQLite connection and cache storage.
- Local Iceberg warehouse browsing.
- S3 storage support through OpenDAL/object-store.
- Manifest-based Iceberg current snapshot scanning.
- Explorer namespace tree, table browser, data grid, schema view, and catalog view.
- SQL Lab with multi-tab editor, DataFusion execution, query history, and result grid.
- Overview dashboard with KPI cards and table summaries.
- Settings page for theme, editor, cache, performance, logging, and app information.
- GitHub Actions CI, release, and documentation publishing workflows.

### Known Issues

- REST Catalog, Glue, Hive Metastore, Nessie, GCS, and Azure workflows are documented/planned but not fully implemented.
- Tauri updater support is reserved for a future release.
