# Local Hadoop-Style Warehouse

Use this example for Iceberg tables stored on the local filesystem.

## Connection

- Storage: `local`
- Engine: `datafusion`
- Warehouse path: absolute path to your warehouse root

Example:

```text
/Users/you/data/warehouse
```

IceScope discovers namespaces and tables from the directory layout and reads table metadata from each table's `metadata/` directory.
