import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, MoreHorizontal, OctagonX, Play, Plus, RotateCcw, Save, Trash2, Wand2, X } from "lucide-react";
import { ResultGrid } from "./ResultGrid";
import { IcebergLoader } from "../../components/ui/IcebergLoader";
import { addQueryHistory, clearQueryHistory, readQueryHistory } from "../../lib/queryHistory";
import { friendlyClientError, getQueryHints } from "../../lib/queryHints";
import { api } from "../../platform/tauri";
import { useAppStore } from "../../stores/appStore";
import { maxSqlTabs, useSqlTabsStore } from "../../stores/sqlTabsStore";
import { useToastStore } from "../../stores/toastStore";
import type { ConnectionProfile, QueryPage } from "../../types";

const defaultPage: QueryPage = {
  columns: [],
  rows: [],
  pageSize: 50,
  offset: 0,
  hasMore: false,
};

type TabResult = {
  page: QueryPage;
  offset: number;
  loadDurationMs: number | null;
  error: string;
};

const defaultTabResult: TabResult = {
  page: defaultPage,
  offset: 0,
  loadDurationMs: null,
  error: "",
};

export function SqlLabPage() {
  const { activeConnectionId, setActiveConnectionId, settings } = useAppStore();
  const {
    tabs,
    activeTabId,
    addTab,
    closeTab,
    importSql,
    renameTab,
    selectTab,
    setSql,
  } = useSqlTabsStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const [resultsByTab, setResultsByTab] = useState<Record<string, TabResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [resultTab, setResultTab] = useState<"results" | "messages" | "history">("results");
  const [cleanSqlByTab, setCleanSqlByTab] = useState<Record<string, string>>({});
  const requestTokenRef = useRef(0);
  const pushToast = useToastStore((state) => state.pushToast);
  const activeConnection = connections.find((connection) => connection.id === activeConnectionId);
  const activeResult = activeTab ? resultsByTab[activeTab.id] ?? defaultTabResult : defaultTabResult;
  const activeTabIsDirty = activeTab ? cleanSqlByTab[activeTab.id] !== activeTab.sql : false;

  const history = useMemo(
    () => readQueryHistory(activeConnectionId).slice(0, 12),
    [activeConnectionId, historyVersion],
  );
  const queryHints = useMemo(() => getQueryHints(activeTab?.sql ?? ""), [activeTab?.sql]);

  useEffect(() => {
    if (!activeTab) return;
    setResultsByTab((results) => ({
      ...results,
      [activeTab.id]: results[activeTab.id] ?? defaultTabResult,
    }));
    setCleanSqlByTab((cleanSql) => ({
      ...cleanSql,
      [activeTab.id]: cleanSql[activeTab.id] ?? activeTab.sql,
    }));
  }, [activeTab?.id, activeConnectionId]);

  useEffect(() => {
    api
      .listConnections()
      .then(setConnections)
      .catch((error) =>
        pushToast({
          kind: "error",
          title: "Could not load connection engine",
          message: error instanceof Error ? error.message : String(error),
        }),
      );
  }, [pushToast]);

  async function runQuery(nextOffset = activeResult.offset) {
    if (!activeConnectionId) {
      setActiveResult({ error: "Choose or create a connection before running SQL." });
      return;
    }

    if (!activeTab?.sql.trim()) {
      setActiveResult({ error: "Write a SQL query before running." });
      return;
    }

    const selectStarHint = queryHints.find((hint) => hint.title.includes("SELECT *"));
    if (selectStarHint) {
      pushToast({
        kind: "warning",
        title: selectStarHint.title,
        message: selectStarHint.message,
      });
    }

    setIsRunning(true);
    setActiveResult({ error: "", loadDurationMs: null });
    const startedAt = performance.now();
    const requestToken = requestTokenRef.current + 1;
    requestTokenRef.current = requestToken;

    try {
      const result = await api.runQuery(
        activeConnectionId,
        activeTab.sql,
        settings.dataExplorer.defaultPageSize,
        nextOffset,
      );
      if (requestToken !== requestTokenRef.current) return;

      setActiveResult({
        page: result,
        offset: result.offset,
        loadDurationMs: Math.round(performance.now() - startedAt),
        error: "",
      });
      if (settings.queryEditor.queryHistory) {
        addQueryHistory(activeConnectionId, activeTab.sql);
        setHistoryVersion((version) => version + 1);
      }
      setResultTab("results");
      pushToast({
        kind: "success",
        title: "Query finished",
        message: `${result.rows.length} rows loaded.`,
      });
    } catch (runError) {
      if (requestToken !== requestTokenRef.current) return;
      const message = friendlyClientError(runError);
      setActiveResult({ error: message });
      pushToast({ kind: "error", title: "Query failed", message: summarizeError(message) });
    } finally {
      if (requestToken === requestTokenRef.current) {
        setIsRunning(false);
      }
    }
  }

  function cancelQuery() {
    requestTokenRef.current += 1;
    setIsRunning(false);
    setActiveResult({ loadDurationMs: null });
    pushToast({
      kind: "info",
      title: "Query cancelled",
      message: "The UI will ignore any late response from the cancelled query.",
    });
  }

  function loadHistory(sql: string) {
    const tabId = importSql(sql);
    if (!tabId) {
      pushToast({
        kind: "error",
        title: "Tab limit reached",
        message: `Close a tab before importing more than ${maxSqlTabs} queries.`,
      });
      return;
    }
    setResultsByTab((results) => ({ ...results, [tabId]: defaultTabResult }));
    setResultTab("results");
  }

  function clearHistory() {
    if (!activeConnectionId) return;
    clearQueryHistory(activeConnectionId);
    setHistoryVersion((version) => version + 1);
  }

  function addBlankTab() {
    const tabId = addTab();
    if (!tabId) {
      pushToast({
        kind: "error",
        title: "Tab limit reached",
        message: `SQL Lab supports up to ${maxSqlTabs} tabs.`,
      });
    }
  }

  function closeSqlTab(tabId: string) {
    closeTab(tabId);
    setResultsByTab((results) => {
      const nextResults = { ...results };
      delete nextResults[tabId];
      return nextResults;
    });
  }

  function beginRename(tabId: string, title: string) {
    setRenamingTabId(tabId);
    setRenameDraft(title);
  }

  function commitRename() {
    if (!renamingTabId) return;
    renameTab(renamingTabId, renameDraft);
    setRenamingTabId(null);
    setRenameDraft("");
  }

  function resetActiveResult() {
    setActiveResult(defaultTabResult);
  }

  function saveSqlFile() {
    if (!activeTab) return;
    const blob = new Blob([activeTab.sql], { type: "text/sql;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFilename(activeTab.title)}.sql`;
    anchor.click();
    URL.revokeObjectURL(url);
    setCleanSqlByTab((cleanSql) => ({ ...cleanSql, [activeTab.id]: activeTab.sql }));
    pushToast({ kind: "success", title: "SQL saved", message: `${safeFilename(activeTab.title)}.sql` });
  }

  function exportResults() {
    if (!activeTab || activeResult.page.rows.length === 0) {
      pushToast({ kind: "info", title: "No results to export", message: "Run a query before exporting results." });
      return;
    }

    const csv = toCsv(activeResult.page.columns, activeResult.page.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFilename(activeTab.title)}-results.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function explainQuery() {
    if (!activeTab?.sql.trim()) return;
    setSql(activeTab.id, `EXPLAIN ${activeTab.sql.trim()}`);
    setOverflowOpen(false);
  }

  function formatSql() {
    if (!activeTab) return;
    setSql(activeTab.id, formatSqlText(activeTab.sql));
    setOverflowOpen(false);
  }

  function setActiveResult(partial: Partial<TabResult>) {
    if (!activeTab) return;
    setResultsByTab((results) => ({
      ...results,
      [activeTab.id]: {
        ...(results[activeTab.id] ?? defaultTabResult),
        ...partial,
      },
    }));
  }

  return (
    <div className="relative flex h-[calc(100vh-6.5rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-muted/15 px-2">
        <div className="flex min-w-0 items-center gap-2">
          <select
            className="h-8 min-w-48 max-w-72 rounded-lg border border-border/70 bg-background px-2 text-sm outline-none transition hover:bg-muted/40 focus:border-primary"
            value={activeConnectionId ?? ""}
            onChange={(event) => setActiveConnectionId(event.target.value || null)}
            title="Connection"
          >
            <option value="">No connection</option>
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.name}
              </option>
            ))}
          </select>
          <button
            className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            disabled={isRunning}
            onClick={() => void runQuery(0)}
          >
            <Play className="h-4 w-4" />
            {isRunning ? "Running…" : "Run"}
          </button>
          <button
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-border/70 px-3 text-sm hover:bg-muted/60 disabled:opacity-40"
            onClick={saveSqlFile}
            disabled={!activeTab}
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
        <div className="relative">
          <button
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/70 px-2 text-sm hover:bg-muted/60"
            onClick={() => setOverflowOpen((open) => !open)}
            title="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
            <ChevronDown className="h-3.5 w-3.5 text-foreground/45" />
          </button>
          {overflowOpen && (
            <div className="absolute right-0 top-9 z-30 w-56 overflow-hidden rounded-xl border border-border bg-background p-1 shadow-2xl">
              <OverflowAction icon={<OctagonX className="h-4 w-4" />} label="Cancel" disabled={!isRunning} onClick={cancelQuery} />
              <OverflowAction icon={<RotateCcw className="h-4 w-4" />} label="Reset" onClick={resetActiveResult} />
              <OverflowAction icon={<Download className="h-4 w-4" />} label="Export results" onClick={exportResults} />
              <OverflowAction icon={<Wand2 className="h-4 w-4" />} label="Format SQL" disabled={!activeTab} onClick={formatSql} />
              <OverflowAction icon={<Play className="h-4 w-4" />} label="Explain" disabled={!activeTab?.sql.trim()} onClick={explainQuery} />
              <OverflowAction icon={<Trash2 className="h-4 w-4" />} label="Clear history" disabled={!settings.queryEditor.queryHistory || !activeConnectionId || history.length === 0} onClick={clearHistory} />
              <OverflowAction label="Open history" onClick={() => setResultTab("history")} />
            </div>
          )}
        </div>
      </div>

      <div className="flex h-10 shrink-0 items-end gap-1 overflow-x-auto border-b border-border/70 bg-muted/10 px-2 pt-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group flex h-8 max-w-56 shrink-0 items-center gap-1 rounded-t-lg border-x border-t px-2 text-sm ${
              tab.id === activeTabId ? "border-border bg-background" : "border-transparent bg-muted/30 text-foreground/60 hover:bg-muted/50"
            }`}
          >
            {renamingTabId === tab.id ? (
              <input
                className="h-6 w-32 rounded border border-border bg-background px-2 text-sm outline-none focus:border-primary"
                value={renameDraft}
                autoFocus
                onChange={(event) => setRenameDraft(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitRename();
                  if (event.key === "Escape") setRenamingTabId(null);
                }}
              />
            ) : (
              <button
                className="min-w-0 flex-1 truncate text-left"
                title="Click to select. Double-click to rename."
                onClick={() => selectTab(tab.id)}
                onDoubleClick={() => beginRename(tab.id, tab.title)}
              >
                {cleanSqlByTab[tab.id] !== tab.sql && <span className="mr-1 text-primary">●</span>}
                {tab.title}
              </button>
            )}
            <button
              className="rounded p-0.5 text-foreground/45 opacity-70 hover:bg-muted hover:text-foreground group-hover:opacity-100"
              onClick={() => closeSqlTab(tab.id)}
              title="Close tab"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          className="mb-1 inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-sm text-foreground/60 hover:bg-muted hover:text-foreground disabled:opacity-40"
          disabled={tabs.length >= maxSqlTabs}
          onClick={addBlankTab}
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(260px,1.05fr)_minmax(220px,0.95fr)] gap-2 p-2">
        <div className="min-h-0 overflow-hidden rounded-xl border border-border/70 bg-background">
          <CodeMirror
            value={activeTab?.sql ?? ""}
            height="100%"
            theme="dark"
            basicSetup={{
              lineNumbers: settings.queryEditor.lineNumbers,
              autocompletion: settings.queryEditor.autoComplete,
            }}
            className={`h-full ${settings.queryEditor.wordWrap ? "icescope-editor-wrap" : ""}`}
            style={{ height: "100%", fontSize: `${settings.queryEditor.fontSize}px` }}
            onChange={(value) => activeTab && setSql(activeTab.id, value)}
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background">
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/70 bg-muted/10 px-2">
            <div className="flex items-center gap-1">
              <ResultTabButton active={resultTab === "results"} label="Results" onClick={() => setResultTab("results")} />
              <ResultTabButton active={resultTab === "messages"} label="Messages" count={activeResult.error || queryHints.length > 0 ? 1 : 0} onClick={() => setResultTab("messages")} />
              <ResultTabButton active={resultTab === "history"} label="History" onClick={() => setResultTab("history")} />
            </div>
            <div className="flex items-center gap-1">
              <button
                className="h-7 rounded-md px-2 text-xs hover:bg-muted disabled:opacity-40"
                disabled={isRunning || activeResult.offset === 0}
                onClick={() => void runQuery(Math.max(0, activeResult.offset - settings.dataExplorer.defaultPageSize))}
              >
                Previous
              </button>
              <button
                className="h-7 rounded-md px-2 text-xs hover:bg-muted disabled:opacity-40"
                disabled={isRunning || !activeResult.page.hasMore}
                onClick={() => void runQuery(activeResult.offset + settings.dataExplorer.defaultPageSize)}
              >
                Next
              </button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            {isRunning && <IcebergLoader message={`Running ${formatEngine(activeConnection?.queryEngine)} query…`} />}
            {resultTab === "results" && (
              <ResultGrid
                columns={activeResult.page.columns}
                rows={activeResult.page.rows}
                placeholderColumns={isRunning ? inferPlaceholderColumns(activeTab?.sql ?? "") : []}
                showRowNumbers={settings.dataExplorer.showRowNumbers}
                virtualScrolling={settings.dataExplorer.virtualScrolling}
                fillHeight
              />
            )}
            {resultTab === "messages" && (
              <MessagesPanel error={activeResult.error} hints={queryHints} />
            )}
            {resultTab === "history" && (
              <HistoryPanel
                activeConnectionId={activeConnectionId}
                history={history}
                historyEnabled={settings.queryEditor.queryHistory}
                onClearHistory={clearHistory}
                onLoadHistory={loadHistory}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex h-8 shrink-0 items-center justify-between border-t border-border/70 bg-muted/15 px-3 text-xs text-foreground/65">
        <span>
          Rows {activeResult.page.rows.length > 0 ? activeResult.offset + 1 : 0}
          {activeResult.page.rows.length > 0 ? `–${activeResult.offset + activeResult.page.rows.length}` : ""}
        </span>
        <span>{activeResult.loadDurationMs !== null ? formatDuration(activeResult.loadDurationMs) : "Not run"}</span>
        <span>Warehouse</span>
        <span>
          Page {Math.floor(activeResult.offset / settings.dataExplorer.defaultPageSize) + 1} · {settings.dataExplorer.defaultPageSize}/page
        </span>
      </div>
    </div>
  );
}

function OverflowAction({
  disabled = false,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="w-4 text-foreground/60">{icon}</span>
      {label}
    </button>
  );
}

function ResultTabButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-7 rounded-lg px-2.5 text-xs font-medium ${
        active ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:bg-muted hover:text-foreground"
      }`}
      onClick={onClick}
    >
      {label}
      {count ? <span className="ml-1 text-primary">●</span> : null}
    </button>
  );
}

function MessagesPanel({
  error,
  hints,
}: {
  error: string;
  hints: ReturnType<typeof getQueryHints>;
}) {
  if (!error && hints.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-foreground/55">
        No messages.
      </div>
    );
  }

  return (
    <div className="h-full space-y-2 overflow-auto p-3">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {hints.map((hint) => (
        <div
          key={hint.title}
          className={`rounded-lg border px-3 py-2 text-sm ${
            hint.kind === "warning"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
              : "border-sky-500/40 bg-sky-500/10 text-sky-100"
          }`}
        >
          <span className="font-medium">{hint.title}</span>
          <span className="ml-2 text-foreground/75">{hint.message}</span>
        </div>
      ))}
    </div>
  );
}

function HistoryPanel({
  activeConnectionId,
  history,
  historyEnabled,
  onClearHistory,
  onLoadHistory,
}: {
  activeConnectionId: string | null;
  history: ReturnType<typeof readQueryHistory>;
  historyEnabled: boolean;
  onClearHistory: () => void;
  onLoadHistory: (sql: string) => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/70 px-3">
        <span className="text-xs text-foreground/55">Stored per connection in localStorage.</span>
        <button
          className="rounded-md p-1.5 hover:bg-muted disabled:opacity-40"
          disabled={!historyEnabled || !activeConnectionId || history.length === 0}
          onClick={onClearHistory}
          title="Clear history"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {!historyEnabled ? (
        <p className="m-3 rounded-lg border border-dashed border-border p-4 text-sm text-foreground/65">
          Query history is disabled in Settings.
        </p>
      ) : history.length === 0 ? (
        <p className="m-3 rounded-lg border border-dashed border-border p-4 text-sm text-foreground/65">
          Run a query to build history.
        </p>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
          {history.map((item) => (
            <button
              key={item.id}
              className="w-full rounded-lg border border-border/70 bg-background p-3 text-left text-sm hover:bg-muted"
              onClick={() => onLoadHistory(item.sql)}
            >
              <span className="line-clamp-3 whitespace-pre-wrap font-mono text-xs">
                {item.sql}
              </span>
              <span className="mt-2 block text-[11px] text-foreground/50">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(2)}s`;
}

function safeFilename(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "query"
  );
}

function summarizeError(message: string) {
  return message.split("\n")[0] ?? message;
}

function inferPlaceholderColumns(sql: string) {
  const selectMatch = sql.match(/select\s+([\s\S]*?)\s+from/i);
  if (!selectMatch) return ["column_1", "column_2", "column_3"];
  const selected = selectMatch[1].trim();
  if (!selected || selected === "*") return ["column_1", "column_2", "column_3", "column_4"];
  return selected
    .split(",")
    .map((column) => column.trim().split(/\s+as\s+/i).pop() ?? column.trim())
    .map((column) => column.replace(/["'`]/g, ""))
    .slice(0, 8);
}

function toCsv(columns: string[], rows: Record<string, unknown>[]) {
  const header = columns.map(escapeCsvValue).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(","));
  return [header, ...body].join("\n");
}

function escapeCsvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function formatSqlText(sql: string) {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\b(select|from|where|group by|order by|limit|offset|join|left join|right join|inner join)\b/gi, "\n$1")
    .replace(/\s*,\s*/g, ",\n  ")
    .trim()
    .replace(/^(select|from|where|group by|order by|limit|offset|join|left join|right join|inner join)/gim, (keyword) =>
      keyword.toUpperCase(),
    );
}

function formatEngine(engine?: ConnectionProfile["queryEngine"]) {
  if (engine === "duckdb") return "DuckDB";
  if (engine === "athena") return "Athena";
  if (engine === "datafusion") return "DataFusion";
  return "No active connection";
}
