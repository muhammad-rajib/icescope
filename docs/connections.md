# Connections

IceScope uses a step-by-step connection wizard with progressive disclosure.

## Wizard Flow

1. Select a connection type.
2. Enter general information.
3. Configure storage.
4. Configure catalog.
5. Choose a query engine.
6. Configure authentication.
7. Test the connection.
8. Review and save.

Common local connections require only a name and warehouse folder. Advanced fields stay hidden until needed.

## Connection Types

- Local Warehouse
- AWS S3 + Glue
- REST Catalog
- MinIO
- Advanced

## Compatibility

IceScope validates storage/catalog compatibility before saving:

- Hadoop + Local
- Hadoop + S3
- REST + S3
- REST + MinIO
- Glue + S3
- Nessie + S3

Unsupported combinations show a clear validation message.

## Secret Handling

The wizard does not persist secret values in plain text. Prefer environment variables, AWS profiles, or future OS credential manager integration.
