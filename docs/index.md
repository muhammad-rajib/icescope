# IceScope

Explore Apache Iceberg catalogs, metadata, and data from one desktop application.

IceScope is a modern, open-source, cross-platform desktop explorer for Apache Iceberg. It helps data engineers and platform teams browse local Iceberg warehouses, inspect schemas and snapshots, preview table data, and run SQL from a fast Tauri desktop app.

<p>
  <a class="vp-button brand" href="/icescope/download">Download IceScope</a>
  <a class="vp-button alt" href="/icescope/getting-started">Get Started</a>
  <a class="vp-button alt" href="https://github.com/muhammad-rajib/icescope">View on GitHub</a>
</p>

<div class="product-hero">
  <div class="product-copy">
    <p class="eyebrow">Desktop Iceberg Explorer</p>
    <h2>Inspect catalogs, tables, snapshots, and SQL results without leaving your desktop.</h2>
    <p>
      Built with React, TypeScript, Rust, and Tauri, IceScope brings database-tool ergonomics to Apache Iceberg exploration.
    </p>
  </div>
  <img src="/icescope/screenshots/icescope-installed-image.png" alt="IceScope iceberg application image" />
</div>

## Features

<div class="feature-grid">
  <div class="feature-card">
    <strong>Catalog Explorer</strong>
    <p>Browse connections, namespaces, tables, schemas, metadata, and snapshot details from a desktop tree view.</p>
  </div>
  <div class="feature-card">
    <strong>Table Data Grid</strong>
    <p>Preview rows with server-side pagination, sorting, column resizing, cache source, and load timing.</p>
  </div>
  <div class="feature-card">
    <strong>SQL Lab</strong>
    <p>Write read-only SQL in multiple tabs, run DataFusion queries, review messages, and revisit query history.</p>
  </div>
  <div class="feature-card">
    <strong>Metadata Inspection</strong>
    <p>Inspect schemas, properties, partitions, manifests, snapshots, and file-level Iceberg metadata.</p>
  </div>
  <div class="feature-card">
    <strong>Snapshots and History</strong>
    <p>Understand current snapshots and table evolution without manually opening metadata JSON files.</p>
  </div>
  <div class="feature-card">
    <strong>Cross-platform Desktop</strong>
    <p>Designed for macOS, Windows, and Linux with native release packaging through Tauri.</p>
  </div>
</div>

## Supported platforms

<div class="status-grid">
  <div class="status-card">
    <strong>macOS</strong>
    <p>Apple Silicon and Intel preview builds are planned through GitHub Releases.</p>
  </div>
  <div class="status-card">
    <strong>Windows</strong>
    <p>Preview installer builds are planned for EXE and MSI packages.</p>
  </div>
  <div class="status-card">
    <strong>Linux</strong>
    <p>Preview packages are planned for AppImage, DEB, and RPM formats.</p>
  </div>
</div>

## Supported connections

| Connection | Status | Notes |
| --- | --- | --- |
| Local Hadoop catalog | <span class="badge available">Available</span> | Local Iceberg warehouse directory with metadata and Parquet files. |
| Local filesystem warehouse | <span class="badge available">Available</span> | Best path for first-time testing and local demos. |
| S3 / MinIO object storage | <span class="badge experimental">Experimental</span> | Foundations exist; expect rough edges in preview builds. |
| REST Catalog | <span class="badge planned">Planned</span> | Documented as a target integration. |
| AWS Glue | <span class="badge planned">Planned</span> | Planned catalog integration for AWS deployments. |
| Nessie | <span class="badge planned">Planned</span> | Planned versioned catalog support. |
| GCS / Azure | <span class="badge planned">Planned</span> | Planned cloud storage integrations. |

## Open source

IceScope is Apache-2.0 licensed and built in public. If the project helps you inspect Iceberg tables faster:

- [Star IceScope on GitHub](https://github.com/muhammad-rajib/icescope)
- [Report an issue](https://github.com/muhammad-rajib/icescope/issues)
- [Read the contribution guide](/icescope/contributing)
