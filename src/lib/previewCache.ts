import type { TablePreviewPage } from "../types";

const maxEntries = 48;
const ttlMs = 5 * 60 * 1000;

type PreviewCacheEntry = {
  value: TablePreviewPage;
  expiresAt: number;
};

export type PreviewCacheKeyInput = {
  connectionId: string;
  namespace: string;
  table: string;
  filters?: string;
  sortColumn?: string | null;
  sortDirection?: string | null;
  pageSize: number;
  offset: number;
};

const cache = new Map<string, PreviewCacheEntry>();

export function previewCacheKey(input: PreviewCacheKeyInput) {
  return [
    input.connectionId,
    `${input.namespace}.${input.table}`,
    `filters=${input.filters ?? ""}`,
    `sort=${input.sortColumn ?? ""}:${input.sortDirection ?? ""}`,
    `pageSize=${input.pageSize}`,
    `offset=${input.offset}`,
  ].join("|");
}

export function getPreviewPage(key: string) {
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  cache.delete(key);
  cache.set(key, entry);
  return { ...entry.value, source: "cached" as const, executionTimeMs: 0 };
}

export function setPreviewPage(key: string, value: TablePreviewPage) {
  pruneExpiredPreviewPages();
  if (cache.size >= maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearPreviewCacheForConnection(connectionId: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${connectionId}|`)) {
      cache.delete(key);
    }
  }
}

export function clearPreviewCache() {
  cache.clear();
}

function pruneExpiredPreviewPages() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}
