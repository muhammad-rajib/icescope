# IceScope

[![CI](https://github.com/muhammad-rajib/icescope/actions/workflows/ci.yml/badge.svg)](https://github.com/muhammad-rajib/icescope/actions/workflows/ci.yml)
[![Release](https://github.com/muhammad-rajib/icescope/actions/workflows/release.yml/badge.svg)](https://github.com/muhammad-rajib/icescope/actions/workflows/release.yml)
[![Docs](https://github.com/muhammad-rajib/icescope/actions/workflows/docs.yml/badge.svg)](https://github.com/muhammad-rajib/icescope/actions/workflows/docs.yml)
[![Latest Release](https://img.shields.io/github/v/release/muhammad-rajib/icescope?include_prereleases)](https://github.com/muhammad-rajib/icescope/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/muhammad-rajib/icescope/total.svg)](https://github.com/muhammad-rajib/icescope/releases)

IceScope is a modern desktop explorer for Apache Iceberg warehouses. It helps engineers inspect catalogs, browse namespaces and tables, preview data, inspect metadata, and run SQL from a fast native Tauri application.

## Links

- [Documentation](https://muhammad-rajib.github.io/icescope/)
- [Download IceScope](https://github.com/muhammad-rajib/icescope/releases/latest)
- [GitHub Releases](https://github.com/muhammad-rajib/icescope/releases)
- [Report an Issue](https://github.com/muhammad-rajib/icescope/issues)
- [Contributing](CONTRIBUTING.md)

## Project

IceScope is built with:

- Tauri 2 desktop shell.
- React 19, TypeScript, Vite, and Tailwind CSS frontend.
- Rust workspace backend with `icescope-core`.
- SQLite-backed connection and cache storage.
- Apache-2.0 open-source license.

## Features

- Beginner-friendly connection wizard with progressive disclosure.
- Explorer namespace tree, table browser, schema view, metadata view, and paginated data grid.
- SQL Lab with multi-tab editor, query history, result grid, and CSV export.
- Local Hadoop-style Iceberg warehouse support.
- S3 object access foundations through OpenDAL/object-store.
- Manifest-based current snapshot scans.
- Overview dashboard with cached table summaries.
- Dark desktop UI, toasts, query hints, and friendly error states.

## Screenshots

Screenshots belong in `assets/screenshots/`. Add current screenshots before publishing a public release.

## Architecture

```text
React UI -> Tauri commands -> src-tauri shell -> icescope-core -> catalogs/storage/query engines
                                      |
                                      +-> SQLite app database and caches
```

See `docs/architecture.md` for details.

## Installation

Prebuilt installers are published on the GitHub Releases page.

- macOS Apple Silicon: DMG
- macOS Intel: DMG
- Windows x64: MSI and EXE
- Linux x64: AppImage, DEB, and RPM

## Downloads

- [Latest release](https://github.com/muhammad-rajib/icescope/releases/latest)
- [All releases](https://github.com/muhammad-rajib/icescope/releases)
- [Documentation website](https://muhammad-rajib.github.io/icescope/)

## Building

Prerequisites:

- Node.js 22+
- Rust stable
- Tauri 2 platform dependencies

```bash
npm ci
npm run build
cargo build --workspace
npm run tauri:build
```

See `docs/build.md`.

## Development

```bash
make install
make dev
make test
make build
```

Useful checks:

```bash
npm run lint
npm run check
npm test
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

## GitHub Actions

- `ci.yml` runs frontend and Rust checks on every push and pull request.
- `release.yml` builds native installers and creates draft prerelease GitHub Releases for `v*` tags.
- `docs.yml` publishes the VitePress documentation website from `docs/`.

## Roadmap

See `ROADMAP.md` and `docs/roadmap.md`.

## Contributing

Please read:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

## License

IceScope is licensed under the Apache License 2.0. See `LICENSE`.
