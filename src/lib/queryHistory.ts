const storageKey = "icescope-query-history";

export type QueryHistoryItem = {
  id: string;
  connectionId: string;
  sql: string;
  createdAt: string;
};

export function readQueryHistory(connectionId?: string | null): QueryHistoryItem[] {
  const value = localStorage.getItem(storageKey);
  const history = value ? (JSON.parse(value) as QueryHistoryItem[]) : [];
  return connectionId ? history.filter((item) => item.connectionId === connectionId) : history;
}

export function writeQueryHistory(history: QueryHistoryItem[]) {
  localStorage.setItem(storageKey, JSON.stringify(history.slice(0, 100)));
}

export function addQueryHistory(connectionId: string, sql: string) {
  const trimmedSql = sql.trim();
  if (!trimmedSql) return;

  const history = readQueryHistory();
  const nextItem: QueryHistoryItem = {
    id: globalThis.crypto?.randomUUID?.() ?? `query-${Date.now()}`,
    connectionId,
    sql: trimmedSql,
    createdAt: new Date().toISOString(),
  };

  writeQueryHistory([
    nextItem,
    ...history.filter(
      (item) => !(item.connectionId === connectionId && item.sql.trim() === trimmedSql),
    ),
  ]);
}

export function clearQueryHistory(connectionId: string) {
  writeQueryHistory(readQueryHistory().filter((item) => item.connectionId !== connectionId));
}
