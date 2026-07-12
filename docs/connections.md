# Connections

IceScope models connections as three independent layers: query engine, Iceberg catalog, and storage.

## Layers

### Query Engine

The engine runs SQL and table preview queries.

| Engine | Status | Notes |
| --- | --- | --- |
| Automatic | Planned | Selects the safest available engine for a connection. |
| DataFusion | Available | Primary local query engine in preview builds. |
| DuckDB | Experimental | Routing is represented, full execution is not stable. |
| Spark | Planned | Future distributed execution option. |
| Trino | Planned | Future remote query option. |

### Iceberg Catalog

The catalog resolves namespaces, tables, snapshots, and metadata.

| Catalog | Status |
| --- | --- |
| Hadoop / local warehouse | Available |
| REST Catalog | Planned |
| AWS Glue | Planned |
| Hive Metastore | Planned |
| JDBC | Planned |
| Nessie | Planned |

### Storage

Storage reads metadata JSON, manifest files, and Parquet data files.

| Storage | Status |
| --- | --- |
| Local filesystem | Available |
| S3 | Experimental |
| MinIO | Experimental |
| GCS | Planned |
| Azure ADLS | Planned |

## Templates

### Local Warehouse

Use this for local development and demos. Provide a warehouse directory and select local storage.

### REST Catalog

Planned template for REST Catalog endpoints.

### AWS Glue + S3

Planned catalog integration with experimental S3 storage foundations.

### MinIO

Experimental S3-compatible storage path. Use explicit endpoint, region, bucket, and credentials.

### Nessie

Planned versioned catalog template.

### Advanced

Future template for custom catalog, storage, and engine combinations.
