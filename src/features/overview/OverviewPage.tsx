import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../platform/tauri";
import { useAppStore } from "../../stores/appStore";
import { useToastStore } from "../../stores/toastStore";
import type { OverviewSummary, OverviewTableRow } from "../../types";

type SortKey = "table" | "recordCount" | "fileCount" | "totalSizeBytes" | "lastUpdatedMs";
type SortDirection = "asc" | "desc";

const emptySummary: OverviewSummary = {
  tableCount: 0,
  recordCount: 0,
  totalSizeBytes: 0,
  changedToday: 0,
  tables: [],
};

export function OverviewPage() {
  const navigate = useNavigate();
  const { activeConnectionId, setSelectedTable } = useAppStore();
  const pushToast = useToastStore((state) => state.pushToast);
  const [summary, setSummary] = useState<OverviewSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("table");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    void loadOverview(false);
  }, [activeConnectionId]);

  const sortedTables = useMemo(() => {
    return [...summary.tables].sort((left, right) => {
      const result = compareRows(left, right, sortKey);
      return sortDirection === "asc" ? result : -result;
    });
  }, [summary.tables, sortDirection, sortKey]);

  async function loadOverview(refresh: boolean) {
    if (!activeConnectionId) {
      setSummary(emptySummary);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const nextSummary = refresh
        ? await api.refreshOverview(activeConnectionId)
        : await api.getOverview(activeConnectionId);
      setSummary(nextSummary);
    } catch (error) {
      pushToast({
        kind: "error",
        title: "Overview unavailable",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "table" ? "asc" : "desc");
  }

  function openTable(row: OverviewTableRow) {
    setSelectedTable({ namespace: row.namespace, table: row.table });
    navigate("/explorer");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="text-sm text-foreground/65">
            Cached warehouse KPIs and table-level current snapshot summaries.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          disabled={!activeConnectionId || isLoading}
          onClick={() => void loadOverview(true)}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh overview
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Tables" value={summary.tableCount.toLocaleString()} loading={isLoading} />
        <KpiCard label="Records" value={summary.recordCount.toLocaleString()} loading={isLoading} />
        <KpiCard label="Storage" value={formatBytes(summary.totalSizeBytes)} loading={isLoading} />
        <KpiCard label="Changed today" value={summary.changedToday.toLocaleString()} loading={isLoading} />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-muted/20">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">Tables</h3>
          <p className="text-sm text-foreground/60">Click a row to open it in Explorer.</p>
        </div>

        {isLoading ? (
          <OverviewSkeleton />
        ) : sortedTables.length === 0 ? (
          <div className="p-6 text-sm text-foreground/65">
            No tables found for the active connection.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-foreground/55">
                <tr>
                  <SortableHeader label="Table" sortKey="table" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Records" sortKey="recordCount" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Files" sortKey="fileCount" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Size" sortKey="totalSizeBytes" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Updated" sortKey="lastUpdatedMs" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedTables.map((row) => (
                  <tr
                    key={`${row.namespace}.${row.table}`}
                    className="cursor-pointer border-t border-border bg-background hover:bg-muted/60"
                    onClick={() => openTable(row)}
                  >
                    <td className="px-4 py-3 font-medium">
                      {row.namespace}.{row.table}
                    </td>
                    <td className="px-4 py-3">{row.recordCount.toLocaleString()}</td>
                    <td className="px-4 py-3">{row.fileCount.toLocaleString()}</td>
                    <td className="px-4 py-3">{formatBytes(row.totalSizeBytes)}</td>
                    <td className="px-4 py-3">{formatDate(row.lastUpdatedMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <article className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-sm text-foreground/60">{label}</p>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded-md bg-muted" />
      ) : (
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      )}
    </article>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th className="px-4 py-3">
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onSort(sortKey)}>
        {label}
        <ArrowDownUp className={`h-3.5 w-3.5 ${activeKey === sortKey ? "text-primary" : ""}`} />
        {activeKey === sortKey && <span className="normal-case">{direction}</span>}
      </button>
    </th>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid animate-pulse grid-cols-5 gap-3 rounded-lg bg-background p-3">
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function compareRows(left: OverviewTableRow, right: OverviewTableRow, key: SortKey) {
  if (key === "table") {
    return `${left.namespace}.${left.table}`.localeCompare(`${right.namespace}.${right.table}`);
  }

  return Number(left[key] ?? 0) - Number(right[key] ?? 0);
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(timestampMs?: number | null) {
  return timestampMs ? new Date(timestampMs).toLocaleString() : "Unknown";
}
