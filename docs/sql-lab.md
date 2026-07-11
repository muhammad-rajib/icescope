# SQL Lab

SQL Lab is the interactive query workspace.

## Query Editor

The editor uses CodeMirror and supports line numbers, word wrap, autocomplete settings, and dark desktop styling.

## Multiple Tabs

SQL drafts are stored in multiple tabs. Tabs support:

- Up to 20 open drafts.
- Auto titles.
- Rename.
- Close.
- Unsaved-change indicators.
- Persistent SQL text.

Results are memory-only and are not persisted.

## Query History

Query history is stored per connection in localStorage when enabled in Settings. History can be opened from the SQL Lab result panel or overflow menu.

## Result Grid

Results are shown in a virtualized grid with row numbers, pagination, and compact status information.

## Export

Use the SQL Lab overflow menu to export current results as CSV or save the active SQL tab as a `.sql` file.
