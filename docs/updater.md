# Future Updater Preparation

IceScope is organized for future Tauri updater support, but the updater is not enabled yet.

Before enabling updater support, the project needs:

- Release signing keys.
- Secure update endpoint.
- Public key configuration in `src-tauri/tauri.conf.json`.
- Migration and rollback policy.
- CI secret management for signing.
- Installer verification process.

Do not enable automatic updates until these release-security requirements are complete.
