# Storage

Storage connectors read Iceberg metadata files, manifests, and Parquet data files.

## Local filesystem

Local storage is available and recommended for first-time use.

Use it when your warehouse path looks like:

```text
/Users/example/warehouse/demo
```

## S3 and MinIO

S3-compatible storage is experimental. IceScope includes foundations for:

- Environment variable credentials.
- AWS credentials file loading.
- Explicit endpoint and region fields.
- Path-style access for MinIO-style deployments.

Instance metadata service discovery is intentionally not used in preview builds.

## Planned storage backends

- Google Cloud Storage
- Azure Data Lake Storage

These integrations are documented as project direction, not stable functionality.
