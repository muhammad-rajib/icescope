import { invoke } from "@tauri-apps/api/core";
import type {
  ConnectionProfile,
  NamespaceInfo,
  OverviewSummary,
  QueryPage,
  TableInfo,
  TableMetadata,
  TablePreviewPage,
  TablePreviewRequest,
} from "../types";

const isTauri = "__TAURI_INTERNALS__" in window;
let mockConnections: ConnectionProfile[] = [];

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    return invoke<T>(command, args);
  }

  return mockApi<T>(command);
}

function mockApi<T>(command: string): Promise<T> {
  if (command === "list_connections") {
    return Promise.resolve(mockConnections as T);
  }

  const mocks: Record<string, unknown> = {
    list_namespaces: [{ name: "analytics" }],
    list_tables: [{ namespace: "analytics", name: "events" }],
    get_table_metadata: {
      namespace: "analytics",
      table: "events",
      schema: [],
      snapshots: [],
      properties: {},
      partitions: [],
    },
    run_query: {
      columns: ["status"],
      rows: [{ status: "Vite mock mode" }],
      pageSize: 50,
      offset: 0,
      hasMore: false,
    },
    get_table_preview: {
      columns: ["id", "status", "amount"],
      rows: [
        { id: 1, status: "Vite mock mode", amount: null },
        { id: 2, status: "Preview row", amount: 42 },
      ],
      totalCount: 2,
      pageSize: 50,
      offset: 0,
      hasMore: false,
      executionTimeMs: 4,
      source: "warehouse",
      error: null,
    },
    get_overview: {
      tableCount: 2,
      recordCount: 5,
      totalSizeBytes: 1048,
      changedToday: 2,
      tables: [
        {
          namespace: "analytics",
          table: "events",
          recordCount: 3,
          fileCount: 1,
          totalSizeBytes: 601,
          lastUpdatedMs: Date.now(),
        },
        {
          namespace: "analytics",
          table: "users",
          recordCount: 2,
          fileCount: 1,
          totalSizeBytes: 447,
          lastUpdatedMs: Date.now(),
        },
      ],
    },
  };

  return Promise.resolve(mocks[command] as T);
}

export const api = {
  listConnections: () => call<ConnectionProfile[]>("list_connections"),
  saveConnection: async (profile: ConnectionProfile) => {
    if (!isTauri) {
      mockConnections = [
        ...mockConnections.filter((connection) => connection.id !== profile.id),
        profile,
      ].sort((left, right) => left.name.localeCompare(right.name));
      return profile;
    }

    return call<ConnectionProfile>("save_connection", { profile });
  },
  deleteConnection: async (connectionId: string) => {
    if (!isTauri) {
      mockConnections = mockConnections.filter((connection) => connection.id !== connectionId);
      return;
    }

    return call<void>("delete_connection", { connectionId });
  },
  listNamespaces: (connectionId: string) => call<NamespaceInfo[]>("list_namespaces", { connectionId }),
  listTables: (connectionId: string, namespace: string) =>
    call<TableInfo[]>("list_tables", { connectionId, namespace }),
  getTableMetadata: (connectionId: string, namespace: string, table: string) =>
    call<TableMetadata>("get_table_metadata", { connectionId, namespace, table }),
  runQuery: (connectionId: string, sql: string, pageSize: number, offset: number) =>
    call<QueryPage>("run_query", { connectionId, sql, pageSize, offset }),
  getTablePreview: (request: TablePreviewRequest) =>
    call<TablePreviewPage>("get_table_preview", {
      connectionId: request.connectionId,
      namespace: request.namespace,
      table: request.table,
      pageSize: request.pageSize,
      offset: request.offset,
      sortColumn: request.sortColumn ?? null,
      sortDirection: request.sortDirection ?? null,
    }),
  getOverview: (connectionId: string) => call<OverviewSummary>("get_overview", { connectionId }),
  refreshOverview: (connectionId: string) =>
    call<OverviewSummary>("refresh_overview", { connectionId }),
};
