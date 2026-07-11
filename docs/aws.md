# AWS

Use **AWS S3 + Glue** for production AWS Iceberg environments.

## Required Fields

- Connection name
- S3 bucket
- Warehouse prefix
- Region
- Glue catalog settings
- Query engine

## Authentication

Prefer default credentials or AWS profiles. Access keys should be used only for local testing or short-lived credentials.

## Athena

Athena requires:

- Database
- Workgroup
- S3 query output location
