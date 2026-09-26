import { useMemo, useState } from "react";
import { Search, Bell, HelpCircle, X, LifeBuoy, Building2, CreditCard, Bug, Cpu, Menu } from "./icons";

const SEARCH_ITEMS = [
  { page: "dashboard", title: "Dashboard", keywords: "overview stats revenue health signups activity" },
  { page: "companies", title: "Companies", keywords: "tenants organizations company suspend reinstate impersonate" },
  { page: "users", title: "Users", keywords: "all users search activate deactivate roles companies applicants recruiters" },
  { page: "platformteam", title: "Platform Team", keywords: "internal Hirely staff super admin team members" },
  { page: "subscriptions", title: "Subscriptions", keywords: "billing plans revenue discount trial payment" },
  { page: "analytics", title: "Analytics", keywords: "growth MRR churn hiring statistics reports" },
  { page: "aimonitor", title: "AI Monitor", keywords: "Gemini API usage costs cap AI" },
  { page: "featureflags", title: "Feature Flags", keywords: "tiers features access flags" },
  { page: "dfsconfig", title: "DFS Configuration", keywords: "scoring weights configuration audit" },
  { page: "skilllibrary", title: "Skill Library", keywords: "skills taxonomy AI resume parsing" },
  { page: "announcements", title: "Announcements", keywords: "broadcast communication companies" },
  { page: "reportedissues", title: "Reported Issues", keywords: "bugs flagged content support issues" },
  { page: "audit", title: "Activity & Audit Log", keywords: "activity audit history login logs" },
  { page: "profile", title: "My Profile", keywords: "account password security photo" },
  { page: "support", title: "Support Center", keywords: "help contact support assistance documentation" },
];

const GLOBAL_TARGETS = [
  { page: "companies", title: "NexaTech Solutions", keywords: "company tenant Fintech Enterprise Plus active" },
  { page: "companies", title: "AI Global Corp", keywords: "company tenant Artificial Intelligence Growth trial" },
  { page: "companies", title: "Zylker Media Group", keywords: "company tenant Media Starter suspended" },
  { page: "companies", title: "EcoLife Retailers", keywords: "company tenant Retail Enterprise expired" },
  { page: "platformteam", title: "Sarah Al-Farsi", keywords: "platform team super admin" },
  { page: "platformteam", title: "Omar Khalid", keywords: "platform team super admin" },
  { page: "platformteam", title: "Leila Mansour", keywords: "platform team super admin inactive" },
  { page: "platformteam", title: "Hassan Zaid", keywords: "platform team super admin" },
];

export function Header({ setPage, onLogout, onMenu }) {
  const [query, setQuery] = useState("");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "New company registered", text: "A new tenant completed registration.", icon: Building2, tone: "indigo", unread: true, page: "companies" },
    { id: 2, title: "Subscription expiring", text: "A company subscription expires soon.", icon: CreditCard, tone: "amber", unread: true, page: "subscriptions" },
    { id: 3, title: "Reported issue", text: "A new platform issue needs review.", icon: Bug, tone: "rose", unread: true, page: "reportedissues" },
    { id: 4, title: "AI budget alert", text: "Gemini API usage is approaching the monthly cap.", icon: Cpu, tone: "amber", unread: false, page: "aimonitor" },
  ]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [...SEARCH_ITEMS, ...GLOBAL_TARGETS].filter((item) => `${item.title} ${item.keywords}`.toLowerCase().includes(q)).slice(0, 9);
  }, [query]);

  const unread = notifications.filter((n) => n.unread).length;
  const go = (page) => { setPage(page); setQuery(""); };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 relative admin-header">
      <div className="header-left"><button className="mobile-menu-button" aria-label="Open navigation" onClick={onMenu}><Menu size={20} /></button><div className="global-search-wrap">
        <div className="global-search-box">
          <Search size={16} className="text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search across the platform…" />
          {query && <button onClick={() => setQuery("")}><X size={14} /></button>}
        </div>
        {query && <div className="global-search-results">
          {results.length ? results.map((r) => <button key={`${r.page}-${r.title}`} onClick={() => go(r.page)}><Search size={14} /><span>{r.title}</span></button>) : <div className="global-search-empty">No matching pages or platform areas.</div>}
        </div>}
      </div></div>
      <div className="flex items-center gap-4 header-right">
        <div className="header-popover-wrap">
          <button className="header-icon-btn relative" title="Notifications" onClick={() => { setNoticeOpen(!noticeOpen); setHelpOpen(false); setSupportOpen(false); }}>
            <Bell size={19} className="text-slate-500" />{unread > 0 && <span className="notification-count">{unread}</span>}
          </button>
          {noticeOpen && <div className="header-popover notification-popover">
            <div className="popover-head"><strong>Notifications</strong><button onClick={() => setNotifications((list) => list.map((n) => ({ ...n, unread: false })))}>Mark all read</button></div>
            {notifications.map((n) => { const Icon = n.icon; return <button className={`notification-item ${n.unread ? "unread" : ""}`} key={n.id} onClick={() => { setNotifications((list) => list.map((x) => x.id === n.id ? { ...x, unread: false } : x)); go(n.page); setNoticeOpen(false); }}><span className={`notification-icon ${n.tone}`}><Icon size={15} /></span><span><strong>{n.title}</strong><small>{n.text}</small></span></button>; })}
          </div>}
        </div>
        <div className="header-popover-wrap">
          <button className="header-icon-btn" title="Help" onClick={() => { setHelpOpen(!helpOpen); setNoticeOpen(false); setSupportOpen(false); }}><HelpCircle size={19} className="text-slate-500" /></button>
          {helpOpen && <div className="header-popover small-popover"><div className="popover-head"><strong>Help & Support</strong><button onClick={() => setHelpOpen(false)}><X size={14} /></button></div><button onClick={() => { go("support"); setHelpOpen(false); }}>Platform documentation</button><button onClick={() => { go("support"); setHelpOpen(false); }}>Contact support</button></div>}
        </div>
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200 cursor-pointer" onClick={() => go("profile")} title="My Profile">
          <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold">NS</div>
          <div className="text-sm leading-tight"><div className="font-semibold text-slate-900">Nadia Suleiman</div><div className="text-xs text-slate-400">Super Admin</div></div>
        </div>
      </div>
      {(supportOpen) && <div className="header-popover support-popover"><div className="popover-head"><strong><LifeBuoy size={15} /> Support Center</strong><button onClick={() => setSupportOpen(false)}><X size={14} /></button></div><div className="support-item"><strong>Help & documentation</strong><span>Find guidance for Companies, Billing, AI Monitor, DFS and other platform administration areas.</span></div><button className="support-link" onClick={() => { go("support"); setSupportOpen(false); }}><LifeBuoy size={14} /> Open Support Center</button><div className="support-status"><span className="status-dot" /> All systems operational</div></div>}
    </header>
  );
}
