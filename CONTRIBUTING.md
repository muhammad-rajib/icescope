# Contributing to IceScope

Thanks for helping improve IceScope. This project is early, so focused issues, small pull requests, and reproducible examples are especially valuable.

## Development Setup

```bash
make install
make dev
```

Run checks before opening a pull request:

```bash
make test
make check
```

## Contribution Workflow

1. Open an issue for larger changes.
2. Keep pull requests focused and behavior-preserving unless the issue says otherwise.
3. Add or update tests when changing behavior.
4. Update docs when changing user-facing workflows.
5. Use clear commit messages.

## Coding Standards

- Keep frontend code typed and component boundaries small.
- Keep Rust modules explicit, documented, and tested where practical.
- Prefer root-cause fixes over UI-only patches.
- Avoid unrelated refactors in feature or bug-fix pull requests.
- Preserve existing application behavior unless the change explicitly requires behavior changes.

## Testing

Frontend:

```bash
npm run check
npm test
```

Rust:

```bash
cargo fmt --all -- --check
cargo test --workspace
cargo check --workspace
```

MinIO integration tests require a local or CI MinIO service and are ignored by default.

## Documentation

Documentation lives in `docs/`. Update relevant docs for new catalog support, settings, SQL Lab changes, Explorer changes, and release workflows.
