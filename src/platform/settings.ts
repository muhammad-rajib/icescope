import { invoke } from "@tauri-apps/api/core";
import { defaultSettings, mergeSettings, type IceScopeSettings } from "../lib/defaultSettings";

export type AppInfo = {
  appVersion: string;
  rustVersion: string;
  tauriVersion: string;
  license: string;
  github: string;
};

const isTauri = "__TAURI_INTERNALS__" in window;
const localSettingsKey = "icescope-settings";

export async function loadStoredSettings() {
  if (isTauri) {
    const stored = await invoke<unknown | null>("load_settings");
    return mergeSettings(stored);
  }

  const stored = localStorage.getItem(localSettingsKey);
  return mergeSettings(stored ? JSON.parse(stored) : null);
}

export async function saveStoredSettings(settings: IceScopeSettings) {
  if (isTauri) {
    await invoke("save_settings", { settings });
    return;
  }

  localStorage.setItem(localSettingsKey, JSON.stringify(settings));
}

export async function clearMetadataCache() {
  if (isTauri) {
    await invoke("clear_cache");
  }
}

export async function openLogsFolder() {
  if (isTauri) {
    return invoke<string>("open_logs_folder");
  }

  return "Logs folder is available in the desktop app.";
}

export async function clearLogs() {
  if (isTauri) {
    await invoke("clear_logs");
  }
}

export async function getAppInfo(): Promise<AppInfo> {
  if (isTauri) {
    return invoke<AppInfo>("get_app_info");
  }

  return {
    appVersion: "0.1.0",
    rustVersion: "Mock mode",
    tauriVersion: "2",
    license: "Apache-2.0",
    github: "https://github.com/icescope/icescope",
  };
}

export async function checkForUpdates() {
  if (isTauri) {
    return invoke<string>("check_for_updates");
  }

  return "IceScope is up to date.";
}

export { defaultSettings };
