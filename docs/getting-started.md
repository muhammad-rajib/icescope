# Getting Started

## Install IceScope

Download a release installer from GitHub Releases when available, or run from source:

```bash
make install
make dev
```

## Create Your First Connection

1. Open **Connections**.
2. Click **New connection**.
3. Enter a connection name.
4. Select `local` storage for a local warehouse.
5. Enter the warehouse path.
6. Select `datafusion` as the query engine.
7. Save the connection.

You can also use **Add sample data** for the bundled fixture warehouse.

## Browse Tables

1. Open **Explorer**.
2. Expand a namespace.
3. Select a table.
4. Use the right panel to view table rows, schema, and catalog metadata.

## Run Your First Query

Open **SQL Lab** and run:

```sql
SELECT *
FROM analytics.events
LIMIT 10;
```

Results appear in the **Results** tab. Messages and query history are available beside it.
