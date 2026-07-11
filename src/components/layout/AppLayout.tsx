import { Database, Home, Moon, PanelLeftClose, Search, Settings, Sun, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../../platform/tauri";
import { useAppStore } from "../../stores/appStore";
import { ToastViewport } from "../ui/ToastViewport";
import type { ConnectionProfile } from "../../types";

const navItems = [
  { to: "/explorer", label: "Explorer", icon: Search },
  { to: "/sql", label: "SQL Lab", icon: Terminal },
  { to: "/overview", label: "Overview", icon: Home },
  { to: "/connections", label: "Connections", icon: Database },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout() {
  const { activeConnectionId, loadSettings, setActiveConnectionId, settings, settingsLoaded, toggleSidebar, toggleTheme } =
    useAppStore();
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia?.("(prefers-color-scheme: dark)").matches,
  );
  const isDark =
    settings.general.theme === "system" ? systemDark : settings.general.theme === "dark";
  const activeConnectionName =
    connections.find((connection) => connection.id === activeConnectionId)?.name ?? null;

  useEffect(() => {
    if (!settingsLoaded) void loadSettings();
  }, [loadSettings, settingsLoaded]);

  useEffect(() => {
    void api
      .listConnections()
      .then((nextConnections) => {
        setConnections(nextConnections);

        const activeConnectionExists = nextConnections.some(
          (connection) => connection.id === activeConnectionId,
        );
        if ((!activeConnectionId || !activeConnectionExists) && nextConnections[0]) {
          setActiveConnectionId(nextConnections[0].id);
        }
      })
      .catch(() => setConnections([]));
  }, [activeConnectionId, setActiveConnectionId]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="flex min-h-screen bg-background text-foreground">
        <aside
          className={`border-r border-border bg-muted/40 p-3 transition-all ${
            settings.sidebarCollapsed ? "w-20" : "w-64"
          }`}
        >
          <div className="mb-6 flex items-center gap-3">
            <img src="/app.png" className="h-9 w-9 rounded-xl object-cover" alt="IceScope" />
            {!settings.sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-semibold">IceScope</h1>
                <p className="text-xs text-foreground/60">Iceberg explorer</p>
              </div>
            )}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    isActive ? "bg-primary text-white" : "hover:bg-background"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {!settings.sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-3">
              <button className="rounded-md p-2 hover:bg-muted" onClick={toggleSidebar}>
                <PanelLeftClose className="h-4 w-4" />
              </button>
              <div className="rounded-md border border-border px-3 py-1.5 text-sm">
                Connection: {activeConnectionName ?? (activeConnectionId ? "Unknown connection" : "None selected")}
              </div>
            </div>
            <button
              className="rounded-md border border-border p-2 hover:bg-muted"
              onClick={toggleTheme}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </header>

          <main className="min-h-0 flex-1 overflow-auto p-4">
            <Outlet />
          </main>
        </div>
        <ToastViewport />
      </div>
    </div>
  );
}
