# Build

## Development Setup

```bash
make install
make dev
```

## Rust

IceScope uses a Cargo workspace:

- `src-tauri` for the Tauri binary.
- `crates/icescope-core` for domain logic.

Useful commands:

```bash
cargo fmt --all -- --check
cargo test --workspace
cargo check --workspace
```

## Node

Frontend dependencies are managed with npm:

```bash
npm install
npm run check
npm test
```

## Tauri

Development:

```bash
npm run tauri:dev
```

Production build:

```bash
npm run tauri:build
```

## Build Commands

```bash
make install
make test
make check
make build
```

## Release Commands

See `RELEASE.md` for tagging and GitHub release automation.
