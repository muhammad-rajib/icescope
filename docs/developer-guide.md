# Developer Guide

## Repository Layout

- `src/` — React frontend.
- `src-tauri/` — Tauri commands, application state, and native shell.
- `crates/icescope-core/` — catalog, Iceberg, query, cache, and storage logic.
- `assets/` — icons, logos, and screenshots.
- `docs/` — project documentation.
- `examples/` — catalog setup examples.
- `scripts/` — fixture and release helpers.

## Coding Standards

- Keep changes focused and behavior-preserving unless the task requests behavior changes.
- Prefer typed APIs across the Tauri boundary.
- Keep cache keys explicit and deterministic.
- Keep user-facing errors friendly and actionable.
- Avoid broad refactors in bug-fix changes.

## State Management

Zustand stores manage:

- Active connection and global settings.
- SQL tabs and persisted SQL drafts.
- Toast notifications.

Query results stay memory-only.

## Backend Architecture

The backend is split into:

- Tauri command handlers in `src-tauri/src/commands`.
- Shared application state in `src-tauri/src/state.rs`.
- Domain modules in `crates/icescope-core/src`.

## Frontend Architecture

Routes are implemented under `src/features/`:

- Explorer
- SQL Lab
- Overview
- Connections
- Settings

Shared UI primitives live under `src/components/`.

## Testing

Run:

```bash
npm run check
npm test
cargo test --workspace
cargo check --workspace
```

Use MinIO integration tests for S3-specific work.
