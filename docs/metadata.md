# Metadata

Iceberg metadata describes table structure, snapshots, manifests, partition specs, and properties.

## Table metadata

IceScope reads table metadata JSON to show:

- Schema fields.
- Table properties.
- Partition information.
- Snapshot references.
- Current snapshot details.

## Manifests

Manifest lists and manifests identify the data files that belong to a snapshot. IceScope uses the current snapshot when scanning table files.

## Data files

Data file metadata can include:

- File paths.
- Partition values.
- Lower bounds.
- Upper bounds.
- Record counts when available.

These values support future pruning and richer inspection views.
