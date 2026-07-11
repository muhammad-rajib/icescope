# AWS Glue

AWS Glue catalog support is planned.

S3 object access is already part of IceScope's storage layer. Use standard AWS credentials:

- Environment variables.
- `~/.aws/credentials`.

IceScope does not use IMDS by default.

Planned fields:

- AWS region
- Glue database
- Warehouse S3 path
- Optional endpoint override
