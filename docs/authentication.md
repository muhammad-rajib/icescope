# Authentication

IceScope renders authentication options dynamically based on selected storage and catalog.

## AWS

- Default credential chain
- AWS profile
- IAM role
- Access keys

## REST

- None
- Bearer token
- OAuth2
- Basic auth

## GCP

- Application Default Credentials
- Service account

## Azure

- Managed identity
- Service principal
- Account key

## Secret Storage

Secrets should be stored with Tauri Stronghold or the operating system credential manager. IceScope does not intentionally store secret values in plain text.
