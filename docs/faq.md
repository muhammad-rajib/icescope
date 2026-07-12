# FAQ

## What is IceScope?

IceScope is a desktop application for exploring Apache Iceberg catalogs, table metadata, snapshots, and data previews.

## Is IceScope a query engine?

No. IceScope routes query work to embedded or external engines. Preview builds focus on DataFusion for local queries.

## Does IceScope modify data?

Preview builds are designed for read-only exploration.

## Which catalogs are stable?

Local Hadoop-style warehouses are the current stable path. REST Catalog, AWS Glue, Hive, JDBC, and Nessie are planned.

## Does S3 work?

S3 and MinIO support is experimental. It is useful for early testing but not documented as stable yet.

## Where are settings stored?

Settings and application state are stored locally by the desktop app.

## Can I use IceScope with production warehouses?

Use caution during preview releases. Prefer read-only credentials and test in non-critical environments first.

## Is IceScope open source?

Yes. IceScope is released under the Apache-2.0 license.
