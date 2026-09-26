import { useEffect, useMemo, useState } from "react";
import { getTenants, setTenantStatus, deleteTenant } from "../../services/hirelyBridge";
import { Card, Badge, Dot, PageHeader } from "../components/ui";
import { Modal } from "../components/Modal";
import { MoreVertical, LogIn, Ban, Mail, Trash2, X, RotateCcw, Search, Eye } from "../components/icons";

const PAGE_SIZE = 5;

const TONE = { Active: "emerald", Trial: "amber", Suspended: "rose", Expired: "slate", Deleted: "slate" };

function toRows(tenants) {
  return tenants.map((t) => ({
    id: t.id,
    name: t.name,
    tag: t.industry,
    email: t.email,
    website: t.website,
    employees: t.size,
    plan: t.plan,
    seats: t.seatsUsed + " / " + t.seatLimit,
    pct: t.seatLimit ? Math.min(100, Math.round((t.seatsUsed / t.seatLimit) * 100)) : 0,
    joined: t.joined,
    status: t.status,
    tone: TONE[t.status] || "slate",
    jobs: t.jobs,
    applications: t.applications,
    isLocal: t.isLocal,
  }));
}


export default function Companies({ toast }) {
  // Live tenants from the platform store. The first row is the real
  // workspace in this session — its counts come from the shared job and
  // application data, so the numbers always match the company portal.
  const [rows, setRows] = useState(() => toRows(getTenants()));
  const refresh = () => setRows(toRows(getTenants()));
  useEffect(() => {
    const sync = () => refresh();
    window.addEventListener("hirely-company-change", sync);
    window.addEventListener("hirely-jobs-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("hirely-company-change", sync);
      window.removeEventListener("hirely-jobs-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const [selected, setSelected] = useState({});
  const [actionCompany, setActionCompany] = useState(null);
  const [detailsCompany, setDetailsCompany] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(null); // { ids, status }
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesTab = tab === "All" || r.status === tab;
      const matchesSearch = !q || [r.name, r.tag, r.email, r.plan, r.status].some((value) => String(value).toLowerCase().includes(q));
      return matchesTab && matchesSearch;
    });
  }, [rows, tab, search]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const selectedRows = rows.filter((r) => selectedIds.includes(String(r.id)));
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => selected[r.id]);

  const changeTab = (next) => { setTab(next); setPage(1); setSelected({}); setActionCompany(null); };
  const changeSearch = (value) => { setSearch(value); setPage(1); setSelected({}); setActionCompany(null); };
  const toggleSelected = (id, checked) => setSelected((current) => ({ ...current, [id]: checked }));
  const toggleAllVisible = (checked) => setSelected((current) => { const next = { ...current }; visibleRows.forEach((r) => { next[r.id] = checked; }); return next; });

  const handleImpersonate = (company = selectedRows[0]) => {
    if (!company) return;
    if (company.isLocal) { window.location.href = "/dashboard"; return; }
    toast("Impersonating " + company.name + " requires a backend session swap (POST /platform/tenants/:id/impersonate).");
    setActionCompany(null);
  };
  // Opens the confirm modal instead of acting immediately.
  const askStatus = (ids, status) => { setStatusConfirm({ ids, status }); setActionCompany(null); };
  const confirmStatus = () => {
    if (!statusConfirm) return;
    const { ids, status } = statusConfirm;
    // DEP-01: suspending revokes access for the company admin and recruiter
    // and hides that tenant's jobs from applicants immediately.
    ids.forEach((id) => setTenantStatus(id, status));
    refresh();
    toast(ids.length + " company account(s) " + (status === "Active" ? "reinstated" : "suspended"));
    setSelected({}); setStatusConfirm(null);
  };
  const handleEmail = (company = selectedRows[0]) => { if (!company) return; window.location.href = `mailto:${company.email}?subject=${encodeURIComponent("Regarding your Hirely account")}`; };
  const handleDelete = () => {
    if (!window.confirm("This archives all jobs and applications and removes " + selectedIds.length + " company account(s). Continue?")) return;
    // DEP-08 / DEP-01: jobs and applications are archived and applicants in
    // active stages are notified — nothing is silently destroyed.
    selectedIds.forEach((id) => deleteTenant(id));
    refresh();
    toast(selectedIds.length + " company account(s) archived and removed");
    setSelected({}); setDeleteConfirm(false); setPage(1);
  };

  return <div className="admin-page">
    <PageHeader title="Companies" subtitle="Every tenant on Hirely — suspend, reinstate, or open a company's workspace directly." />
    <Card>
      <div className="admin-tabs">{["All", "Active", "Suspended", "Trial", "Expired"].map((t) => <button key={t} className={`admin-tab ${tab === t ? "active" : ""}`} onClick={() => changeTab(t)}>{t}<span>{t === "All" ? rows.length : rows.filter((r) => r.status === t).length}</span></button>)}</div>
      <div className="admin-toolbar">
        <div className="search-field"><Search size={15} /><input aria-label="Search companies" placeholder="Search companies..." value={search} onChange={(e) => changeSearch(e.target.value)} /></div>
        {search && <button className="clear-search" onClick={() => changeSearch("")}>Clear</button>}
      </div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th className="check-col"><input type="checkbox" checked={allVisibleSelected} onChange={(e) => toggleAllVisible(e.target.checked)} /></th><th>Company</th><th>Plan</th><th>Seats usage</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {visibleRows.map((r) => <tr key={r.id}>
          <td><input type="checkbox" checked={!!selected[r.id]} onChange={(e) => toggleSelected(r.id, e.target.checked)} /></td>
          <td><div className="company-name">{r.name}</div><Badge>{r.tag}</Badge></td><td><Badge tone="indigo">{r.plan}</Badge></td>
          <td className="seat-cell"><div className="seat-label"><span>{r.seats}</span><span>{r.pct}%</span></div><div className="seat-bar"><div className={`seat-fill ${r.pct > 90 ? "danger" : r.pct > 50 ? "ok" : "warn"}`} style={{ width: `${r.pct}%` }} /></div></td>
          <td className="muted">{r.joined}</td><td><Badge tone={r.tone}><Dot tone={r.tone} />{r.status}</Badge></td>
          <td className="action-cell"><button className="icon-action" title="Company actions" onClick={() => setActionCompany(actionCompany?.id === r.id ? null : r)}><MoreVertical size={16} /></button>{actionCompany?.id === r.id && <div className="action-menu">
            <button onClick={() => { setDetailsCompany(r); setActionCompany(null); }}><Eye size={14} />View details</button><button onClick={() => handleImpersonate(r)}><LogIn size={14} />Impersonate</button>{r.status === "Suspended" ? <button onClick={() => askStatus([r.id], "Active")}><RotateCcw size={14} />Reinstate</button> : <button onClick={() => askStatus([r.id], "Suspended")}><Ban size={14} />Suspend</button>}<button onClick={() => handleEmail(r)}><Mail size={14} />Email owner</button><button className="danger-action" onClick={() => { setSelected({ [r.id]: true }); setDeleteConfirm(true); setActionCompany(null); }}><Trash2 size={14} />Delete</button>
          </div>}</td>
        </tr>)}
        {visibleRows.length === 0 && <tr><td colSpan="7" className="empty-state">No companies match your search or status filter.</td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>Showing {filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} companies</span><div className="pagination"><button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>Next</button></div></div>
    </Card>
    {selectedIds.length > 0 && <div className="bulk-bar"><span className="selection-count">{selectedIds.length}</span><span>selected</span><button onClick={() => handleImpersonate()}><LogIn size={14} />Impersonate</button><button onClick={() => askStatus(selectedIds, "Suspended")}><Ban size={14} />Suspend</button><button onClick={() => handleEmail()}><Mail size={14} />Email owner</button><button className="danger-action" onClick={() => setDeleteConfirm(true)}><Trash2 size={14} />Delete</button><button className="close-bulk" onClick={() => setSelected({})}><X size={16} /></button></div>}
    <Modal open={!!detailsCompany} onClose={() => setDetailsCompany(null)} title={detailsCompany ? detailsCompany.name : "Company details"} footer={<button className="modal-secondary-btn" onClick={() => setDetailsCompany(null)}>Close</button>}>{detailsCompany && <div className="details-grid"><div><span>Industry</span><strong>{detailsCompany.tag}</strong></div><div><span>Status</span><strong>{detailsCompany.status}</strong></div><div><span>Company email</span><strong>{detailsCompany.email}</strong></div><div><span>Website</span><strong>{detailsCompany.website}</strong></div><div><span>Employees</span><strong>{detailsCompany.employees}</strong></div><div><span>Subscription</span><strong>{detailsCompany.plan}</strong></div><div><span>Seats</span><strong>{detailsCompany.seats}</strong></div><div><span>Joined</span><strong>{detailsCompany.joined}</strong></div><div><span>Jobs</span><strong>{detailsCompany.jobs}</strong></div><div><span>Applications</span><strong>{detailsCompany.applications}</strong></div></div>}</Modal>
    <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Delete company" footer={<><button className="modal-secondary-btn" onClick={() => setDeleteConfirm(false)}>Cancel</button><button className="modal-danger-btn" onClick={handleDelete}>Delete company</button></>}><p className="modal-copy">This permanently archives and removes the selected company from the platform.</p></Modal>
    <Modal
      open={!!statusConfirm}
      onClose={() => setStatusConfirm(null)}
      title={statusConfirm?.status === "Active" ? "Reinstate company account(s)" : "Suspend company account(s)"}
      footer={<>
        <button className="modal-secondary-btn" onClick={() => setStatusConfirm(null)}>Cancel</button>
        <button className={statusConfirm?.status === "Active" ? "modal-success-btn" : "modal-danger-btn"} onClick={confirmStatus}>
          {statusConfirm?.status === "Active" ? "Reinstate" : "Suspend"} {statusConfirm?.ids.length > 1 ? `${statusConfirm.ids.length} companies` : "company"}
        </button>
      </>}
    >
      <p className="modal-copy">
        {statusConfirm?.status === "Active"
          ? "This restores full workspace access for the Company Admin and Recruiter, and their published jobs return to Browse Jobs immediately."
          : "This immediately blocks the Company Admin and Recruiter from the workspace, and hides their published jobs from applicants until reinstated."}
      </p>
    </Modal>
  </div>;
}
