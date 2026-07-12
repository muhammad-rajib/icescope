# Troubleshooting

## Rust build errors

Update Rust and retry:

```bash
rustup update
cargo build --workspace
```

## Tauri dependencies on Linux

Install WebKitGTK and app indicator packages required by Tauri 2. Package names vary by distribution.

## Catalog connection fails

Check:

- Warehouse path exists.
- Iceberg metadata directories exist.
- Table metadata JSON is present.
- The selected connection type matches the warehouse.

## Local warehouse shows no tables

Confirm the directory points to the warehouse root expected by your layout, not a nested data directory.

## AWS or S3 errors

S3 support is experimental. Verify:

- Endpoint.
- Region.
- Bucket or warehouse path.
- Path-style option for MinIO.
- Environment variables or `~/.aws/credentials`.

## SQL query fails

Try a fully qualified table name and a small `LIMIT`.

```sql
SELECT *
FROM learning.demo.customers
LIMIT 50;
```

## Documentation build fails

Install dependencies first:

```bash
npm ci
npm run docs:build
```
