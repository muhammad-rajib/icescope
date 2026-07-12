# Connections

IceScope models connections as three independent layers: query engine, Iceberg catalog, and storage.

## Layers

### Query Engine

The engine runs SQL and table preview queries.

| Engine | Status | Notes |
| --- | --- | --- |
| Automatic | Available | Selects the safest available engine for a connection. |
| DataFusion | Available | Primary local query engine in preview builds. |
| DuckDB | Experimental | Routing is represented, full execution is not stable. |

### Iceberg Catalog

The catalog resolves namespaces, tables, snapshots, and metadata.

| Catalog | Status |
| --- | --- |
| Hadoop / local warehouse | Available |
| Hadoop / S3 warehouse | Experimental |
| REST Catalog | Preview |
| AWS Glue | Configured |
| Hive Metastore | Configured |
| Nessie | Preview |

### Storage

Storage reads metadata JSON, manifest files, and Parquet data files.

| Storage | Status |
| --- | --- |
| Local filesystem | Available |
| S3 | Experimental |
| MinIO | Experimental |
| GCS | Configured |
| Azure ADLS | Configured |

## Templates

### Local Warehouse

Use this for local development and demos. Provide a warehouse directory and select local storage.

### REST Catalog

Preview template for Iceberg REST Catalog endpoints.

### AWS Glue + S3

Configured catalog integration with experimental S3 storage foundations. Native Glue API discovery is not enabled in this build.

### MinIO

Experimental S3-compatible storage path. Use explicit endpoint, region, bucket, and credentials.

### Nessie

Preview versioned catalog template through Nessie Iceberg REST routing.

### Advanced

Template for custom catalog, storage, and engine combinations.
