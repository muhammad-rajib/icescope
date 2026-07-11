# Explorer

The Explorer page is the primary table browsing workflow.

## Catalog Explorer

The left Explorer panel shows the active connection and catalog tree. It includes search, refresh, loading, empty, and error states.

## Namespace Tree

Namespaces appear as expandable tree nodes. Tables are listed under each namespace.

## Table Browser

Selecting a table loads the right panel. Metadata loading and row-data loading are separate so the UI remains responsive.

## Data Grid

The Table tab shows paginated rows with:

- Server-side pagination.
- Page size controls.
- Sorting.
- Sticky headers.
- Horizontal scrolling.
- NULL formatting.
- Click-to-view cell value popup.

## Schema Viewer

The Schema tab shows Iceberg schema fields and raw field definitions.

## Metadata Viewer

The Catalog tab shows table properties, partitions, and snapshots from Iceberg metadata.
