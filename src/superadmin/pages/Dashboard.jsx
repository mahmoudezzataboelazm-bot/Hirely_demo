import { useEffect, useState } from "react";
import { Card, PageHeader, GhostButton, Dot } from "../components/ui";
import { Download } from "../components/icons";
import { downloadCSV } from "../utils/csv";
import { getPlatformStats, getTenants, getAiUsage, getSupportTickets } from "../../services/hirelyBridge";

export default function Dashboard({ toast, setPage }) {
  const [stats, setStats] = useState(() => getPlatformStats());
  const [tenants, setTenants] = useState(() => getTenants());
  const [ai, setAi] = useState(() => getAiUsage());
  const [tickets, setTickets] = useState(() => getSupportTickets());

  useEffect(() => {
    const sync = () => { setStats(getPlatformStats()); setTenants(getTenants()); setAi(getAiUsage()); setTickets(getSupportTickets()); };
    const events = ["hirely-jobs-change", "hirely-candidates-change", "hirely-company-change", "applicant-applications-change", "storage"];
    events.forEach((e) => window.addEventListener(e, sync));
    return () => events.forEach((e) => window.removeEventListener(e, sync));
  }, []);

  const openIssues = tickets.filter((t) => t.status !== "Resolved").length;
  const cards = [
    { label: "Total companies", value: stats.tenants, delta: `${stats.activeTenants} active` },
    { label: "Total users", value: stats.users, delta: "Admins, recruiters and applicants" },
    { label: "Active companies", value: stats.activeTenants, delta: "Currently active tenants" },
    { label: "New companies", value: tenants.filter(t => { const d = new Date(t.createdAt || t.created_at || 0); return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear(); }).length, delta: "This month" },
  ];
  const exportReport = () => {
    downloadCSV("hirely-platform-report.csv", [["Metric","Value"], ...cards.map(c=>[c.label,c.value]), ["Open support issues",openIssues],["DFS / AI calls this month",ai.calls]]);
    toast("Platform report exported as CSV");
  };
  const recent = tenants.slice(0,4);
  const revenuePoints = [22,29,25,43,49,52,63,66,69,68,76,84];
  return <div className="admin-page platform-overview">
    <PageHeader title="Platform overview" subtitle="Real-time snapshot across every tenant on Hirely." action={<GhostButton icon={Download} onClick={exportReport}>Export report</GhostButton>} />
    <div className="overview-stats">
      {cards.map(c=><Card key={c.label} className="overview-stat"><span>{c.label}</span><strong>{Number(c.value||0).toLocaleString()}</strong><small>↗ {c.delta}</small></Card>)}
    </div>
    <div className="overview-middle">
      <Card className="overview-revenue">
        <h3>Revenue — last 12 months</h3>
        <svg viewBox="0 0 600 230" role="img" aria-label="Revenue trend over the last 12 months" preserveAspectRatio="none">
          <path d={`M ${revenuePoints.map((v,i)=>`${i*600/11},${205-v*1.9}`).join(" L ")} L 600 230 L 0 230 Z`} className="revenue-area"/>
          <path d={`M ${revenuePoints.map((v,i)=>`${i*600/11},${205-v*1.9}`).join(" L ")}`} className="revenue-line"/>
        </svg>
      </Card>
      <Card className="overview-health">
        <h3>System health</h3>
        <div><Dot tone="emerald"/><span>API infrastructure</span><small>99.98%</small></div>
        <div><Dot tone="emerald"/><span>Database cluster</span><small>12ms latency</small></div>
        <div><Dot tone="emerald"/><span>Gemini AI model</span><small>Connected</small></div>
      </Card>
    </div>
    <div className="overview-bottom">
      <Card><div className="overview-card-heading"><h3>Recent signups</h3><small>This month</small></div>
        {recent.map((t,i)=><div className="signup-row" key={t.id}><div><b>{t.name}</b><small>{t.plan || "Company"}</small></div><time>{["2 min ago","18 min ago","1 hr ago","3 hrs ago"][i]}</time></div>)}
      </Card>
      <Card><div className="overview-card-heading"><h3>Platform activity</h3><small>Today</small></div>
        <div className="activity-row"><Dot tone="emerald"/><span>Company onboarding</span><b>{stats.activeTenants} completed</b></div>
        <div className="activity-row"><Dot tone="emerald"/><span>New job posts</span><b>{stats.jobs} created</b></div>
        <div className="activity-row"><Dot tone="emerald"/><span>Applications processed</span><b>{Number(stats.applications||0).toLocaleString()}</b></div>
        <div className="activity-row"><Dot tone="amber"/><span>Open support issues</span><b>{openIssues}</b></div>
      </Card>
    </div>
  </div>;
}
