import { useEffect, useMemo, useState } from "react";
import { getPlatformTeam, savePlatformTeam } from "../../services/hirelyBridge";
import { Card, Badge, Dot, PageHeader, PrimaryButton, GhostButton } from "../components/ui";
import { Modal, Field } from "../components/Modal";
import { Plus, MoreVertical, Pencil, Ban, Trash2, RotateCcw, X, Search } from "../components/icons";

const PAGE_SIZE = 5;

export default function PlatformTeam({ toast }) {
  // Persisted so edits survive navigating away and back or a reload —
  // previously this reset to the seed list every time the page remounted.
  const [rows, setRowsState] = useState(() => getPlatformTeam());
  const setRows = (updater) => setRowsState((current) => {
    const next = typeof updater === "function" ? updater(current) : updater;
    savePlatformTeam(next);
    return next;
  });
  useEffect(() => {
    const sync = () => setRowsState(getPlatformTeam());
    window.addEventListener("hirely-platform-team-change", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("hirely-platform-team-change", sync); window.removeEventListener("storage", sync); };
  }, []);
  const [open, setOpen] = useState(false), [actionUser, setActionUser] = useState(null), [editUser, setEditUser] = useState(null), [selected, setSelected] = useState({}), [filter, setFilter] = useState("All"), [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const [form, setForm] = useState({ name: "", email: "" });
  const filteredRows = useMemo(() => { const q = search.trim().toLowerCase(); return rows.filter((r) => { const matchesFilter = filter === "All" || r.role === filter || (filter === "Inactive" && r.status === "Inactive"); const matchesSearch = !q || [r.name, r.email, r.role, r.status].some((v) => String(v).toLowerCase().includes(q)); return matchesFilter && matchesSearch; }); }, [rows, filter, search]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE)); const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE); const selectedIds = Object.keys(selected).filter((email) => selected[email]); const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => selected[r.email]);
  const reset = () => { setPage(1); setSelected({}); setActionUser(null); };
  const setFilterAndReset = (value) => { setFilter(value); reset(); }; const changeSearch = (value) => { setSearch(value); reset(); };
  const toggleAll = (checked) => setSelected((current) => { const next = { ...current }; visibleRows.forEach((r) => { next[r.email] = checked; }); return next; });
  const handleAdd = (e) => { e.preventDefault(); if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) return; if (rows.some((r) => r.email.toLowerCase() === form.email.toLowerCase())) return toast("A team member with this email already exists."); setRows((current) => [...current, { ...form, name: form.name.trim(), email: form.email.trim(), role: "Super Admin", tone: "indigo", active: "just now", status: "Active" }]); setOpen(false); setForm({ name: "", email: "" }); toast(`Invitation sent to ${form.email}`); };
  const updateUsers = (emails, updater, message) => { setRows((current) => current.map((r) => emails.includes(r.email) ? updater(r) : r)); setSelected({}); setActionUser(null); toast(message); };
  const changeMember = (member) => { setEditUser(member); setForm({ name: member.name, email: member.email }); setActionUser(null); };
  const saveMember = (e) => { e.preventDefault(); if (!editUser) return; updateUsers([editUser.email], (r) => ({ ...r, name: form.name.trim() || r.name }), `${editUser.name} updated`); setEditUser(null); setForm({ name: "", email: "" }); };
  const deactivate = (emails) => { if (!window.confirm(`Deactivate ${emails.length} selected member${emails.length > 1 ? "s" : ""}?`)) return; const activeSupers = rows.filter((r) => r.role === "Super Admin" && r.status === "Active").map((r) => r.email); if (emails.some((email) => activeSupers.includes(email)) && activeSupers.length === 1) return toast("At least one active Super Admin must remain."); updateUsers(emails, (r) => ({ ...r, status: "Inactive" }), `${emails.length} member${emails.length > 1 ? "s" : ""} deactivated`); };
  const activate = (email) => updateUsers([email], (r) => ({ ...r, status: "Active", active: "just now" }), "Member activated");
  const remove = (emails) => {
    if (!window.confirm(`Remove ${emails.length} selected member${emails.length > 1 ? "s" : ""} permanently from the platform team?`)) return;
    const remainingActiveSupers = rows.filter((r) => r.role === "Super Admin" && r.status === "Active" && !emails.includes(r.email)).length;
    const removingActiveSuper = emails.some((email) => rows.find((r) => r.email === email)?.role === "Super Admin" && rows.find((r) => r.email === email)?.status === "Active");
    if (removingActiveSuper && remainingActiveSupers === 0) return toast("At least one active Super Admin must remain.");
    setRows((current) => current.filter((r) => !emails.includes(r.email)));
    setSelected({}); setActionUser(null);
    toast(`${emails.length} member${emails.length > 1 ? "s" : ""} removed`);
  };

  return <div className="admin-page"><PageHeader title="Platform team" subtitle="Internal Hirely staff accounts. All platform team members use the Super Admin role." action={<PrimaryButton icon={Plus} onClick={() => setOpen(true)}>Add team member</PrimaryButton>} /><Card>
    <div className="admin-toolbar platform-team-toolbar"><div className="filter-group">{["All", "Inactive"].map((t) => <button key={t} className={`filter-chip ${filter === t ? "active" : ""}`} onClick={() => setFilterAndReset(t)}>{t}</button>)}</div><div className="search-field"><Search size={15} /><input aria-label="Search platform team" placeholder="Search team members..." value={search} onChange={(e) => changeSearch(e.target.value)} />{search && <button className="clear-search" onClick={() => changeSearch("")}>Clear</button>}</div></div>
    {selectedIds.length > 0 && <div className="bulk-inline"><span>{selectedIds.length} selected</span><button onClick={() => deactivate(selectedIds)}><Ban size={14} />Deactivate</button><button className="danger-action" onClick={() => remove(selectedIds)}><Trash2 size={14} />Remove</button><button onClick={() => setSelected({})}><X size={15} /></button></div>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th className="check-col"><input type="checkbox" checked={allVisibleSelected} onChange={(e) => toggleAll(e.target.checked)} /></th><th>Name & identity</th><th>Role</th><th>Last active</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleRows.map((r) => <tr key={r.email}><td><input type="checkbox" checked={!!selected[r.email]} onChange={(e) => setSelected((s) => ({ ...s, [r.email]: e.target.checked }))} /></td><td><div className="company-name">{r.name}</div><div className="muted small-text">{r.email}</div></td><td><Badge tone={r.tone}>{r.role}</Badge></td><td className="muted">{r.active}</td><td><span className={`status-text ${r.status === "Active" ? "active" : "inactive"}`}><Dot tone={r.status === "Active" ? "emerald" : "slate"} />{r.status}</span></td><td className="action-cell"><button className="icon-action" title="Member actions" onClick={() => setActionUser(actionUser?.email === r.email ? null : r)}><MoreVertical size={16} /></button>{actionUser?.email === r.email && <div className="action-menu"><button onClick={() => changeMember(r)}><Pencil size={14} />Edit member</button>{r.status === "Active" ? <button onClick={() => deactivate([r.email])}><Ban size={14} />Deactivate</button> : <button onClick={() => activate(r.email)}><RotateCcw size={14} />Activate</button>}<button className="danger-action" onClick={() => remove([r.email])}><Trash2 size={14} />Remove</button></div>}</td></tr>)}{visibleRows.length === 0 && <tr><td colSpan="6" className="empty-state">No platform team members match your search or filter.</td></tr>}</tbody></table></div>
    <div className="table-footer"><span>Showing {filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} platform team members</span><div className="pagination"><button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>Next</button></div></div>
  </Card><Modal open={open} onClose={() => setOpen(false)} title="Add team member" footer={<PrimaryButton onClick={handleAdd}>Send invitation</PrimaryButton>}><Field label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Field label="Work email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Modal><Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit team member" footer={<><GhostButton onClick={() => setEditUser(null)}>Cancel</GhostButton><PrimaryButton onClick={saveMember}>Save changes</PrimaryButton></>}><Field label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Field label="Work email" value={form.email} disabled /></Modal></div>;
}
