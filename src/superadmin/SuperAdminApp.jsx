import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ToastStack, useToasts } from "./components/Toast";
import { logAudit, getAuditLog } from "../services/hirelyBridge";
import "./superadmin.css";

import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Users from "./pages/Users";
import PlatformTeam from "./pages/PlatformTeam";
import Subscriptions from "./pages/Subscriptions";
import Analytics from "./pages/Analytics";
import AIMonitor from "./pages/AIMonitor";
import FeatureFlags from "./pages/FeatureFlags";
import DFSConfig from "./pages/DFSConfig";
import SkillLibrary from "./pages/SkillLibrary";
import Announcements from "./pages/Announcements";
import ReportedIssues from "./pages/ReportedIssues";
import Profile from "./pages/Profile";
import AuditLog from "./pages/AuditLog";
import Support from "./pages/Support";

/* =====================================================================
   Super Admin portal.

   Authentication, routing and logout are owned by the main app — this
   component only renders the platform workspace. Every page reads and
   writes through services/hirelyBridge.js (platform layer), the same
   store the Company Admin, Recruiter and Applicant portals use, so
   suspending a tenant, overriding a plan, editing the skill library or
   publishing an announcement is visible to the other roles immediately.
===================================================================== */

export default function SuperAdminApp({ onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [auditVersion, setAuditVersion] = useState(0);
  const { toasts, toast } = useToasts();

  // Every action is toasted for the operator and written to the shared
  // platform audit log (GET /platform/audit-log on the backend).
  const logAction = (message) => {
    logAudit(message);
    setAuditVersion((v) => v + 1);
    toast(message);
  };

  const pages = {
    dashboard: <Dashboard toast={logAction} setPage={setPage} />,
    companies: <Companies toast={logAction} />,
    users: <Users toast={logAction} />,
    platformteam: <PlatformTeam toast={logAction} />,
    subscriptions: <Subscriptions toast={logAction} />,
    analytics: <Analytics toast={logAction} />,
    aimonitor: <AIMonitor toast={logAction} />,
    featureflags: <FeatureFlags toast={logAction} />,
    dfsconfig: <DFSConfig toast={logAction} />,
    skilllibrary: <SkillLibrary toast={logAction} />,
    announcements: <Announcements toast={logAction} />,
    reportedissues: <ReportedIssues toast={logAction} />,
    profile: <Profile toast={logAction} />,
    audit: <AuditLog entries={getAuditLog()} key={auditVersion} />,
    support: <Support setPage={setPage} toast={logAction} />,
  };

  return (
    <div className="superadmin-root">
      <div className="min-h-screen bg-[#F7F7FB] flex text-slate-800 app-shell" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <ToastStack toasts={toasts} />
        <Sidebar page={page} setPage={setPage} onSupport={() => setPage("support")} onLogout={onLogout} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        {mobileNavOpen && <button className="mobile-nav-overlay" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
        <div className="flex-1 flex flex-col min-w-0 app-content">
          <Header setPage={setPage} onLogout={onLogout} onMenu={() => setMobileNavOpen(true)} />
          <main className="p-6 overflow-y-auto flex-1 admin-main">{pages[page]}</main>
        </div>
      </div>
    </div>
  );
}
