# Query Engines

IceScope separates query engines from storage and catalog configuration.

## Automatic

Automatic mode chooses the safest available engine for the selected connection.

## DataFusion

DataFusion is the default local query engine for local warehouse exploration.

## DuckDB

DuckDB is exposed as an advanced option and is planned for deeper local analytical workflows.

## Athena

Athena is used for AWS-oriented deployments and requires S3 output configuration.

## Planned Engines

- Spark
- Trino
