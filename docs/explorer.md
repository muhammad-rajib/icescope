# Explorer

Explorer is the table browser for active Iceberg connections.

## Namespace tree

The left panel shows:

- Active connection name.
- Search.
- Refresh.
- Expandable namespaces.
- Tables inside each namespace.

Selecting a table loads data in the right panel.

## Table data grid

The data tab shows rows with:

- Server-side pagination.
- Page size options.
- Column resizing.
- Sticky headers.
- Horizontal scrolling.
- Sort controls.
- `NULL` formatting.
- Loading skeletons.
- Empty and error states.

## Pagination

Available page sizes:

- 50
- 100
- 250
- 500
- 1000

Previous and Next buttons are disabled when no page is available.

## Cache source

The footer shows whether rows came from:

- **Cached** metadata/page data.
- **Warehouse** reads.

Refresh bypasses valid cached pages and replaces them after a successful warehouse load.

## Schema tab

The Schema tab shows columns and types when Iceberg metadata is available.

## Catalog tab

The Catalog tab shows table metadata such as snapshots, properties, partition information, and file details when available.

## Stale requests

When you switch tables quickly, IceScope cancels or ignores stale table-load requests so old results do not replace the selected table.
