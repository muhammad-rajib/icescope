import { beforeEach, describe, expect, it, vi } from "vitest";
import { addQueryHistory, clearQueryHistory, readQueryHistory } from "./queryHistory";

function installLocalStorageStub() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  });
}

describe("queryHistory", () => {
  beforeEach(() => {
    installLocalStorageStub();
  });

  it("stores history per connection and deduplicates SQL", () => {
    addQueryHistory("conn-1", "SELECT 1");
    addQueryHistory("conn-2", "SELECT 2");
    addQueryHistory("conn-1", "SELECT 1");

    expect(readQueryHistory("conn-1")).toHaveLength(1);
    expect(readQueryHistory("conn-1")[0].sql).toBe("SELECT 1");
    expect(readQueryHistory("conn-2")[0].sql).toBe("SELECT 2");
  });

  it("clears history for one connection", () => {
    addQueryHistory("conn-1", "SELECT 1");
    addQueryHistory("conn-2", "SELECT 2");

    clearQueryHistory("conn-1");

    expect(readQueryHistory("conn-1")).toHaveLength(0);
    expect(readQueryHistory("conn-2")).toHaveLength(1);
  });
});
