export type ThemePreference = "system" | "light" | "dark";
export type LogLevel = "error" | "warn" | "info" | "debug" | "trace";

export type IceScopeSettings = {
  general: {
    theme: ThemePreference;
    language: string;
    restorePreviousSession: boolean;
    autoCheckUpdates: boolean;
  };
  dataExplorer: {
    defaultPageSize: number;
    maxQueryRows: number;
    showRowNumbers: boolean;
    virtualScrolling: boolean;
  };
  queryEditor: {
    fontSize: number;
    wordWrap: boolean;
    lineNumbers: boolean;
    autoComplete: boolean;
    queryHistory: boolean;
  };
  cache: {
    metadataCache: boolean;
    cacheDurationMinutes: number;
  };
  performance: {
    parallelLoading: boolean;
    backgroundWorkers: boolean;
  };
  logging: {
    logLevel: LogLevel;
  };
  sidebarCollapsed: boolean;
};

export const defaultSettings: IceScopeSettings = {
  general: {
    theme: "system",
    language: "en",
    restorePreviousSession: true,
    autoCheckUpdates: true,
  },
  dataExplorer: {
    defaultPageSize: 50,
    maxQueryRows: 10_000,
    showRowNumbers: true,
    virtualScrolling: true,
  },
  queryEditor: {
    fontSize: 14,
    wordWrap: false,
    lineNumbers: true,
    autoComplete: true,
    queryHistory: true,
  },
  cache: {
    metadataCache: true,
    cacheDurationMinutes: 30,
  },
  performance: {
    parallelLoading: true,
    backgroundWorkers: true,
  },
  logging: {
    logLevel: "info",
  },
  sidebarCollapsed: false,
};

export function mergeSettings(value: unknown): IceScopeSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const partial = value as Partial<IceScopeSettings>;

  return {
    general: { ...defaultSettings.general, ...partial.general },
    dataExplorer: { ...defaultSettings.dataExplorer, ...partial.dataExplorer },
    queryEditor: { ...defaultSettings.queryEditor, ...partial.queryEditor },
    cache: { ...defaultSettings.cache, ...partial.cache },
    performance: { ...defaultSettings.performance, ...partial.performance },
    logging: { ...defaultSettings.logging, ...partial.logging },
    sidebarCollapsed: partial.sidebarCollapsed ?? defaultSettings.sidebarCollapsed,
  };
}
