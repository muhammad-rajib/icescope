# Contributing

IceScope welcomes issues, documentation fixes, test cases, and focused pull requests.

## Start here

1. Read the project README.
2. Check existing issues.
3. Open a discussion or issue for larger changes.
4. Keep pull requests focused.

## Development setup

```bash
npm ci
npm run tauri:dev
```

Run checks before opening a pull request:

```bash
npm run lint
npm run check
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

## Documentation

Run the docs site locally:

```bash
npm run docs:dev
```

Build it before submitting docs changes:

```bash
npm run docs:build
```

## Standards

- Keep behavior changes separate from documentation or release cleanup.
- Clearly label planned and experimental features.
- Prefer typed Tauri APIs.
- Add tests for new backend behavior when practical.
- Follow the Apache-2.0 license.
