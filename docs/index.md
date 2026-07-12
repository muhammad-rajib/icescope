---
layout: home

hero:
  name: IceScope
  text: Explore Apache Iceberg catalogs, metadata, and data from one desktop application.
  tagline: A modern, open-source, cross-platform desktop explorer for Apache Iceberg.
  image:
    src: /logo.png
    alt: IceScope logo
  actions:
    - theme: brand
      text: Download IceScope
      link: /download
    - theme: alt
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/muhammad-rajib/icescope

features:
  - title: Catalog Explorer
    details: Browse connections, namespaces, tables, schemas, metadata, and snapshot details from a desktop tree view.
  - title: Table Data Grid
    details: Preview rows with server-side pagination, sorting, column resizing, cache source, and load timing.
  - title: SQL Lab
    details: Write read-only SQL in multiple tabs, run DataFusion queries, review messages, and revisit query history.
  - title: Metadata Inspection
    details: Inspect schemas, properties, partitions, manifests, snapshots, and file-level Iceberg metadata.
  - title: Snapshots and History
    details: Understand current snapshots and table evolution without manually opening metadata JSON files.
  - title: Cross-platform Desktop
    details: Built with Tauri, Rust, React, and TypeScript for macOS, Windows, and Linux.
---

<div class="hero-screenshot" aria-label="IceScope application screenshot placeholder">
  <div class="hero-screenshot-inner">
    <div class="mock-sidebar">
      <div class="mock-row active"></div>
      <div class="mock-row"></div>
      <div class="mock-row"></div>
      <div class="mock-row active"></div>
      <div class="mock-row"></div>
      <div class="mock-row"></div>
    </div>
    <div class="mock-panel">
      <div class="mock-row active" style="width: 40%"></div>
      <div class="mock-row" style="width: 64%"></div>
      <div class="mock-grid">
        <div v-for="index in 32" :key="index" class="mock-cell"></div>
      </div>
    </div>
  </div>
</div>

## Supported platforms

<div class="status-grid">
  <div class="status-card"><strong>macOS</strong><p>Apple Silicon and Intel preview builds are planned through GitHub Releases.</p></div>
  <div class="status-card"><strong>Windows</strong><p>Preview installer builds are planned for EXE and MSI packages.</p></div>
  <div class="status-card"><strong>Linux</strong><p>Preview packages are planned for AppImage, DEB, and RPM formats.</p></div>
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
- [Read the contribution guide](/contributing)
