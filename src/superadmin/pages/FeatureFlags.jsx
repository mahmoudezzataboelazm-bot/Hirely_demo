import { useState } from "react";
import { Card, PageHeader, PrimaryButton, GhostButton, Toggle, Badge } from "../components/ui";
import { FEATURES, getFeatureFlags, saveFeatureFlags } from "../../services/hirelyBridge";

const PLANS = ["Starter", "Growth", "Enterprise"];

/* Feature flags per subscription tier.
   These are enforced, not decorative: the Company Admin and Recruiter
   workspaces call hirelyBridge.isFeatureEnabled(id) before rendering the
   matching feature, so turning a flag off here removes it from the company
   portal on the next visit (DEP-02). */
export default function FeatureFlags({ toast }) {
  const [flags, setFlags] = useState(() => getFeatureFlags());
  const [dirty, setDirty] = useState(false);

  const toggle = (plan, featureId) => {
    setFlags((current) => ({
      ...current,
      [plan]: { ...current[plan], [featureId]: !(current[plan]?.[featureId] !== false) },
    }));
    setDirty(true);
  };

  const save = () => {
    saveFeatureFlags(flags);
    setDirty(false);
    toast("Feature flags saved — limits apply to every tenant immediately");
  };

  const reset = () => { setFlags(getFeatureFlags()); setDirty(false); toast("Unsaved changes discarded"); };

  return (
    <div className="admin-page">
      <PageHeader
        title="Feature flags"
        subtitle="Decide which features each subscription tier includes. Changes apply to every company on that tier."
        action={<div className="flex gap-2"><GhostButton onClick={reset}>Discard</GhostButton><PrimaryButton onClick={save}>Save configuration</PrimaryButton></div>}
      />
      <Card>
        <div className="p-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Feature matrix</h3>
            <p className="text-xs text-slate-400 mt-1">Rows are features the product actually gates. Columns are subscription tiers.</p>
          </div>
          {dirty && <Badge tone="amber">Unsaved changes</Badge>}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Feature</th>
                {PLANS.map((p) => <th key={p}>{p}</th>)}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.id}>
                  <td><div className="company-name">{f.label}</div><div className="muted small-text">{f.id}</div></td>
                  {PLANS.map((plan) => (
                    <td key={plan}>
                      <Toggle on={flags[plan]?.[f.id] !== false} onChange={() => toggle(plan, f.id)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="mt-4">
        <div className="p-5">
          <h3 className="font-semibold text-slate-900">What happens when a flag is turned off</h3>
          <p className="text-xs text-slate-400 mt-1">Downgrading a tenant applies these limits immediately (DEP-02).</p>
        </div>
        <div className="audit-row"><span>AI candidate summary</span><span className="muted small-text">The AI summary block disappears from the candidate panel.</span></div>
        <div className="audit-row"><span>Analytics export</span><span className="muted small-text">The Export button is removed from Company Analytics.</span></div>
        <div className="audit-row"><span>Talent pool &amp; CRM</span><span className="muted small-text">Talent Pool is hidden from the sidebar for both company roles.</span></div>
        <div className="audit-row"><span>Company-wide analytics</span><span className="muted small-text">Company Admin keeps only their own scoped analytics.</span></div>
        <div className="audit-row"><span>Pipeline automation rules</span><span className="muted small-text">Auto-advance and auto-reject settings are hidden in the job form.</span></div>
      </Card>
    </div>
  );
}
