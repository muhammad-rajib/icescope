#!/usr/bin/env python3
"""Generate the local Iceberg fixture warehouse used by IceScope development."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
WAREHOUSE = ROOT / "tests" / "fixtures" / "warehouse"


EVENTS_ROWS = [
    {
        "event_id": "evt-001",
        "user_id": "usr-001",
        "event_type": "page_view",
        "occurred_at": "2026-01-10T10:00:00Z",
    },
    {
        "event_id": "evt-002",
        "user_id": "usr-002",
        "event_type": "signup",
        "occurred_at": "2026-01-10T10:05:00Z",
    },
    {
        "event_id": "evt-003",
        "user_id": "usr-001",
        "event_type": "purchase",
        "occurred_at": "2026-01-10T10:15:00Z",
    },
]

USERS_ROWS = [
    {
        "user_id": "usr-001",
        "email": "ada@example.com",
        "country": "US",
        "created_at": "2026-01-01T00:00:00Z",
    },
    {
        "user_id": "usr-002",
        "email": "grace@example.com",
        "country": "GB",
        "created_at": "2026-01-02T00:00:00Z",
    },
]


TABLES = {
    "events": {
        "rows": EVENTS_ROWS,
        "schema": [
            {"id": 1, "name": "event_id", "required": True, "type": "string"},
            {"id": 2, "name": "user_id", "required": True, "type": "string"},
            {"id": 3, "name": "event_type", "required": False, "type": "string"},
            {"id": 4, "name": "occurred_at", "required": False, "type": "timestamptz"},
        ],
    },
    "users": {
        "rows": USERS_ROWS,
        "schema": [
            {"id": 1, "name": "user_id", "required": True, "type": "string"},
            {"id": 2, "name": "email", "required": False, "type": "string"},
            {"id": 3, "name": "country", "required": False, "type": "string"},
            {"id": 4, "name": "created_at", "required": False, "type": "timestamptz"},
        ],
    },
}


def main() -> None:
    WAREHOUSE.mkdir(parents=True, exist_ok=True)
    pyarrow = import_pyarrow()

    for table_name, table in TABLES.items():
        table_dir = WAREHOUSE / "analytics" / table_name
        data_dir = table_dir / "data"
        metadata_dir = table_dir / "metadata"
        data_dir.mkdir(parents=True, exist_ok=True)
        metadata_dir.mkdir(parents=True, exist_ok=True)

        parquet_path = data_dir / f"{table_name}-00001.parquet"
        if pyarrow:
            write_parquet_with_pyarrow(pyarrow, table["rows"], parquet_path)
        else:
            write_placeholder_parquet(parquet_path, table_name, table["rows"])

        metadata = iceberg_metadata(table_name, table["schema"], len(table["rows"]), parquet_path)
        (metadata_dir / "v1.metadata.json").write_text(
            json.dumps(metadata, indent=2) + "\n",
            encoding="utf-8",
        )

    print(f"Generated fixture warehouse at {WAREHOUSE}")
    if not pyarrow:
        print("pyarrow is not installed; wrote placeholder .parquet files with row JSON payloads.")
        print("Install pyarrow and rerun this script to create binary Parquet files.")


def import_pyarrow() -> tuple[Any, Any] | None:
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq

        return pa, pq
    except ImportError:
        return None


def write_parquet_with_pyarrow(pyarrow: tuple[Any, Any], rows: list[dict[str, Any]], path: Path) -> None:
    pa, pq = pyarrow
    columns = {key: [row[key] for row in rows] for key in rows[0].keys()}
    table = pa.table(columns)
    pq.write_table(table, path)


def write_placeholder_parquet(path: Path, table_name: str, rows: list[dict[str, Any]]) -> None:
    payload = {
        "warning": "Install pyarrow and rerun scripts/generate_parquet_fixtures.py to create binary Parquet.",
        "table": f"analytics.{table_name}",
        "rows": rows,
    }
    path.write_bytes(b"PAR1\n" + json.dumps(payload, indent=2).encode("utf-8") + b"\nPAR1")


def iceberg_metadata(
    table_name: str,
    fields: list[dict[str, Any]],
    row_count: int,
    parquet_path: Path,
) -> dict[str, Any]:
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    table_location = f"file://{(WAREHOUSE / 'analytics' / table_name).as_posix()}"
    relative_data_path = f"../data/{parquet_path.name}"

    return {
        "format-version": 2,
        "table-uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, f"icescope.analytics.{table_name}")),
        "location": table_location,
        "last-sequence-number": 1,
        "last-updated-ms": now_ms,
        "last-column-id": max(field["id"] for field in fields),
        "current-schema-id": 0,
        "schemas": [
            {
                "type": "struct",
                "schema-id": 0,
                "fields": fields,
            }
        ],
        "default-spec-id": 0,
        "partition-specs": [
            {
                "spec-id": 0,
                "fields": [],
            }
        ],
        "last-partition-id": 999,
        "default-sort-order-id": 0,
        "sort-orders": [
            {
                "order-id": 0,
                "fields": [],
            }
        ],
        "properties": {
            "owner": "icescope",
            "write.format.default": "parquet",
            "fixture": "true",
            "fixture.data-file": relative_data_path,
            "fixture.record-count": str(row_count),
        },
        "current-snapshot-id": 1,
        "refs": {
            "main": {
                "snapshot-id": 1,
                "type": "branch",
            }
        },
        "snapshots": [
            {
                "snapshot-id": 1,
                "sequence-number": 1,
                "timestamp-ms": now_ms,
                "summary": {
                    "operation": "append",
                    "added-data-files": "1",
                    "added-records": str(row_count),
                },
                "manifest-list": f"{table_location}/metadata/snap-1.avro",
                "schema-id": 0,
            }
        ],
        "snapshot-log": [
            {
                "timestamp-ms": now_ms,
                "snapshot-id": 1,
            }
        ],
        "metadata-log": [],
    }


if __name__ == "__main__":
    main()
