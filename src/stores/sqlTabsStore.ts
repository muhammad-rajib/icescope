import { create } from "zustand";
import { persist } from "zustand/middleware";

export const maxSqlTabs = 20;

export type SqlTab = {
  id: string;
  title: string;
  sql: string;
  isTitleCustom: boolean;
};

type SqlTabsState = {
  tabs: SqlTab[];
  activeTabId: string;
  selectTab: (tabId: string) => void;
  addTab: (sql?: string, title?: string) => string | null;
  closeTab: (tabId: string) => void;
  renameTab: (tabId: string, title: string) => void;
  setSql: (tabId: string, sql: string) => void;
  importSql: (sql: string, title?: string) => string | null;
};

const initialSql = "SELECT *\nFROM analytics.events\nLIMIT 50;";

const initialTab: SqlTab = {
  id: "tab-1",
  title: "Query 1",
  sql: initialSql,
  isTitleCustom: false,
};

export const useSqlTabsStore = create<SqlTabsState>()(
  persist(
    (set, get) => ({
      tabs: [initialTab],
      activeTabId: initialTab.id,
      selectTab: (activeTabId) => set({ activeTabId }),
      addTab: (sql = "", title) => {
        const state = get();
        if (state.tabs.length >= maxSqlTabs) return null;

        const tab: SqlTab = {
          id: newTabId(),
          title: title ?? nextAutoTitle(state.tabs),
          sql,
          isTitleCustom: Boolean(title),
        };

        set({ tabs: [...state.tabs, tab], activeTabId: tab.id });
        return tab.id;
      },
      closeTab: (tabId) =>
        set((state) => {
          if (state.tabs.length === 1) {
            return {
              tabs: [{ ...state.tabs[0], sql: "", title: "Query 1", isTitleCustom: false }],
              activeTabId: state.tabs[0].id,
            };
          }

          const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId);
          const tabs = state.tabs.filter((tab) => tab.id !== tabId);
          const activeTabId =
            state.activeTabId === tabId
              ? tabs[Math.max(0, tabIndex - 1)]?.id ?? tabs[0].id
              : state.activeTabId;

          return { tabs, activeTabId };
        }),
      renameTab: (tabId, title) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  title: title.trim() || autoTitleFromSql(tab.sql),
                  isTitleCustom: Boolean(title.trim()),
                }
              : tab,
          ),
        })),
      setSql: (tabId, sql) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  sql,
                  title: tab.isTitleCustom ? tab.title : autoTitleFromSql(sql),
                }
              : tab,
          ),
        })),
      importSql: (sql, title) => {
        const state = get();
        const existing = state.tabs.find((tab) => tab.sql.trim() === sql.trim());
        if (existing) {
          set({ activeTabId: existing.id });
          return existing.id;
        }

        return get().addTab(sql, title);
      },
    }),
    {
      name: "icescope-sql-tabs",
      partialize: (state) => ({
        tabs: state.tabs.map(({ id, title, sql, isTitleCustom }) => ({
          id,
          title,
          sql,
          isTitleCustom,
        })),
        activeTabId: state.activeTabId,
      }),
    },
  ),
);

function newTabId() {
  return globalThis.crypto?.randomUUID?.() ?? `tab-${Date.now()}`;
}

function nextAutoTitle(tabs: SqlTab[]) {
  return `Query ${tabs.length + 1}`;
}

function autoTitleFromSql(sql: string) {
  const tableMatch = sql.match(/\bfrom\s+([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)/i);
  if (tableMatch) return tableMatch[1];

  const firstLine = sql.trim().split("\n")[0]?.trim();
  if (firstLine) return firstLine.slice(0, 32);

  return "Untitled query";
}
