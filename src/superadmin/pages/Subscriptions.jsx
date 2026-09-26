import { useEffect, useMemo, useState } from "react";
import { getTenants, overrideTenantPlan, getPlanCatalog, savePlanCatalog, getFeatureFlags, saveFeatureFlags, FEATURES } from "../../services/hirelyBridge";
import {
  Card,
  Badge,
  PageHeader,
  PrimaryButton,
  GhostButton,
} from "../components/ui";
import { Modal, Field, SelectField, TextAreaField } from "../components/Modal";
import { Download, Plus, Check, Pencil, RotateCcw, Trash2 } from "../components/icons";
import { downloadCSV } from "../utils/csv";

const PLAN_OPTIONS = ["Starter", "Growth", "Enterprise"];
const PAGE_SIZE = 8;

const PLAN_TONE = { Starter: "slate", Growth: "indigo", Enterprise: "amber" };

function toRows(tenants) {
  return tenants.map((t) => ({
    co: t.name,
    id: t.id,
    plan: t.plan,
    tone: PLAN_TONE[t.plan] || "slate",
    status: t.status === "Trial" ? "Trial" : t.status === "Expired" ? "Overdue" : t.status,
    renewal: t.joined,
    mrr: `$${Number(t.mrr || 0).toFixed(2)}`,
    trial: t.status === "Trial",
    isLocal: t.isLocal,
  }));
}


export default function Subscriptions({ toast }) {
  // The tier cards are the live plan catalog: price here is what every
  // tenant on that plan is actually billed (services/hirelyBridge.js ->
  // planPrice()), and the edit modal's feature toggles write to the exact
  // same store the Feature Flags page reads — editing a tier here and
  // editing it from Feature Flags both land on hirely_feature_flags.
  const [tiers, setTiersState] = useState(() => getPlanCatalog());
  const setTiers = (updater) => setTiersState((current) => {
    const next = typeof updater === "function" ? updater(current) : updater;
    savePlanCatalog(next);
    return next;
  });

  // Real tenant subscriptions. Overriding a plan here updates that
  // company's Billing page and notifies its admin (DEP-02).
  const [rows, setRows] = useState(() => toRows(getTenants()));
  useEffect(() => {
    const sync = () => setRows(toRows(getTenants()));
    window.addEventListener("hirely-company-change", sync);
    window.addEventListener("hirely-plans-change", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("hirely-company-change", sync); window.removeEventListener("hirely-plans-change", sync); window.removeEventListener("storage", sync); };
  }, []);

  const [newOpen, setNewOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", desc: "" });
  const [editForm, setEditForm] = useState({ price: "", features: "" });
  const [companyAction, setCompanyAction] = useState(null);
  const [actionType, setActionType] = useState("");
  const [actionForm, setActionForm] = useState({ plan: "Growth", reason: "", amount: "10", days: "7" });
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => ({
    mrr: rows.reduce((sum, r) => sum + (Number(String(r.mrr).replace(/[$,]/g, "")) || 0), 0),
    active: rows.filter((r) => r.status === "Active").length,
    overdue: rows.filter((r) => r.status === "Overdue").length,
  }), [rows]);

  const handleExport = () => {
    downloadCSV("hirely-subscriptions.csv", [
      ["Company", "Tenant ID", "Plan", "Status", "Renewal", "MRR"],
      ...rows.map((r) => [r.co, r.id, r.plan, r.status, r.renewal, r.mrr]),
    ]);
    toast("Subscriptions report exported as CSV");
  };

  const handleNewTier = (e) => {
    e?.preventDefault?.();
    if (!form.name.trim()) return toast("Enter a tier name");
    if (tiers.some((t) => t.name.toLowerCase() === form.name.trim().toLowerCase())) return toast("This plan tier already exists");
    setTiers((t) => [...t, { name: form.name.trim(), desc: form.desc, price: form.price || "Custom", period: "/month", features: [] }]);
    setNewOpen(false);
    setForm({ name: "", price: "", desc: "" });
    toast(`"${form.name.trim()}" plan tier created`);
  };

  const handleDeleteTier = (i) => {
    const tier = tiers[i];
    if (rows.some((r) => r.plan === tier.name)) {
      toast(`Cannot delete ${tier.name} while it is assigned to a company`);
      return;
    }
    if (!window.confirm(`Delete the ${tier.name} plan tier? This cannot be undone.`)) return;
    setTiers((current) => current.filter((_, index) => index !== i));
    toast(`"${tier.name}" plan tier deleted`);
  };

  const openEdit = (i) => {
    setEditIdx(i);
    const flags = getFeatureFlags()[tiers[i].name] || {};
    setEditForm({ price: tiers[i].price, features: tiers[i].features.join("\n"), flags });
  };

  const toggleEditFlag = (id) => setEditForm((f) => ({ ...f, flags: { ...f.flags, [id]: f.flags[id] === false ? true : false } }));

  const handleEditSave = () => {
    if (editIdx === null) return;
    setTiers((t) => t.map((tier, i) => i === editIdx ? { ...tier, price: editForm.price || "Custom", features: editForm.features.split("\n").map((x) => x.trim()).filter(Boolean) } : tier));
    // Same store the Feature Flags page writes to — a plan's access limits
    // are defined once, editable from either screen.
    saveFeatureFlags({ ...getFeatureFlags(), [tiers[editIdx].name]: editForm.flags });
    toast(`${tiers[editIdx].name} plan updated`);
    setEditIdx(null);
  };

  const openCompanyAction = (row, type) => {
    setCompanyAction(row);
    setActionType(type);
    setActionForm({ plan: row.plan, reason: "", amount: "10", days: "7" });
  };

  const saveCompanyAction = () => {
    if (!companyAction) return;
    if (actionType !== "reset" && !actionForm.reason.trim()) return toast("Enter a reason for this billing action");
    if (actionType === "reset" && !window.confirm(`Reset the subscription for ${companyAction.co}?`)) return;
    const id = companyAction.id;

    if (actionType === "override") {
      // Writes through to the tenant: new plan, new seat limit, new feature
      // flags, plus a notification on the Company Admin billing page.
      overrideTenantPlan(id, actionForm.plan, actionForm.reason.trim());
      setRows(toRows(getTenants()));
    } else {
      setRows((current) => current.map((r) => {
        if (r.id !== id) return r;
        if (actionType === "discount") return { ...r, discount: `${actionForm.amount}%` };
        if (actionType === "trial") return { ...r, trial: true, trialDays: Number(actionForm.days) || 7, status: "Trial" };
        if (actionType === "reset") return { ...r, discount: undefined, trial: false, status: "Active" };
        return r;
      }));
    }

    const messages = {
      override: `${companyAction.co} moved to ${actionForm.plan} — the company admin has been notified`,
      discount: `${actionForm.amount}% discount applied to ${companyAction.co}`,
      trial: `Trial extended for ${companyAction.co}`,
      reset: `Subscription reset for ${companyAction.co}`,
    };
    toast(messages[actionType]);
    setCompanyAction(null);
  };

  const modalTitle = { override: "Override subscription", discount: "Apply discount", trial: "Extend trial", reset: "Reset subscription" }[actionType];

  return (
    <div>
      <PageHeader title="Subscriptions & billing" subtitle="Manage plan tiers, track MRR, and override a company's billing directly." action={<div className="flex gap-2"><GhostButton icon={Download} onClick={handleExport}>Export report</GhostButton><PrimaryButton icon={Plus} onClick={() => setNewOpen(true)}>New plan tier</PrimaryButton></div>} />

      <div className="subscription-summary">
        <Card><span>Total MRR</span><strong>${totals.mrr.toLocaleString()}</strong></Card>
        <Card><span>Active subscriptions</span><strong>{totals.active}</strong></Card>
        <Card><span>Overdue accounts</span><strong>{totals.overdue}</strong></Card>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {tiers.map((t, i) => (
          <Card key={t.name} className={`p-6 relative ${t.popular ? "border-indigo-600 border-2" : ""}`}>
            {t.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-700 text-white text-xs font-bold px-3 py-1 rounded-full">Most popular</div>}
            <h3 className="font-bold text-slate-900">{t.name}</h3>
            <p className="text-xs text-slate-400 mt-1">{t.desc}</p>
            <div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-bold text-slate-900">{t.price}</span><span className="text-sm text-slate-400">{t.period}</span></div>
            <Badge>{rows.filter((r) => r.plan === t.name).length} active tenant{rows.filter((r) => r.plan === t.name).length === 1 ? "" : "s"}</Badge>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">{t.features.map((f) => <li key={f} className="flex items-center gap-2"><Check size={14} className="text-emerald-600" />{f}</li>)}</ul>
            <div className="plan-tier-actions">
              <button type="button" onClick={() => openEdit(i)} className={`edit-parameters-btn ${t.popular ? "primary" : "secondary"}`}>
                <Pencil size={14} />
                <span>Edit parameters</span>
              </button>
              <button type="button" onClick={() => handleDeleteTier(i)} className="delete-tier-btn" title="Delete plan tier" aria-label={`Delete ${t.name} plan tier`}>
                <Trash2 size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-5 flex items-center justify-between"><div><h3 className="font-semibold text-slate-900">Company subscriptions</h3><p className="text-xs text-slate-400">Override plans, apply discounts, extend trials, or reset billing.</p></div><strong className="text-xs text-slate-400">{rows.length} tenants</strong></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Company</th><th>Plan tier</th><th>Status</th><th>Renewal</th><th>MRR</th><th>Actions</th></tr></thead>
            <tbody>{visibleRows.map((r) => <tr key={r.id}>
              <td><div className="company-name">{r.co}</div><div className="muted small-text">Tenant ID: {r.id}</div></td>
              <td><Badge tone={r.tone}>{r.plan}</Badge>{r.discount && <span className="subscription-note">{r.discount} off</span>}{r.trial && <span className="subscription-note">Trial {r.trialDays}d</span>}</td>
              <td><span className={`status-text ${r.status === "Active" ? "active" : r.status === "Trial" ? "trial" : "inactive"}`}><span className="status-dot" />{r.status}</span></td>
              <td className="muted">{r.renewal}</td><td><strong>{r.mrr}</strong></td>
              <td><div className="subscription-actions"><button onClick={() => openCompanyAction(r, "override")}><Pencil size={13}/> Override</button><button onClick={() => openCompanyAction(r, "discount")}>Discount</button><button onClick={() => openCompanyAction(r, "trial")}>Extend trial</button><button onClick={() => openCompanyAction(r, "reset")}><RotateCcw size={13}/> Reset</button></div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="table-footer"><span>Showing {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length} company subscriptions</span><div className="pagination"><button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>Next</button></div></div>
      </Card>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New plan tier" footer={<><GhostButton onClick={() => setNewOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={handleNewTier}>Create tier</PrimaryButton></>}>
        <Field label="Tier name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Field label="Price" placeholder="$299/month or Custom" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <Field label="Short description" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
      </Modal>

      <Modal open={editIdx !== null} onClose={() => setEditIdx(null)} title={editIdx !== null ? `Edit ${tiers[editIdx].name}` : ""} footer={<><GhostButton onClick={() => setEditIdx(null)}>Cancel</GhostButton><PrimaryButton onClick={handleEditSave}>Save changes</PrimaryButton></>}>
        <Field label="Price" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
        <TextAreaField label="Features (one per line)" value={editForm.features} onChange={(e) => setEditForm({ ...editForm, features: e.target.value })} />
        <div className="mt-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Platform access on this tier</span>
          <div className="mt-2 space-y-2 border border-slate-200 rounded-lg p-3">
            {FEATURES.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={editForm.flags?.[f.id] !== false} onChange={() => toggleEditFlag(f.id)} />
                {f.label}
              </label>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={!!companyAction} onClose={() => setCompanyAction(null)} title={modalTitle} footer={<><GhostButton onClick={() => setCompanyAction(null)}>Cancel</GhostButton><PrimaryButton onClick={saveCompanyAction}>{actionType === "reset" ? "Reset subscription" : "Apply changes"}</PrimaryButton></>}>
        {companyAction && <p className="modal-copy"><strong>{companyAction.co}</strong> · {companyAction.id}</p>}
        {actionType === "override" && <><SelectField label="New plan" options={PLAN_OPTIONS} value={actionForm.plan} onChange={(e) => setActionForm({ ...actionForm, plan: e.target.value })} /><TextAreaField label="Reason" placeholder="Reason for the plan change" value={actionForm.reason} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} /></>}
        {actionType === "discount" && <><Field label="Discount percentage" type="number" min="1" max="100" value={actionForm.amount} onChange={(e) => setActionForm({ ...actionForm, amount: e.target.value })} /><TextAreaField label="Reason" placeholder="Why is this discount being applied?" value={actionForm.reason} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} /></>}
        {actionType === "trial" && <><Field label="Extension days" type="number" min="1" value={actionForm.days} onChange={(e) => setActionForm({ ...actionForm, days: e.target.value })} /><TextAreaField label="Reason" placeholder="Reason for extending the trial" value={actionForm.reason} onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })} /></>}
        {actionType === "reset" && <p className="modal-copy">This clears the local discount and trial override and returns the subscription to its active state. The backend will enforce the final billing state.</p>}
      </Modal>
    </div>
  );
}
