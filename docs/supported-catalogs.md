# Supported Catalogs

IceScope is designed around Apache Iceberg catalog abstractions. Support is incremental.

## Hadoop

Status: current local support.

IceScope can browse Hadoop-style warehouse layouts on a local filesystem where namespaces and tables map to directories and Iceberg metadata lives under each table's `metadata/` directory.

## REST Catalog

Status: planned.

REST Catalog support will allow IceScope to connect to catalog services that implement the Iceberg REST catalog specification.

## AWS Glue

Status: planned.

AWS Glue support will add native table discovery for Glue-backed Iceberg catalogs. S3 credential handling already avoids IMDS by default and supports environment variables and AWS credential files.

## Hive Metastore

Status: planned.

Hive Metastore support will allow browsing Iceberg tables registered in HMS-backed environments.

## Nessie

Status: planned.

Nessie support will add branch/tag-aware catalog exploration for Iceberg lakehouses that use Project Nessie.
