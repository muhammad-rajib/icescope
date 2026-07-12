# Release Checklist

Use this checklist for every IceScope release.

## Version Bump

- [ ] Choose a Semantic Versioning version, for example `0.1.0`.
- [ ] Run `./scripts/release.sh <version>`.
- [ ] Confirm versions match in `package.json`, `Cargo.toml`, and `src-tauri/tauri.conf.json`.
- [ ] Confirm `CHANGELOG.md` has a dated release section.

## Tests

- [ ] Run `npm ci`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run check`.
- [ ] Run `npm test`.
- [ ] Run `cargo fmt --all -- --check`.
- [ ] Run `cargo clippy --workspace --all-targets -- -D warnings`.
- [ ] Run `cargo test --workspace`.

## Build

- [ ] Run `npm run build`.
- [ ] Run `cargo build --workspace`.
- [ ] Run `npm run tauri:build`.
- [ ] Verify generated installers open on the target OS.

## Tag

- [ ] Push the version tag created by `scripts/release.sh`.
- [ ] Confirm `.github/workflows/release.yml` starts for the tag.

## GitHub Release

- [ ] Confirm the release is created as draft and prerelease.
- [ ] Confirm macOS Apple Silicon artifact is attached.
- [ ] Confirm macOS Intel artifact is attached.
- [ ] Confirm Windows MSI/EXE artifacts are attached.
- [ ] Confirm Linux AppImage/DEB/RPM artifacts are attached.
- [ ] Confirm release notes include highlights, bug fixes, known issues, and checksums.

## Verification

- [ ] Download every artifact from the draft release.
- [ ] Install on a clean machine or VM.
- [ ] Launch IceScope.
- [ ] Add the sample data connection.
- [ ] Open Explorer and SQL Lab.

## Documentation

- [ ] Confirm `README.md` links are current.
- [ ] Confirm `docs/index.md` is published through GitHub Pages.
- [ ] Confirm `CHANGELOG.md` is accurate.

## Future Updater

- [ ] Do not enable the Tauri updater until signing keys, update endpoint, and migration policy are finalized.
