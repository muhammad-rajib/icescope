# Configuration

IceScope stores user settings locally through Tauri Store.

## Settings

Settings include:

- General app behavior.
- Data Explorer defaults.
- Query Editor preferences.
- Cache controls.
- Performance options.
- Logging options.
- About and version information.

## Cache

Caches are stored locally and backed by SQLite where appropriate. Cache controls include enabling metadata cache, cache duration, and clearing cache data.

## Logging

Logging settings include log level, opening the logs folder, and clearing logs.

## Theme

Theme options:

- System
- Light
- Dark

Theme changes apply immediately.

## Local Storage

Frontend-only data such as SQL tabs and query history uses browser localStorage. Native data such as connections and cache tables use the app data directory.
