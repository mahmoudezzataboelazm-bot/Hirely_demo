import { useEffect, useMemo, useState } from "react";
import { getPlatformUsers, setPlatformUserStatus } from "../../services/hirelyBridge";
import { Card, Badge, Dot, PageHeader } from "../components/ui";
import { MoreVertical, Search, Ban, RotateCcw, Eye } from "../components/icons";

const PAGE_SIZE = 6;

export default function Users({ toast }) {
  // Real users across the platform: the company team (admins + recruiters)
  // and registered applicants, read from the shared store.
  const [rows, setRows] = useState(() => getPlatformUsers());
  useEffect(() => {
    const sync = () => setRows(getPlatformUsers());
    window.addEventListener("hirely-team-change", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("hirely-team-change", sync); window.removeEventListener("storage", sync); };
  }, []);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState(null);
  const [details, setDetails] = useState(null);

  const filtered = useMemo(() => rows.filter((r) => {
    const q = query.trim().toLowerCase();
    const matchesSearch = !q || `${r.name} ${r.email} ${r.role} ${r.company} ${r.status}`.toLowerCase().includes(q);
    const matchesRole = roleFilter === "All roles" || r.role === roleFilter;
    const matchesStatus = statusFilter === "All statuses" || r.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  }), [rows, query, roleFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const changeStatus = (id, status) => {
    // Deactivating here also flips the member's status on the company's
    // Team page — one user record, two views.
    setPlatformUserStatus(id, status);
    setRows(getPlatformUsers());
    setActionId(null);
    toast(status === "Active" ? "User activated" : "User deactivated");
  };

  return (
    <div className="admin-page">
      <PageHeader title="Users" subtitle="View and manage users across all Hirely companies and roles." />
      <Card>
        <div className="admin-toolbar users-toolbar">
          <div className="search-field users-search"><Search size={15} /><input aria-label="Search users" placeholder="Search users, companies or roles..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></div>
          <div className="users-filters">
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}><option>All roles</option><option>Company Admin</option><option>Recruiter</option><option>Applicant</option></select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}><option>All statuses</option><option>Active</option><option>Pending</option><option>Inactive</option></select>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table users-table">
            <thead><tr><th>User</th><th>Role</th><th>Company</th><th>Last active</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td><div className="company-name">{r.name}</div><div className="muted small-text">{r.email}</div></td>
                  <td><Badge tone={r.role === "Company Admin" ? "indigo" : r.role === "Recruiter" ? "amber" : "slate"}>{r.role}</Badge></td>
                  <td className="muted">{r.company}</td>
                  <td className="muted">{r.lastActive}</td>
                  <td><span className={`status-text ${r.status === "Active" ? "active" : "inactive"}`}><Dot tone={r.status === "Active" ? "emerald" : "slate"} />{r.status}</span></td>
                  <td className="action-cell">
                    <button className="icon-action" title="User actions" onClick={() => setActionId(actionId === r.id ? null : r.id)}><MoreVertical size={16} /></button>
                    {actionId === r.id && <div className="action-menu">
                      <button onClick={() => { setDetails(r); setActionId(null); }}><Eye size={14} />View details</button>
                      {r.status === "Active" ? <button onClick={() => changeStatus(r.id, "Inactive")}><Ban size={14} />Deactivate</button> : <button onClick={() => changeStatus(r.id, "Active")}><RotateCcw size={14} />Activate</button>}
                    </div>}
                  </td>
                </tr>
              ))}
              {!visible.length && <tr><td colSpan="6" className="empty-state">No users match your search or filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer users-footer"><span>{filtered.length ? `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length} users` : "0 users"}</span><div className="pagination"><button disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button><span>Page {safePage} of {pageCount}</span><button disabled={safePage === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</button></div></div>
      </Card>

      {details && <div className="user-details-backdrop" onClick={() => setDetails(null)}><div className="user-details-card" onClick={(e) => e.stopPropagation()}><div className="user-details-head"><div><div className="company-name">{details.name}</div><div className="muted small-text">{details.email}</div></div><button className="icon-action" onClick={() => setDetails(null)}>×</button></div><div className="details-grid"><div><span>Role</span><strong>{details.role}</strong></div><div><span>Status</span><strong>{details.status}</strong></div><div><span>Company</span><strong>{details.company}</strong></div><div><span>Last active</span><strong>{details.lastActive}</strong></div></div></div></div>}
    </div>
  );
}
