import { useState } from "react";
import { Logo } from "./ui";
import {
  LayoutGrid,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  Cpu,
  Settings,
  Sliders,
  BookOpen,
  Megaphone,
  Bug,
  LogOut,
  LifeBuoy,
  ChevronDown,
  ChevronRight,
  Sigma,
  Activity,
  UserCircle,
} from "./icons";

export const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "platformteam", label: "Platform Team", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "aimonitor", label: "AI Monitor", icon: Cpu },
  { id: "audit", label: "Activity & Audit Log", icon: Activity },
];

export const SETTINGS_NAV = [
  { id: "featureflags", label: "Feature Flags", icon: Sliders },
  { id: "dfsconfig", label: "DFS Configuration", icon: Sigma },
  { id: "skilllibrary", label: "Skill Library", icon: BookOpen },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "reportedissues", label: "Reported Issues", icon: Bug },
  { id: "profile", label: "My Profile", icon: UserCircle },
];

export function Sidebar({ page, setPage, onSupport, onLogout, mobileOpen, onClose }) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const isSettingsPage = SETTINGS_NAV.some((s) => s.id === page);

  return (
    <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 admin-sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="p-5">
        <Logo />
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = page === n.id;
          return (
            <button
              key={n.id}
              onClick={() => { setPage(n.id); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700 border-l-2 border-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={17} />
              {n.label}
            </button>
          );
        })}

        <button
          onClick={() => setSettingsOpen((s) => !s)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isSettingsPage
              ? "bg-indigo-50 text-indigo-700"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="flex items-center gap-3">
            <Settings size={17} />
            Settings
          </span>
          {settingsOpen ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>
        {settingsOpen && (
          <div className="pl-4 space-y-1">
            {SETTINGS_NAV.map((n) => {
              const Icon = n.icon;
              const active = page === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => { setPage(n.id); onClose?.(); }}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    active
                      ? "text-indigo-700 font-semibold"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={15} />
                  {n.label}
                </button>
              );
            })}
          </div>
        )}
      </nav>
      <div className="p-3 border-t border-slate-100 space-y-1">
        <button onClick={() => { onSupport(); onClose?.(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <LifeBuoy size={17} />
          Support
        </button>
        <button onClick={() => { onLogout(); onClose?.(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50">
          <LogOut size={17} />
          Log out
        </button>
      </div>
    </aside>
  );
}
