# Supported Catalogs

IceScope is designed around aligned Apache Iceberg catalog abstractions. A connection now stores catalog, storage, and query engine choices independently.

## Hadoop

Status: available.

IceScope can browse Hadoop-style warehouse layouts on a local filesystem or S3-compatible object storage where namespaces and tables map to paths and Iceberg metadata lives under each table's `metadata/` directory.

## REST Catalog

Status: preview.

IceScope can list namespaces and tables from Iceberg REST-compatible catalog services using the `/v1` API. Token authentication and warehouse/prefix routing are represented in connection profiles.

## AWS Glue

Status: configured.

AWS Glue is represented as a first-class catalog type and aligns with S3 storage and Athena routing. Native Glue API discovery requires enabling the AWS Glue client in a future build.

## Hive Metastore

Status: configured.

Hive Metastore is represented as a first-class catalog type with URI persistence. Native HMS Thrift discovery requires enabling the Hive client in a future build.

## Nessie

Status: preview.

Nessie is represented as a first-class catalog type and routes namespace/table discovery through Nessie's Iceberg REST endpoint with branch-aware prefix settings.

## Object storage

| Storage | Status | Notes |
| --- | --- | --- |
| Local filesystem | Available | Fully supported for Hadoop-style local warehouses. |
| S3 / MinIO | Experimental | Used by Hadoop, REST, Glue, Hive, and Nessie profiles. |
| GCS | Configured | Connection/profile alignment exists; object storage reads require enabling a GCS storage backend. |
| Azure ADLS | Configured | Connection/profile alignment exists; object storage reads require enabling an Azure storage backend. |
