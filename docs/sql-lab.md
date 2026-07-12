# SQL Lab

SQL Lab is a compact desktop SQL workspace for read-only exploration.

## Query tabs

SQL drafts are stored in multiple tabs. Tabs support:

- Automatic titles.
- Rename.
- Close.
- Unsaved-change indicators.
- Local persistence for draft text.

Results are memory-only.

## Editor

The editor supports SQL editing with a developer-tool layout. Editor settings such as font size, line numbers, word wrap, and autocomplete are controlled in Settings.

## Run a query

Use the Run button for read-only SQL queries.

```sql
SELECT *
FROM learning.demo.customers
LIMIT 100;
```

```sql
SELECT country, COUNT(*)
FROM learning.demo.customers
GROUP BY country;
```

## Results

The lower panel includes:

- Results
- Messages
- History

The compact status bar shows row count, execution time, cache source, and page information.

## History

Query history is stored locally and can be reopened from the History panel.

## Cache behavior

Table preview cache and arbitrary SQL execution are intentionally separate. IceScope never uses partial cached table pages to execute arbitrary SQL queries.

## Limitations

Preview builds focus on local DataFusion execution. DuckDB and Athena engine routing is experimental or planned depending on connection type.
