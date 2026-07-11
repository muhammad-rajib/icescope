# Changelog

All notable changes to IceScope are documented in this file.

IceScope follows Semantic Versioning: `MAJOR.MINOR.PATCH`.

## [0.1.0] - Unreleased

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
- GitHub Actions CI and release workflow scaffolding.

### Notes

- This is the first public release preparation milestone.
- APIs, cache formats, and catalog support may change before `1.0.0`.
