# Getting Started

This guide uses a local Iceberg warehouse because it is the fastest way to understand IceScope.

## 1. Install IceScope

Download a preview build from [GitHub Releases](https://github.com/muhammad-rajib/icescope/releases/latest), or build from source.

## 2. Open the application

Launch IceScope and open the **Connections** page.

## 3. Create a local warehouse connection

Choose a local warehouse template and provide:

- Connection name
- Warehouse directory
- Storage type: `Local`
- Query engine: `DataFusion`

## 4. Select the warehouse directory

Point IceScope at the directory that contains Iceberg table folders and metadata files.

## 5. Test and save the connection

Use **Test** first. If the warehouse is reachable, save the connection and connect.

## 6. Browse a namespace

Open **Explorer** and expand the active connection. Namespaces appear in the left table browser.

## 7. Open tables

Select a table such as `customers`, `orders`, or `products` if those exist in your demo warehouse.

## 8. Run a SQL query

Open **SQL Lab** and run a read-only query:

```sql
SELECT *
FROM learning.demo.customers
LIMIT 100;
```

## 9. Inspect metadata and snapshots

Return to Explorer and use the **Schema** and **Catalog** tabs to inspect table details, current snapshot metadata, and data file information.

::: tip Screenshot placeholders
Screenshots will be added under `docs/public/screenshots/` as preview builds stabilize.
:::
