import { describe, expect, it } from "vitest";
import {
  clearPreviewCache,
  clearPreviewCacheForConnection,
  getPreviewPage,
  previewCacheKey,
  setPreviewPage,
} from "./previewCache";
import type { TablePreviewPage } from "../types";

const page: TablePreviewPage = {
  columns: ["id"],
  rows: [{ id: "1" }],
  totalCount: 1,
  pageSize: 50,
  offset: 0,
  hasMore: false,
  executionTimeMs: 12,
  source: "warehouse",
  error: null,
};

describe("previewCache", () => {
  it("stores and reads pages by generated key", () => {
    clearPreviewCache();
    const key = previewCacheKey({
      connectionId: "conn-1",
      namespace: "analytics",
      table: "events",
      sortColumn: "id",
      sortDirection: "asc",
      pageSize: 50,
      offset: 0,
    });

    setPreviewPage(key, page);

    expect(getPreviewPage(key)).toEqual({ ...page, source: "cached", executionTimeMs: 0 });
  });

  it("clears entries for one connection", () => {
    clearPreviewCache();
    const firstKey = previewCacheKey({
      connectionId: "conn-1",
      namespace: "analytics",
      table: "events",
      pageSize: 50,
      offset: 0,
    });
    const secondKey = previewCacheKey({
      connectionId: "conn-2",
      namespace: "analytics",
      table: "events",
      pageSize: 50,
      offset: 0,
    });

    setPreviewPage(firstKey, page);
    setPreviewPage(secondKey, page);
    clearPreviewCacheForConnection("conn-1");

    expect(getPreviewPage(firstKey)).toBeUndefined();
    expect(getPreviewPage(secondKey)).toEqual({ ...page, source: "cached", executionTimeMs: 0 });
  });
});
