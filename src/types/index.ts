export type StorageType = "local" | "s3";
export type QueryEngine = "datafusion" | "duckdb" | "athena";

export type SelectedTable = {
  namespace: string;
  table: string;
};

export type ConnectionProfile = {
  id: string;
  name: string;
  warehousePath: string;
  storageType: StorageType;
  queryEngine: QueryEngine;
  s3?: S3Settings | null;
  athena?: AthenaSettings | null;
};

export type S3Settings = {
  region?: string | null;
  endpoint?: string | null;
  pathStyle: boolean;
};

export type AthenaSettings = {
  database?: string | null;
  workgroup?: string | null;
  outputLocation?: string | null;
};

export type NamespaceInfo = {
  name: string;
};

export type TableInfo = {
  namespace: string;
  name: string;
};

export type TableMetadata = {
  namespace: string;
  table: string;
  schema: unknown[];
  snapshots: unknown[];
  properties: Record<string, string>;
  partitions: unknown[];
};

export type QueryPage = {
  columns: string[];
  rows: Record<string, unknown>[];
  pageSize: number;
  offset: number;
  hasMore: boolean;
};

export type PreviewSource = "cached" | "warehouse";

export type TablePreviewPage = {
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount?: number | null;
  pageSize: number;
  offset: number;
  hasMore: boolean;
  executionTimeMs: number;
  source: PreviewSource;
  error?: string | null;
};

export type TablePreviewRequest = {
  connectionId: string;
  namespace: string;
  table: string;
  pageSize: number;
  offset: number;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc" | null;
};

export type OverviewSummary = {
  tableCount: number;
  recordCount: number;
  totalSizeBytes: number;
  changedToday: number;
  tables: OverviewTableRow[];
};

export type OverviewTableRow = {
  namespace: string;
  table: string;
  recordCount: number;
  fileCount: number;
  totalSizeBytes: number;
  lastUpdatedMs?: number | null;
};
