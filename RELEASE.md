# Release Guide

This guide describes the first public release workflow for IceScope.

## Versioning

IceScope follows Semantic Versioning:

- `MAJOR` for incompatible changes.
- `MINOR` for new functionality.
- `PATCH` for bug fixes.

The current first public release target is `0.1.0`.

Keep these files in sync:

- `package.json`
- `Cargo.toml`
- `src-tauri/tauri.conf.json`
- `CHANGELOG.md`

## Pre-Release Checklist

- [ ] Update `CHANGELOG.md`.
- [ ] Confirm `README.md` screenshots and links.
- [ ] Run `make test`.
- [ ] Run `make check`.
- [ ] Run `make build`.
- [ ] Verify generated installers on each supported platform.
- [ ] Tag the release as `vX.Y.Z`.

## Release Commands

```bash
npm install
npm run check
npm test
cargo fmt --all -- --check
cargo test --workspace
cargo check --workspace
npm run tauri:build
```

## GitHub Release

Pushing a `v*` tag triggers the release workflow:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow builds native installers for Windows, macOS, and Linux and uploads artifacts to GitHub Releases.
