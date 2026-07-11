# IceScope Fixture Warehouse

This local fixture warehouse is used for development and tests.

## Tables

- `analytics.events`
- `analytics.users`

## Regenerate

```bash
python3 scripts/generate_parquet_fixtures.py
```

Install `pyarrow` first to generate binary Parquet files. If `pyarrow` is unavailable, the generator writes small placeholder `.parquet` files with embedded JSON rows so the warehouse shape remains available.
