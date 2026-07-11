# FAQ

## What is IceScope?

IceScope is a desktop application for browsing Apache Iceberg warehouses and running exploratory SQL.

## What is Apache Iceberg?

Apache Iceberg is an open table format for large analytic datasets. It tracks table schemas, snapshots, manifests, and data files.

## Does IceScope move or modify my data?

IceScope is designed as a read-oriented explorer. Current browsing and query workflows read metadata and Parquet files.

## Which catalogs are supported?

Local Hadoop-style layouts are supported first. REST Catalog, AWS Glue, Hive Metastore, and Nessie are planned.

## Can I query S3 data?

S3 storage support exists for metadata and object access. Query behavior depends on the selected engine and catalog path.

## Where are connections stored?

Connections are stored in the application data directory using SQLite.

## Where is query history stored?

SQL Lab history is stored locally per connection when enabled in Settings.

## Is IceScope production-ready?

IceScope is pre-`1.0.0`. It is suitable for experimentation and early feedback, but APIs and cache formats may change.
