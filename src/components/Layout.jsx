import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, HelpCircle, Search, Grid2X2, BriefcaseBusiness, GitBranch, Users, BarChart3, UserRoundSearch, UserRoundCog, CreditCard, Megaphone, LogOut, Settings, Menu, X, Building2, Cpu } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";

const companyNav = [
  ["Dashboard", "/dashboard", Grid2X2], ["Jobs", "/jobs", BriefcaseBusiness], ["Pipeline", "/pipeline", GitBranch],
  ["Candidates", "/candidates", Users], ["Analytics", "/analytics", BarChart3], ["Talent Pool", "/talent-pool", UserRoundSearch],
  ["Team", "/team", UserRoundCog, "company-admin"], ["Billing", "/billing", CreditCard, "company-admin"], ["Announcements", "/announcements", Megaphone]
];
const adminNav = [["Organizations", "/super-admin/organizations", Building2], ["Platform Analytics", "/super-admin/analytics", BarChart3], ["AI & API Monitor", "/super-admin/ai-monitor", Cpu]];
const applicantNav = [["Browse Jobs", "/browse-jobs", BriefcaseBusiness], ["My Applications", "/my-applications", GitBranch], ["My Profile", "/applicant-profile", Settings]];

export default function Layout({ children }) {
  const { user, roleLabel } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const nav = user?.role === "super-admin" ? adminNav : user?.role === "applicant" ? applicantNav : companyNav;

  return <div className="app-shell">
    <aside className={`sidebar ${open ? "mobile-open" : ""}`}>
      <div className="brand"><div className="brand-mark">H</div><div><b>Hirely ATS</b><small>RECRUITMENT PORTAL</small></div><button className="icon-btn mobile-close" onClick={() => setOpen(false)}><X size={18} /></button></div>
      <nav>{nav.filter(x => !x[3] || x[3] === user?.role).map(([label, path, Icon]) => <NavLink key={path} to={path} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} onClick={() => setOpen(false)}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom">
        {user?.role !== "super-admin" && user?.role !== "applicant" && <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><Settings size={18} /><span>My Profile</span></NavLink>}
        <button className="nav-item" onClick={() => navigate("/login")}><LogOut size={18} /><span>Logout</span></button>
      </div>
    </aside>
    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
        <div className="global-search"><Search size={17} /><input placeholder={location.pathname === "/announcements" ? "Search announcements..." : user?.role === "applicant" ? "Search jobs..." : "Search candidates, jobs, or actions..."} /></div>
        <div className="top-actions"><button className="icon-btn"><Bell size={19} /></button><button className="icon-btn"><HelpCircle size={19} /></button><div className="profile-mini"><div className="avatar">{user?.name?.slice(0, 1) || "H"}</div><div><b>{user?.name}</b><small>{roleLabel}</small></div></div></div>
      </header>
      <section className="page">{children}</section>
    </main>
  </div>;
}
