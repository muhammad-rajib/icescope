# Snapshots

Snapshots are Iceberg’s table-version mechanism.

## Current snapshot

IceScope focuses table previews on the current snapshot so stale files from old table states are not scanned.

## Snapshot history

Snapshot history views are planned. The current metadata view exposes available snapshot information when present in table metadata.

## Manifests and files

Each snapshot references manifests that describe the data files for that snapshot. IceScope follows those references instead of scanning every data directory recursively.
