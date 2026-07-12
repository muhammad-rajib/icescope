# Catalogs

Catalogs tell IceScope where namespaces, tables, and Iceberg metadata files live.

## Current support

| Catalog | Status | Description |
| --- | --- | --- |
| Hadoop / local warehouse | Available | Resolves namespaces and tables from local directory layout. |
| Hadoop / S3 warehouse | Experimental | Resolves namespaces and tables from S3-compatible warehouse paths. |
| REST Catalog | Preview | Lists namespaces and tables from Iceberg REST-compatible `/v1` APIs. |
| Nessie | Preview | Routes branch-aware discovery through Nessie's Iceberg REST endpoint. |
| AWS Glue | Configured | First-class connection type; native Glue API discovery is not enabled in this build. |
| Hive Metastore | Configured | First-class connection type; native HMS Thrift discovery is not enabled in this build. |

## Catalog-relative paths

Iceberg metadata may reference data files using catalog-relative paths. IceScope resolves those paths against the configured warehouse when possible.

## Metadata discovery

For Hadoop-style warehouses, IceScope searches table metadata directories, reads current table metadata, follows the current snapshot, and uses manifest files to discover active Parquet data files.
