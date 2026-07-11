import {
  Activity,
  Bell,
  Braces,
  CheckCircle2,
  Database,
  Eraser,
  FileText,
  Github,
  Info,
  Monitor,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  TerminalSquare,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { IceScopeSettings, LogLevel, ThemePreference } from "../../lib/defaultSettings";
import {
  checkForUpdates,
  clearLogs,
  clearMetadataCache,
  getAppInfo,
  openLogsFolder,
  type AppInfo,
} from "../../platform/settings";
import { useAppStore } from "../../stores/appStore";
import { useToastStore } from "../../stores/toastStore";

type SectionId =
  | "general"
  | "dataExplorer"
  | "queryEditor"
  | "cache"
  | "performance"
  | "logging"
  | "about";

const sections: Array<{ id: SectionId; label: string; icon: typeof Settings }> = [
  { id: "general", label: "General", icon: Monitor },
  { id: "dataExplorer", label: "Data Explorer", icon: Database },
  { id: "queryEditor", label: "Query Editor", icon: TerminalSquare },
  { id: "cache", label: "Cache", icon: RefreshCw },
  { id: "performance", label: "Performance", icon: Activity },
  { id: "logging", label: "Logging", icon: FileText },
  { id: "about", label: "About", icon: Info },
];

export function SettingsPage() {
  const { resetSettings, saveSettings, settings, updateSettings } = useAppStore();
  const pushToast = useToastStore((state) => state.pushToast);
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const validationErrors = useMemo(() => validateSettings(settings), [settings]);

  useEffect(() => {
    getAppInfo().then(setAppInfo).catch(() => setAppInfo(null));
  }, []);

  function setSettings(nextSettings: IceScopeSettings) {
    updateSettings(nextSettings);
  }

  async function save() {
    if (validationErrors.length > 0) {
      pushToast({
        kind: "error",
        title: "Settings need attention",
        message: validationErrors[0],
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveSettings();
      pushToast({ kind: "success", title: "Settings saved", message: "Preferences were persisted." });
    } catch (error) {
      pushToast({
        kind: "error",
        title: "Save failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function reset() {
    await resetSettings();
    pushToast({ kind: "info", title: "Defaults restored", message: "IceScope settings were reset." });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-muted/20 p-5">
        <div>
          <p className="text-sm text-primary">IceScope Preferences</p>
          <h2 className="text-2xl font-semibold">Settings</h2>
          <p className="mt-1 max-w-2xl text-sm text-foreground/65">
            Tune the desktop experience, query editor, cache behavior, performance, and diagnostics.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => void reset()}
            title="Restore all settings to IceScope defaults"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            disabled={isSaving || validationErrors.length > 0}
            onClick={() => void save()}
            title="Persist settings to the desktop settings store"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          {validationErrors[0]}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-border bg-muted/20 p-2">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                activeSection === section.id ? "bg-primary text-white" : "hover:bg-muted"
              }`}
              onClick={() => setActiveSection(section.id)}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          ))}
        </aside>

        <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
          {activeSection === "general" && (
            <SettingsSection
              icon={Monitor}
              title="General"
              description="Core desktop preferences and startup behavior."
            >
              <SelectRow
                label="Theme"
                tooltip="System follows your operating system appearance."
                value={settings.general.theme}
                options={[
                  ["system", "System"],
                  ["light", "Light"],
                  ["dark", "Dark"],
                ]}
                onChange={(theme) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, theme: theme as ThemePreference },
                  })
                }
              />
              <SelectRow
                label="Language"
                tooltip="UI language preference."
                value={settings.general.language}
                options={[
                  ["en", "English"],
                  ["bn", "Bangla"],
                  ["es", "Spanish"],
                  ["fr", "French"],
                ]}
                onChange={(language) =>
                  setSettings({ ...settings, general: { ...settings.general, language } })
                }
              />
              <SwitchRow
                label="Restore previous session"
                tooltip="Reopen the last workspace state on launch."
                checked={settings.general.restorePreviousSession}
                onChange={(restorePreviousSession) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, restorePreviousSession },
                  })
                }
              />
              <SwitchRow
                label="Auto check for updates"
                tooltip="Check for IceScope updates on startup."
                checked={settings.general.autoCheckUpdates}
                onChange={(autoCheckUpdates) =>
                  setSettings({ ...settings, general: { ...settings.general, autoCheckUpdates } })
                }
              />
            </SettingsSection>
          )}

          {activeSection === "dataExplorer" && (
            <SettingsSection
              icon={Database}
              title="Data Explorer"
              description="Defaults for previews, paging, and large result rendering."
            >
              <NumberRow
                label="Default page size"
                tooltip="Rows requested per query page."
                value={settings.dataExplorer.defaultPageSize}
                min={10}
                max={1_000}
                step={10}
                onChange={(defaultPageSize) =>
                  setSettings({
                    ...settings,
                    dataExplorer: { ...settings.dataExplorer, defaultPageSize },
                  })
                }
              />
              <NumberRow
                label="Max query rows"
                tooltip="Soft cap for rows held in the UI."
                value={settings.dataExplorer.maxQueryRows}
                min={100}
                max={1_000_000}
                step={100}
                onChange={(maxQueryRows) =>
                  setSettings({
                    ...settings,
                    dataExplorer: { ...settings.dataExplorer, maxQueryRows },
                  })
                }
              />
              <SwitchRow
                label="Show row numbers"
                tooltip="Show a row-number column in result grids."
                checked={settings.dataExplorer.showRowNumbers}
                onChange={(showRowNumbers) =>
                  setSettings({
                    ...settings,
                    dataExplorer: { ...settings.dataExplorer, showRowNumbers },
                  })
                }
              />
              <SwitchRow
                label="Virtual scrolling"
                tooltip="Render only visible rows for smoother large result sets."
                checked={settings.dataExplorer.virtualScrolling}
                onChange={(virtualScrolling) =>
                  setSettings({
                    ...settings,
                    dataExplorer: { ...settings.dataExplorer, virtualScrolling },
                  })
                }
              />
            </SettingsSection>
          )}

          {activeSection === "queryEditor" && (
            <SettingsSection
              icon={TerminalSquare}
              title="Query Editor"
              description="CodeMirror behavior for SQL drafting."
            >
              <NumberRow
                label="Font size"
                tooltip="Editor font size in pixels."
                value={settings.queryEditor.fontSize}
                min={11}
                max={24}
                onChange={(fontSize) =>
                  setSettings({ ...settings, queryEditor: { ...settings.queryEditor, fontSize } })
                }
              />
              <SwitchRow
                label="Word wrap"
                tooltip="Wrap long SQL lines visually."
                checked={settings.queryEditor.wordWrap}
                onChange={(wordWrap) =>
                  setSettings({ ...settings, queryEditor: { ...settings.queryEditor, wordWrap } })
                }
              />
              <SwitchRow
                label="Line numbers"
                tooltip="Show editor gutter line numbers."
                checked={settings.queryEditor.lineNumbers}
                onChange={(lineNumbers) =>
                  setSettings({
                    ...settings,
                    queryEditor: { ...settings.queryEditor, lineNumbers },
                  })
                }
              />
              <SwitchRow
                label="Auto-complete"
                tooltip="Enable SQL completion hints."
                checked={settings.queryEditor.autoComplete}
                onChange={(autoComplete) =>
                  setSettings({
                    ...settings,
                    queryEditor: { ...settings.queryEditor, autoComplete },
                  })
                }
              />
              <SwitchRow
                label="Query history"
                tooltip="Remember successful SQL queries per connection."
                checked={settings.queryEditor.queryHistory}
                onChange={(queryHistory) =>
                  setSettings({
                    ...settings,
                    queryEditor: { ...settings.queryEditor, queryHistory },
                  })
                }
              />
            </SettingsSection>
          )}

          {activeSection === "cache" && (
            <SettingsSection
              icon={RefreshCw}
              title="Cache"
              description="Metadata cache preferences and manual cleanup."
            >
              <SwitchRow
                label="Enable metadata cache"
                tooltip="Keep Iceberg metadata, overview, and query cache entries locally."
                checked={settings.cache.metadataCache}
                onChange={(metadataCache) =>
                  setSettings({ ...settings, cache: { ...settings.cache, metadataCache } })
                }
              />
              <NumberRow
                label="Cache duration"
                suffix="minutes"
                tooltip="Default local metadata cache duration."
                value={settings.cache.cacheDurationMinutes}
                min={1}
                max={1_440}
                onChange={(cacheDurationMinutes) =>
                  setSettings({
                    ...settings,
                    cache: { ...settings.cache, cacheDurationMinutes },
                  })
                }
              />
              <ActionRow
                label="Clear cache"
                description="Remove metadata, overview, and query-result cache rows."
                buttonLabel="Clear cache"
                icon={Eraser}
                onClick={async () => {
                  await clearMetadataCache();
                  pushToast({ kind: "success", title: "Cache cleared" });
                }}
              />
            </SettingsSection>
          )}

          {activeSection === "performance" && (
            <SettingsSection
              icon={Activity}
              title="Performance"
              description="Control how aggressively IceScope loads and processes metadata."
            >
              <SwitchRow
                label="Parallel loading"
                tooltip="Load independent namespaces and manifests concurrently."
                checked={settings.performance.parallelLoading}
                onChange={(parallelLoading) =>
                  setSettings({
                    ...settings,
                    performance: { ...settings.performance, parallelLoading },
                  })
                }
              />
              <SwitchRow
                label="Background workers"
                tooltip="Allow background work for previews and metadata refreshes."
                checked={settings.performance.backgroundWorkers}
                onChange={(backgroundWorkers) =>
                  setSettings({
                    ...settings,
                    performance: { ...settings.performance, backgroundWorkers },
                  })
                }
              />
            </SettingsSection>
          )}

          {activeSection === "logging" && (
            <SettingsSection
              icon={FileText}
              title="Logging"
              description="Diagnostics and local log file management."
            >
              <SelectRow
                label="Log level"
                tooltip="Minimum severity written to logs."
                value={settings.logging.logLevel}
                options={[
                  ["error", "Error"],
                  ["warn", "Warn"],
                  ["info", "Info"],
                  ["debug", "Debug"],
                  ["trace", "Trace"],
                ]}
                onChange={(logLevel) =>
                  setSettings({
                    ...settings,
                    logging: { logLevel: logLevel as LogLevel },
                  })
                }
              />
              <ActionRow
                label="Open logs folder"
                description="Open the operating-system folder where IceScope writes logs."
                buttonLabel="Open folder"
                icon={FileText}
                onClick={async () => {
                  const path = await openLogsFolder();
                  pushToast({ kind: "info", title: "Logs folder", message: path });
                }}
              />
              <ActionRow
                label="Clear logs"
                description="Delete current log files from the logs folder."
                buttonLabel="Clear logs"
                icon={Eraser}
                onClick={async () => {
                  await clearLogs();
                  pushToast({ kind: "success", title: "Logs cleared" });
                }}
              />
            </SettingsSection>
          )}

          {activeSection === "about" && (
            <SettingsSection icon={Info} title="About" description="Build information and project links.">
              <InfoRow label="App version" value={appInfo?.appVersion ?? "Loading…"} />
              <InfoRow label="Rust version" value={appInfo?.rustVersion ?? "Loading…"} />
              <InfoRow label="Tauri version" value={appInfo?.tauriVersion ?? "Loading…"} />
              <InfoRow label="License" value={appInfo?.license ?? "Apache-2.0"} />
              <ActionRow
                label="GitHub"
                description={appInfo?.github ?? "https://github.com/icescope/icescope"}
                buttonLabel="Copy link"
                icon={Github}
                onClick={async () => {
                  await navigator.clipboard?.writeText(appInfo?.github ?? "https://github.com/icescope/icescope");
                  pushToast({ kind: "success", title: "GitHub link copied" });
                }}
              />
              <ActionRow
                label="Check for updates"
                description="Ask IceScope to check whether a newer version is available."
                buttonLabel="Check now"
                icon={Bell}
                onClick={async () => {
                  const message = await checkForUpdates();
                  pushToast({ kind: "info", title: "Update check", message });
                }}
              />
            </SettingsSection>
          )}
        </section>
      </div>
    </div>
  );
}

type SettingsSectionProps = {
  icon: typeof Settings;
  title: string;
  description: string;
  children: ReactNode;
};

function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps) {
  return (
    <div>
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-xl border border-border bg-muted/40 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-sm text-foreground/60">{description}</p>
        </div>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border">{children}</div>
    </div>
  );
}

type SelectRowProps = {
  label: string;
  tooltip: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
};

function SelectRow({ label, tooltip, value, options, onChange }: SelectRowProps) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_260px] sm:items-center">
      <Label label={label} tooltip={tooltip} />
      <select
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

type NumberRowProps = {
  label: string;
  tooltip: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
};

function NumberRow({ label, tooltip, value, min, max, step = 1, suffix, onChange }: NumberRowProps) {
  const isInvalid = value < min || value > max || !Number.isFinite(value);
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_260px] sm:items-center">
      <Label label={label} tooltip={tooltip} description={`Allowed range: ${min}–${max}${suffix ? ` ${suffix}` : ""}.`} />
      <div>
        <div className="flex items-center gap-2">
          <input
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary ${
              isInvalid ? "border-red-500" : "border-border"
            }`}
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          {suffix && <span className="text-sm text-foreground/60">{suffix}</span>}
        </div>
        {isInvalid && (
          <p className="mt-1 text-xs text-red-300">
            Enter a value between {min} and {max}.
          </p>
        )}
      </div>
    </div>
  );
}

type SwitchRowProps = {
  label: string;
  tooltip: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function SwitchRow({ label, tooltip, checked, onChange }: SwitchRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <Label label={label} tooltip={tooltip} />
      <button
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? "bg-primary" : "bg-muted"
        }`}
        onClick={() => onChange(!checked)}
        title={tooltip}
        type="button"
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

type ActionRowProps = {
  label: string;
  description: string;
  buttonLabel: string;
  icon: typeof Settings;
  onClick: () => Promise<void>;
};

function ActionRow({ label, description, buttonLabel, icon: Icon, onClick }: ActionRowProps) {
  const [isBusy, setIsBusy] = useState(false);

  async function runAction() {
    setIsBusy(true);
    try {
      await onClick();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <Label label={label} tooltip={description} description={description} />
      <button
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        disabled={isBusy}
        onClick={() => void runAction()}
      >
        <Icon className="h-4 w-4" />
        {isBusy ? "Working…" : buttonLabel}
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 p-4 sm:grid-cols-[1fr_260px]">
      <Label label={label} tooltip={label} />
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <span className="truncate" title={value}>
          {value}
        </span>
      </div>
    </div>
  );
}

function Label({
  label,
  tooltip,
  description,
}: {
  label: string;
  tooltip: string;
  description?: string;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 font-medium" title={tooltip}>
        {label}
        <Braces className="h-3.5 w-3.5 text-foreground/35" />
      </div>
      {description && <p className="mt-1 text-xs text-foreground/55">{description}</p>}
    </div>
  );
}

function validateSettings(settings: IceScopeSettings) {
  const errors: string[] = [];
  if (!inRange(settings.dataExplorer.defaultPageSize, 10, 1_000)) {
    errors.push("Default page size must be between 10 and 1,000.");
  }
  if (!inRange(settings.dataExplorer.maxQueryRows, 100, 1_000_000)) {
    errors.push("Max query rows must be between 100 and 1,000,000.");
  }
  if (!inRange(settings.queryEditor.fontSize, 11, 24)) {
    errors.push("Editor font size must be between 11 and 24.");
  }
  if (!inRange(settings.cache.cacheDurationMinutes, 1, 1_440)) {
    errors.push("Cache duration must be between 1 and 1,440 minutes.");
  }
  return errors;
}

function inRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}
