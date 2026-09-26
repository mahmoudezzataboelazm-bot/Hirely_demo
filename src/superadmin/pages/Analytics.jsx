import { useMemo, useState } from "react";
import { getPlatformStats, getApplications, getJobs } from "../../services/hirelyBridge";
import { Card, Dot, PageHeader, GhostButton, PrimaryButton } from "../components/ui";
import { Download } from "../components/icons";

const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const applicationData = [62, 74, 68, 82, 91, 104];
const revenueData = [382, 401, 417, 429, 439, 452];

export default function Analytics({ toast }) {
  const [range, setRange] = useState("Last 6 months");
  const [metric, setMetric] = useState("Applications");

  // Platform KPIs aggregated from every tenant. The local workspace numbers
  // are live; seeded tenants contribute their stored counts.
  const stats = useMemo(() => getPlatformStats(), []);
  const summary = useMemo(() => [
    ["Monthly recurring revenue", `$${stats.mrr.toLocaleString()}`, `${stats.activeTenants} active tenants`],
    ["Active tenants", String(stats.activeTenants), `${stats.suspendedTenants} suspended`],
    ["Total open jobs", String(stats.jobs), `${stats.openJobs} open here`],
    ["Total applications", String(stats.applications), `${stats.hires} hires`],
  ], [stats]);

  // Real funnel for this workspace — the same events the Company Admin sees.
  const funnel = useMemo(() => {
    const apps = getApplications();
    const count = (test) => apps.filter(test).length;
    return [
      ["Applied", apps.length],
      ["Screening", count((a) => ["Screening", "Shortlisted", "Interview", "Assessment", "Offer", "Hired"].includes(a.stage))],
      ["Interview", count((a) => ["Interview", "Assessment", "Offer", "Hired"].includes(a.stage))],
      ["Offer", count((a) => ["Offer", "Hired"].includes(a.stage))],
      ["Hired", count((a) => a.stage === "Hired")],
    ];
  }, []);

  const handleExportPDF = () => {
    toast('Opening print dialog — choose "Save as PDF"');
    window.print();
  };

  const exportCSV = () => {
    const rows = [["Month", "Applications", "MRR"], ...months.map((m, i) => [m, applicationData[i], `$${revenueData[i]}k`])];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hirely-platform-analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("Analytics CSV exported");
  };

  const values = metric === "Applications" ? applicationData : revenueData;
  const funnelMax = Math.max(1, ...funnel.map(([, n]) => n));
  const max = Math.max(...values);

  return (
    <div>
      <PageHeader
        title="Platform analytics"
        subtitle="Comprehensive performance oversight for the Hirely ecosystem."
        action={<div className="analytics-actions"><select value={range} onChange={(e) => setRange(e.target.value)}><option>Last 6 months</option><option>Last 12 months</option><option>This year</option></select><GhostButton icon={Download} onClick={exportCSV}>Export CSV</GhostButton><GhostButton icon={Download} onClick={handleExportPDF}>Export PDF</GhostButton></div>}
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {summary.map(([l, v, d]) => <Card key={l} className="p-5"><div className="text-xs font-semibold text-slate-400 uppercase">{l}</div><div className="text-xl font-bold text-slate-900 mt-2">{v}</div><div className={`text-xs font-medium mt-1 ${d.startsWith("-") ? "text-rose-600" : "text-emerald-600"}`}>{d}</div></Card>)}
      </div>

      <div className="analytics-grid">
        <Card className="p-6">
          <div className="analytics-card-head"><div><h3 className="font-semibold text-slate-900">Platform growth</h3><p className="text-xs text-slate-400">{range}</p></div><div className="analytics-toggle"><button className={metric === "Applications" ? "active" : ""} onClick={() => setMetric("Applications")}>Applications</button><button className={metric === "MRR" ? "active" : ""} onClick={() => setMetric("MRR")}>MRR</button></div></div>
          <div className="analytics-chart">
            {values.map((v, i) => <div className="chart-column" key={months[i]}><div className="chart-value">{metric === "MRR" ? `$${v}k` : v}</div><div className="chart-bar" style={{ height: `${Math.max(10, (v / max) * 100)}%` }} /><span>{months[i]}</span></div>)}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Subscription distribution</h3>
          <div className="space-y-3 text-sm">{stats.planSplit.map(({ plan, count }) => <div key={plan} className="flex justify-between"><span className="flex items-center gap-2"><Dot tone="indigo" />{plan}</span><span className="font-semibold">{stats.tenants ? Math.round((count / stats.tenants) * 100) : 0}%</span></div>)}</div>
          <div className="distribution-bar">{stats.planSplit.map(({ plan, count }) => <i key={plan} style={{ width: `${stats.tenants ? (count / stats.tenants) * 100 : 0}%` }} />)}</div>
        </Card>
      </div>

      <div className="analytics-grid lower">
        <Card className="p-6"><div className="card-title"><div><h3 className="font-semibold text-slate-900">Tenant growth</h3><p className="text-xs text-slate-400">Platform-wide active tenants</p></div><span className="analytics-kpi">1,248</span></div><div className="mini-bars">{[48,55,61,67,72,82].map((v,i)=><div key={i} style={{height:`${v}%`}}><span>{months[i]}</span></div>)}</div></Card>
        <Card className="p-6"><h3 className="font-semibold text-slate-900 mb-3">Hiring funnel (this workspace)</h3><div className="space-y-2 text-sm">{funnel.map(([stage, n]) => <div key={stage}><div className="flex justify-between mb-1"><span className="text-slate-600">{stage}</span><b className="text-slate-900">{n}</b></div><div className="seat-bar"><div className="seat-fill ok" style={{ width: `${(n / funnelMax) * 100}%` }} /></div></div>)}</div></Card>
        <Card className="p-6"><h3 className="font-semibold text-slate-900">Platform health</h3><div className="health-list"><div><span>API uptime</span><b>99.98%</b></div><div><span>AI service</span><b className="health-ok">Operational</b></div><div><span>Open incidents</span><b>2</b></div><div><span>Data processing</span><b className="health-ok">Operational</b></div></div></Card>
      </div>
    </div>
  );
}
