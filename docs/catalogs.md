# Catalogs

Catalogs tell IceScope where namespaces, tables, and Iceberg metadata files live.

## Current support

| Catalog | Status | Description |
| --- | --- | --- |
| Hadoop / local warehouse | Available | Resolves namespaces and tables from local directory layout. |

## Planned support

| Catalog | Status | Description |
| --- | --- | --- |
| REST Catalog | Planned | Connect to Iceberg REST-compatible catalog services. |
| AWS Glue | Planned | Discover Iceberg tables registered in Glue Data Catalog. |
| Hive Metastore | Planned | Connect to existing HMS deployments. |
| JDBC | Planned | Catalog metadata backed by relational databases. |
| Nessie | Planned | Branch-aware and tag-aware Iceberg catalog browsing. |

## Catalog-relative paths

Iceberg metadata may reference data files using catalog-relative paths. IceScope resolves those paths against the configured warehouse when possible.

## Metadata discovery

For local warehouses, IceScope searches table metadata directories, reads current table metadata, follows the current snapshot, and uses manifest files to discover active Parquet data files.
