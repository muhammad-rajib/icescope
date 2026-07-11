# Troubleshooting

## Rust

If Rust commands fail, update the toolchain:

```bash
rustup update
```

Then run:

```bash
cargo check --workspace
```

## Tauri

If Tauri fails to build, verify platform dependencies. Linux usually needs WebKitGTK and appindicator packages.

## Catalog Connection

If no namespaces or tables appear:

- Confirm the warehouse path is correct.
- Confirm the table has a `metadata/` directory.
- Confirm metadata JSON files exist.
- Refresh the Explorer panel.

## AWS

For S3:

- Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, or configure `~/.aws/credentials`.
- Confirm region and endpoint.
- Confirm path-style settings for MinIO-compatible services.
- IceScope does not use IMDS by default.

## Local Warehouse

For local warehouses, use an absolute path when possible. IceScope expects Iceberg table metadata under table directories.

## Build Errors

Run checks separately to isolate failures:

```bash
npm run check
npm test
cargo check --workspace
cargo test --workspace
```
