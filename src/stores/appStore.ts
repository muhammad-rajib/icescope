import { create } from "zustand";
import { defaultSettings, loadStoredSettings, saveStoredSettings } from "../platform/settings";
import type { IceScopeSettings } from "../lib/defaultSettings";
import type { SelectedTable } from "../types";

type AppState = {
  activeConnectionId: string | null;
  selectedTable: SelectedTable | null;
  settings: IceScopeSettings;
  settingsLoaded: boolean;
  setActiveConnectionId: (connectionId: string | null) => void;
  setSelectedTable: (table: SelectedTable | null) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
  updateSettings: (settings: IceScopeSettings) => void;
  patchSettings: (settings: Partial<IceScopeSettings>) => void;
  setPageSize: (pageSize: number) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  activeConnectionId: null,
  selectedTable: null,
  settings: defaultSettings,
  settingsLoaded: false,
  setActiveConnectionId: (activeConnectionId) => set({ activeConnectionId }),
  setSelectedTable: (selectedTable) => set({ selectedTable }),
  loadSettings: async () => {
    const settings = await loadStoredSettings();
    set({ settings, settingsLoaded: true });
  },
  saveSettings: async () => {
    await saveStoredSettings(get().settings);
  },
  resetSettings: async () => {
    set({ settings: defaultSettings });
    await saveStoredSettings(defaultSettings);
  },
  updateSettings: (settings) => set({ settings }),
  patchSettings: (settings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...settings,
        general: { ...state.settings.general, ...settings.general },
        dataExplorer: { ...state.settings.dataExplorer, ...settings.dataExplorer },
        queryEditor: { ...state.settings.queryEditor, ...settings.queryEditor },
        cache: { ...state.settings.cache, ...settings.cache },
        performance: { ...state.settings.performance, ...settings.performance },
        logging: { ...state.settings.logging, ...settings.logging },
      },
    })),
  setPageSize: (defaultPageSize) =>
    set((state) => ({
      settings: {
        ...state.settings,
        dataExplorer: { ...state.settings.dataExplorer, defaultPageSize },
      },
    })),
  toggleSidebar: () =>
    set((state) => ({
      settings: {
        ...state.settings,
        sidebarCollapsed: !state.settings.sidebarCollapsed,
      },
    })),
  toggleTheme: () =>
    set((state) => ({
      settings: {
        ...state.settings,
        general: {
          ...state.settings.general,
          theme: state.settings.general.theme === "dark" ? "light" : "dark",
        },
      },
    })),
}));
