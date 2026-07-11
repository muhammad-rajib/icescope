import {
  ChevronDown,
  ChevronRight,
  FileJson,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  SearchX,
  Columns3,
  Table2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { friendlyClientError } from "../../lib/queryHints";
import { getPreviewPage, previewCacheKey, setPreviewPage } from "../../lib/previewCache";
import { api } from "../../platform/tauri";
import { useAppStore } from "../../stores/appStore";
import { useToastStore } from "../../stores/toastStore";
import type { ConnectionProfile, NamespaceInfo, TableInfo, TableMetadata, TablePreviewPage } from "../../types";

const pageSizeOptions = [50, 100, 250, 500, 1000];
const minTreeWidth = 220;
const maxTreeWidth = 420;

type SortState = {
  column: string | null;
  direction: "asc" | "desc";
};

type DataPanelTab = "table" | "schema" | "catalog";

export function ExplorerPage() {
  const { activeConnectionId, selectedTable, setSelectedTable } = useAppStore();
  const pushToast = useToastStore((state) => state.pushToast);
  const [namespaces, setNamespaces] = useState<NamespaceInfo[]>([]);
  const [tablesByNamespace, setTablesByNamespace] = useState<Record<string, TableInfo[]>>({});
  const [expandedNamespaces, setExpandedNamespaces] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [treeWidth, setTreeWidth] = useState(280);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<SortState>({ column: null, direction: "asc" });
  const [preview, setPreview] = useState<TablePreviewPage | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [metadata, setMetadata] = useState<TableMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState("");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const requestTokenRef = useRef(0);
  const metadataTokenRef = useRef(0);

  const selectedKey = selectedTable ? `${selectedTable.namespace}.${selectedTable.table}` : "";
  const activeConnectionName =
    connections.find((connection) => connection.id === activeConnectionId)?.name ?? null;
  const pageNumber = Math.floor(offset / pageSize) + 1;
  const filteredNamespaces = useMemo(
    () =>
      namespaces
        .map((namespace) => ({
          namespace,
          tables: (tablesByNamespace[namespace.name] ?? []).filter((table) =>
            `${table.namespace}.${table.name}`.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((entry) => !search || entry.namespace.name.toLowerCase().includes(search.toLowerCase()) || entry.tables.length > 0),
    [namespaces, search, tablesByNamespace],
  );

  useEffect(() => {
    api
      .listConnections()
      .then(setConnections)
      .catch(() => setConnections([]));
  }, []);

  useEffect(() => {
    if (!activeConnectionId) {
      setNamespaces([]);
      setTablesByNamespace({});
      setCatalogError("");
      setPreview(null);
      return;
    }

    void loadCatalog();
  }, [activeConnectionId]);

  useEffect(() => {
    if (!activeConnectionId || !selectedTable) return;
    void loadPreview(false);
  }, [activeConnectionId, selectedKey, pageSize, offset, sort.column, sort.direction]);

  useEffect(() => {
    if (!activeConnectionId || !selectedTable) {
      setMetadata(null);
      setMetadataError("");
      return;
    }

    void loadMetadata();
  }, [activeConnectionId, selectedKey]);

  async function loadCatalog() {
    if (!activeConnectionId) return;
    setCatalogLoading(true);
    setCatalogError("");

    try {
      const namespaceList = await api.listNamespaces(activeConnectionId);
      const tableGroups = await Promise.all(
        namespaceList.map(async (namespace) => [
          namespace.name,
          await api.listTables(activeConnectionId, namespace.name),
        ] as const),
      );
      setNamespaces(namespaceList);
      const nextTablesByNamespace = Object.fromEntries(tableGroups);
      setTablesByNamespace(nextTablesByNamespace);
      setExpandedNamespaces(new Set(namespaceList.map((namespace) => namespace.name)));

      const catalogTables = tableGroups.flatMap(([, tables]) => tables);
      const selectedTableExists =
        selectedTable &&
        catalogTables.some(
          (table) => table.namespace === selectedTable.namespace && table.name === selectedTable.table,
        );
      if ((!selectedTable || !selectedTableExists) && catalogTables[0]) {
        selectTable(catalogTables[0]);
      }
    } catch (error) {
      const message = friendlyClientError(error);
      setCatalogError(message);
      pushToast({ kind: "error", title: "Explorer load failed", message });
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadPreview(bypassCache: boolean) {
    if (!activeConnectionId || !selectedTable) return;
    const requestToken = requestTokenRef.current + 1;
    requestTokenRef.current = requestToken;
    const key = previewCacheKey({
      connectionId: activeConnectionId,
      namespace: selectedTable.namespace,
      table: selectedTable.table,
      filters: search,
      sortColumn: sort.column,
      sortDirection: sort.direction,
      pageSize,
      offset,
    });

    if (!bypassCache) {
      const cached = getPreviewPage(key);
      if (cached) {
        setPreview(cached);
        setPreviewError("");
        return;
      }
    }

    setPreviewLoading(true);
    setPreviewError("");
    try {
      const page = await api.getTablePreview({
        connectionId: activeConnectionId,
        namespace: selectedTable.namespace,
        table: selectedTable.table,
        pageSize,
        offset,
        sortColumn: sort.column,
        sortDirection: sort.direction,
      });
      if (requestToken !== requestTokenRef.current) return;
      setPreview(page);
      setPreviewPage(key, page);
    } catch (error) {
      if (requestToken !== requestTokenRef.current) return;
      const message = friendlyClientError(error);
      setPreviewError(message);
      setPreview(null);
    } finally {
      if (requestToken === requestTokenRef.current) {
        setPreviewLoading(false);
      }
    }
  }

  async function loadMetadata() {
    if (!activeConnectionId || !selectedTable) return;
    const requestToken = metadataTokenRef.current + 1;
    metadataTokenRef.current = requestToken;

    setMetadataLoading(true);
    setMetadataError("");
    try {
      const nextMetadata = await api.getTableMetadata(
        activeConnectionId,
        selectedTable.namespace,
        selectedTable.table,
      );
      if (requestToken !== metadataTokenRef.current) return;
      setMetadata(nextMetadata);
    } catch (error) {
      if (requestToken !== metadataTokenRef.current) return;
      setMetadata(null);
      setMetadataError(friendlyClientError(error));
    } finally {
      if (requestToken === metadataTokenRef.current) {
        setMetadataLoading(false);
      }
    }
  }

  function selectTable(table: TableInfo) {
    requestTokenRef.current += 1;
    metadataTokenRef.current += 1;
    setSelectedTable({ namespace: table.namespace, table: table.name });
    setOffset(0);
    setSort({ column: null, direction: "asc" });
    setPreview(null);
    setPreviewError("");
    setMetadata(null);
    setMetadataError("");
  }

  function toggleNamespace(namespace: string) {
    setExpandedNamespaces((current) => {
      const next = new Set(current);
      if (next.has(namespace)) next.delete(namespace);
      else next.add(namespace);
      return next;
    });
  }

  function startTreeResize(event: React.MouseEvent) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = treeWidth;
    const onMove = (moveEvent: MouseEvent) => {
      setTreeWidth(Math.min(maxTreeWidth, Math.max(minTreeWidth, startWidth + moveEvent.clientX - startX)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div className="flex h-[calc(100vh-6.5rem)] overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      {!treeCollapsed && (
        <aside className="relative shrink-0 border-r border-border bg-muted/20" style={{ width: treeWidth }}>
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">Explorer</h2>
                <p className="mt-1 text-xs text-foreground/55">
                  {activeConnectionName ?? "No connection selected"}
                </p>
              </div>
              <button className="rounded-md p-1.5 hover:bg-muted" onClick={() => setTreeCollapsed(true)} title="Collapse panel">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                <Search className="h-4 w-4 text-foreground/45" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="Search tables"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <button
                className="rounded-lg border border-border p-2 hover:bg-muted disabled:opacity-40"
                disabled={!activeConnectionId || catalogLoading}
                onClick={() => void loadCatalog()}
                title="Refresh namespaces and tables"
              >
                <RefreshCw className={`h-4 w-4 ${catalogLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <CatalogTree
              catalogError={catalogError}
              catalogLoading={catalogLoading}
              expandedNamespaces={expandedNamespaces}
              filteredNamespaces={filteredNamespaces}
              selectedKey={selectedKey}
              tablesByNamespace={tablesByNamespace}
              onRetry={() => void loadCatalog()}
              onSelectTable={selectTable}
              onToggleNamespace={toggleNamespace}
            />
          </div>
          <button
            className="absolute right-[-4px] top-0 h-full w-2 cursor-col-resize"
            onMouseDown={startTreeResize}
            title="Resize Explorer panel"
          />
        </aside>
      )}

      <section className="min-w-0 flex-1 overflow-hidden">
        {treeCollapsed && (
          <button
            className="m-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setTreeCollapsed(false)}
          >
            <PanelLeftOpen className="h-4 w-4" />
            Show tables
          </button>
        )}
        <DataPanel
          columnWidths={columnWidths}
          offset={offset}
          pageNumber={pageNumber}
          pageSize={pageSize}
          metadata={metadata}
          metadataError={metadataError}
          metadataLoading={metadataLoading}
          preview={preview}
          previewError={previewError}
          previewLoading={previewLoading}
          selectedTable={selectedTable}
          sort={sort}
          onColumnResize={setColumnWidths}
          onPageSize={(nextPageSize) => {
            setPageSize(nextPageSize);
            setOffset(0);
          }}
          onSetOffset={setOffset}
          onSort={(column) => {
            setOffset(0);
            setSort((current) => ({
              column,
              direction: current.column === column && current.direction === "asc" ? "desc" : "asc",
            }));
          }}
        />
      </section>
    </div>
  );
}

type CatalogTreeProps = {
  catalogError: string;
  catalogLoading: boolean;
  expandedNamespaces: Set<string>;
  filteredNamespaces: Array<{ namespace: NamespaceInfo; tables: TableInfo[] }>;
  selectedKey: string;
  tablesByNamespace: Record<string, TableInfo[]>;
  onRetry: () => void;
  onSelectTable: (table: TableInfo) => void;
  onToggleNamespace: (namespace: string) => void;
};

function CatalogTree({
  catalogError,
  catalogLoading,
  expandedNamespaces,
  filteredNamespaces,
  selectedKey,
  tablesByNamespace,
  onRetry,
  onSelectTable,
  onToggleNamespace,
}: CatalogTreeProps) {
  if (catalogLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-8 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
        <p>{catalogError}</p>
        <button className="mt-3 rounded-md border border-red-400/40 px-3 py-1.5 hover:bg-red-500/10" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (filteredNamespaces.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-foreground/60">
        No namespaces or tables found.
      </div>
    );
  }

  return (
    <div className="space-y-1 overflow-auto pr-1">
      {filteredNamespaces.map(({ namespace, tables }) => {
        const expanded = expandedNamespaces.has(namespace.name);
        return (
          <div key={namespace.name}>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => onToggleNamespace(namespace.name)}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Database className="h-4 w-4 text-primary" />
              <span className="truncate font-medium">{namespace.name}</span>
              <span className="ml-auto text-xs text-foreground/45">{tablesByNamespace[namespace.name]?.length ?? 0}</span>
            </button>
            {expanded && (
              <div className="ml-5 mt-1 space-y-1">
                {tables.map((table) => {
                  const key = `${table.namespace}.${table.name}`;
                  return (
                    <button
                      key={key}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                        selectedKey === key ? "bg-primary text-white" : "hover:bg-muted"
                      }`}
                      onClick={() => onSelectTable(table)}
                    >
                      <Table2 className="h-4 w-4" />
                      <span className="truncate">{table.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type DataPanelProps = {
  columnWidths: Record<string, number>;
  offset: number;
  pageNumber: number;
  pageSize: number;
  metadata: TableMetadata | null;
  metadataError: string;
  metadataLoading: boolean;
  preview: TablePreviewPage | null;
  previewError: string;
  previewLoading: boolean;
  selectedTable: { namespace: string; table: string } | null;
  sort: SortState;
  onColumnResize: (widths: Record<string, number>) => void;
  onPageSize: (pageSize: number) => void;
  onSetOffset: (offset: number) => void;
  onSort: (column: string) => void;
};

function DataPanel({
  columnWidths,
  offset,
  pageNumber,
  pageSize,
  metadata,
  metadataError,
  metadataLoading,
  preview,
  previewError,
  previewLoading,
  selectedTable,
  sort,
  onColumnResize,
  onPageSize,
  onSetOffset,
  onSort,
}: DataPanelProps) {
  const [activeTab, setActiveTab] = useState<DataPanelTab>("table");

  useEffect(() => {
    setActiveTab("table");
  }, [selectedTable?.namespace, selectedTable?.table]);

  if (!selectedTable) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-dashed border-border p-8 text-center">
          <Table2 className="mx-auto h-10 w-10 text-foreground/35" />
          <h3 className="mt-3 text-lg font-semibold">Select a table</h3>
          <p className="mt-1 text-sm text-foreground/60">
            Choose a namespace/table from the Explorer panel to preview paginated rows.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-1 border-b border-border bg-muted/10 px-2 py-2">
        <DataPanelTabButton
          active={activeTab === "table"}
          icon={<Table2 className="h-4 w-4" />}
          label="Table"
          onClick={() => setActiveTab("table")}
        />
        <DataPanelTabButton
          active={activeTab === "schema"}
          icon={<Columns3 className="h-4 w-4" />}
          label="Schema"
          onClick={() => setActiveTab("schema")}
        />
        <DataPanelTabButton
          active={activeTab === "catalog"}
          icon={<FileJson className="h-4 w-4" />}
          label="Catalog"
          onClick={() => setActiveTab("catalog")}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "table" && previewError ? (
          <NoDataFound message={previewError} />
        ) : activeTab === "table" ? (
          <PreviewGrid
            columnWidths={columnWidths}
            pageSize={pageSize}
            preview={preview}
            previewLoading={previewLoading}
            sort={sort}
            onColumnResize={onColumnResize}
            onSort={onSort}
          />
        ) : activeTab === "schema" ? (
          <SchemaPanel metadata={metadata} metadataError={metadataError} metadataLoading={metadataLoading} />
        ) : (
          <CatalogPanel metadata={metadata} metadataError={metadataError} metadataLoading={metadataLoading} />
        )}
      </div>

      {activeTab === "table" && (
        <div className="flex h-11 shrink-0 items-center gap-3 overflow-hidden border-t border-border/70 bg-muted/10 px-3 text-xs">
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-foreground/55">
            <span className="truncate font-medium text-foreground/70">
              {selectedTable.namespace}.{selectedTable.table}
            </span>
            <span className="shrink-0">
              Rows {preview?.rows.length ? offset + 1 : 0}
              {preview?.rows.length ? `–${offset + preview.rows.length}` : ""}
              {preview?.totalCount != null ? ` of ${preview.totalCount.toLocaleString()}` : ""}
            </span>
            <span className="shrink-0">Page {pageNumber}</span>
            <span className="shrink-0">
              {preview ? `${preview.executionTimeMs}ms` : "Not loaded"}
            </span>
            {preview && <SourcePill source={preview.source} />}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <select
              className="h-8 rounded-lg border border-border/80 bg-background px-2 text-xs text-foreground/75 outline-none transition hover:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={pageSize}
              onChange={(event) => onPageSize(Number(event.target.value))}
              aria-label="Page size"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} rows
                </option>
              ))}
            </select>
            <button
              className="h-8 rounded-lg border border-border/80 px-3 text-xs font-medium text-foreground/75 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={previewLoading || offset === 0}
              onClick={() => onSetOffset(Math.max(0, offset - pageSize))}
            >
              Previous
            </button>
            <button
              className="h-8 rounded-lg border border-border/80 px-3 text-xs font-medium text-foreground/75 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={previewLoading || !preview?.hasMore}
              onClick={() => onSetOffset(offset + pageSize)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DataPanelTabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
        active
          ? "bg-primary text-white shadow-sm"
          : "text-foreground/65 hover:bg-muted hover:text-foreground"
      }`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function SourcePill({ source }: { source: TablePreviewPage["source"] }) {
  const isCached = source === "cached";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isCached
          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
          : "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/25"
      }`}
    >
      {isCached ? "Cached" : "Warehouse"}
    </span>
  );
}

type PreviewGridProps = {
  columnWidths: Record<string, number>;
  pageSize: number;
  preview: TablePreviewPage | null;
  previewLoading: boolean;
  sort: SortState;
  onColumnResize: (widths: Record<string, number>) => void;
  onSort: (column: string) => void;
};

function PreviewGrid({ columnWidths, pageSize, preview, previewLoading, sort, onColumnResize, onSort }: PreviewGridProps) {
  const columns = preview?.columns ?? [];
  const rows = preview?.rows ?? [];
  const gridTemplateColumns = columns.map((column) => `${columnWidths[column] ?? 180}px`).join(" ");
  const [selectedCell, setSelectedCell] = useState<{ column: string; value: string } | null>(null);

  if (previewLoading && !preview) {
    return (
      <div className="h-full space-y-2 border border-border/70 p-3">
        {Array.from({ length: 14 }).map((_, index) => (
          <div key={index} className="h-9 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!previewLoading && preview && rows.length === 0) {
    return (
      <NoDataFound message="This table page returned no rows." />
    );
  }

  if (!preview) return null;

  return (
    <div className="relative h-full w-full overflow-auto border border-border">
      <div className="min-w-max">
        <div
          className="sticky top-0 z-10 grid border-b border-border bg-muted/80 text-xs font-semibold uppercase tracking-wide text-foreground/65 backdrop-blur"
          style={{ gridTemplateColumns }}
        >
          {columns.map((column) => (
            <div key={column} className="relative flex items-center justify-between gap-2 border-r border-border px-3 py-2 last:border-r-0">
              <button className="truncate text-left hover:text-foreground" onClick={() => onSort(column)} title={`Sort by ${column}`}>
                {column}
                {sort.column === column ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}
              </button>
              <ResizeHandle column={column} columnWidths={columnWidths} onColumnResize={onColumnResize} />
            </div>
          ))}
        </div>

        {previewLoading && (
          <div className="grid opacity-70" style={{ gridTemplateColumns }}>
            {Array.from({ length: Math.min(8, pageSize) }).map((_, rowIndex) =>
              columns.map((column) => (
                <div key={`${rowIndex}-${column}`} className="border-b border-r border-border/70 px-3 py-2">
                  <div className="h-4 animate-pulse rounded bg-muted" />
                </div>
              )),
            )}
          </div>
        )}

        {!previewLoading &&
          rows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid border-b border-border/70 text-sm last:border-b-0" style={{ gridTemplateColumns }}>
              {columns.map((column) => {
                const cellValue = formatCellTitle(row[column]);
                return (
                  <button
                    key={column}
                    className="min-w-0 truncate border-r border-border/70 px-3 py-2 text-left last:border-r-0 hover:bg-muted/50 focus:bg-muted focus:outline-none"
                    onClick={() => setSelectedCell({ column, value: cellValue })}
                    title="Click to view full value"
                  >
                    {formatCell(row[column])}
                  </button>
                );
              })}
            </div>
          ))}
      </div>
      {selectedCell && (
        <CellValuePopup
          column={selectedCell.column}
          value={selectedCell.value}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  );
}

function CellValuePopup({
  column,
  value,
  onClose,
}: {
  column: string;
  value: string;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[70vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-foreground/45">Cell value</p>
            <h3 className="truncate font-semibold">{column}</h3>
          </div>
          <button className="rounded-lg p-2 hover:bg-muted" onClick={onClose} aria-label="Close cell value popup">
            <X className="h-4 w-4" />
          </button>
        </div>
        <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-words p-4 text-sm text-foreground/80">
          {value}
        </pre>
      </div>
    </div>
  );
}

function SchemaPanel({
  metadata,
  metadataError,
  metadataLoading,
}: {
  metadata: TableMetadata | null;
  metadataError: string;
  metadataLoading: boolean;
}) {
  if (metadataLoading) return <MetadataSkeleton label="Loading schema…" />;
  if (metadataError) return <MetadataError message={metadataError} />;

  const schema = metadata?.schema ?? [];
  if (schema.length === 0) {
    return (
      <NoDataFound message="No schema information found for this table." />
    );
  }

  return (
    <div className="h-full overflow-auto border border-border">
      <div className="grid grid-cols-[minmax(220px,1fr)_minmax(260px,2fr)] border-b border-border bg-muted/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/65">
        <span>Field</span>
        <span>Definition</span>
      </div>
      {schema.map((field, index) => {
        const label = getFieldLabel(field, index);
        return (
          <div key={`${label}-${index}`} className="grid grid-cols-[minmax(220px,1fr)_minmax(260px,2fr)] border-b border-border/70 px-3 py-2 text-sm last:border-b-0">
            <span className="truncate font-medium">{label}</span>
            <code className="whitespace-pre-wrap break-words text-foreground/65">{formatJson(field)}</code>
          </div>
        );
      })}
    </div>
  );
}

function CatalogPanel({
  metadata,
  metadataError,
  metadataLoading,
}: {
  metadata: TableMetadata | null;
  metadataError: string;
  metadataLoading: boolean;
}) {
  if (metadataLoading) return <MetadataSkeleton label="Loading catalog…" />;
  if (metadataError) return <MetadataError message={metadataError} />;

  return (
    <div className="h-full overflow-auto border border-border p-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <CatalogCard
          title="Table"
          value={{
            namespace: metadata?.namespace ?? "Unknown",
            table: metadata?.table ?? "Unknown",
            columns: metadata?.schema.length ?? 0,
            snapshots: metadata?.snapshots.length ?? 0,
            partitions: metadata?.partitions.length ?? 0,
          }}
        />
        <CatalogCard title="Properties" value={metadata?.properties ?? {}} />
        <CatalogCard title="Partitions" value={metadata?.partitions ?? []} />
        <CatalogCard title="Snapshots" value={metadata?.snapshots ?? []} wide />
      </div>
    </div>
  );
}

function CatalogCard({ title, value, wide = false }: { title: string; value: unknown; wide?: boolean }) {
  return (
    <section className={`rounded-xl border border-border bg-muted/10 ${wide ? "lg:col-span-2" : ""}`}>
      <div className="border-b border-border px-3 py-2 text-sm font-semibold">{title}</div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-3 text-xs text-foreground/70">
        {formatJson(value)}
      </pre>
    </section>
  );
}

function MetadataSkeleton({ label }: { label: string }) {
  return (
    <div className="h-full space-y-2 border border-border/70 p-3">
      <p className="text-sm text-foreground/55">{label}</p>
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="h-9 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function MetadataError({ message }: { message: string }) {
  return <NoDataFound message={message} />;
}

function NoDataFound({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center border border-dashed border-border/80 p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground/45">
          <SearchX className="h-6 w-6" />
        </div>
        <h3 className="mt-3 font-semibold">No data found</h3>
        <p className="mt-1 text-sm text-foreground/55">{message}</p>
      </div>
    </div>
  );
}

function ResizeHandle({
  column,
  columnWidths,
  onColumnResize,
}: {
  column: string;
  columnWidths: Record<string, number>;
  onColumnResize: (widths: Record<string, number>) => void;
}) {
  function startResize(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = columnWidths[column] ?? 180;
    const onMove = (moveEvent: MouseEvent) => {
      onColumnResize({ ...columnWidths, [column]: Math.max(90, startWidth + moveEvent.clientX - startX) });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return <span className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary" onMouseDown={startResize} />;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return <span className="italic text-foreground/35">NULL</span>;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function formatCellTitle(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function getFieldLabel(field: unknown, index: number) {
  if (field && typeof field === "object" && "name" in field) {
    const name = (field as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name;
  }

  return `Field ${index + 1}`;
}

function formatJson(value: unknown) {
  if (value === undefined) return "";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatSource(source: TablePreviewPage["source"]) {
  return source === "cached" ? "Cached" : "Warehouse";
}
