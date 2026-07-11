# Security Policy

## Supported Versions

IceScope is pre-`1.0.0`. Security fixes are applied to the latest development branch until public release artifacts are published.

| Version | Supported |
| --- | --- |
| `0.1.x` | Yes |

## Reporting a Vulnerability

Please do not open public GitHub issues for suspected vulnerabilities.

Report security issues by emailing the maintainer or using GitHub private vulnerability reporting when enabled.

Include:

- Affected version or commit.
- Operating system.
- Reproduction steps.
- Impact assessment.
- Suggested mitigation, if known.

## Scope

Security-sensitive areas include:

- S3 credential handling.
- Local file access.
- Tauri IPC commands.
- Query execution and SQL input.
- Cache persistence.
- Release signing and installer distribution.

## Credential Handling

IceScope should not store AWS secret keys directly in project files. Prefer environment variables or standard AWS credential files.
