import { useEffect, useState } from "react";
import { getAiUsage } from "../../services/hirelyBridge";
import { Card, Badge, Dot, PageHeader, PrimaryButton, GhostButton } from "../components/ui";
import { Modal, Field } from "../components/Modal";
import { Rocket, Settings } from "../components/icons";

const PAGE_SIZE = 8;

export default function AIMonitor({ toast }) {
  const [capOpen, setCapOpen] = useState(false);
  const [cap, setCap] = useState("6000");
  const [lastRefresh, setLastRefresh] = useState("just now");
  // Live counter: every CV parse and DFS scoring run in this workspace is
  // recorded through hirelyBridge.recordAiCall().
  const [usage, setUsage] = useState(() => getAiUsage());
  useEffect(() => {
    const sync = () => setUsage(getAiUsage());
    window.addEventListener("applicant-applications-change", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("applicant-applications-change", sync); window.removeEventListener("storage", sync); };
  }, []);
  const [errorPage, setErrorPage] = useState(1);
  const refresh = () => { setUsage(getAiUsage()); setLastRefresh("just now"); toast?.("AI monitor data refreshed"); };
  const errors = [
    {
      ts: "2025-07-24 14:22:01",
      type: "Gemini-503",
      tone: "amber",
      msg: "Upstream service unavailable during candidate screening.",
      status: "Unresolved",
      stone: "rose",
    },
    {
      ts: "2025-07-24 13:58:45",
      type: "DFS-403",
      tone: "rose",
      msg: "Forbidden: access denied to tenant bucket 'T-9921'.",
      status: "Retried",
      stone: "amber",
    },
    {
      ts: "2025-07-24 13:42:12",
      type: "AUTH-401",
      tone: "indigo",
      msg: "Expired API key used for node synchronization.",
      status: "Critical",
      stone: "rose",
    },
    {
      ts: "2025-07-24 12:15:33",
      type: "SYSTEM-500",
      tone: "slate",
      msg: "Unexpected internal error parsing CV JSON metadata.",
      status: "Resolved",
      stone: "emerald",
    },
    { ts: "2025-07-24 11:48:02", type: "DFS-429", tone: "amber", msg: "Tenant file request rate limit exceeded.", status: "Retried", stone: "amber" },
    { ts: "2025-07-24 11:21:17", type: "GEMINI-429", tone: "amber", msg: "Model request quota temporarily exceeded.", status: "Monitoring", stone: "amber" },
    { ts: "2025-07-24 10:54:39", type: "AUTH-403", tone: "rose", msg: "Unauthorized platform API scope requested.", status: "Resolved", stone: "emerald" },
    { ts: "2025-07-24 10:16:44", type: "SYSTEM-502", tone: "slate", msg: "Temporary gateway failure while loading analytics data.", status: "Resolved", stone: "emerald" },
  ];
  return (
    <div>
      <PageHeader
        title="AI & API monitor"
        subtitle="Real-time performance and Gemini/DFS cost auditing for Hirely's core services."
        action={<PrimaryButton icon={Rocket} onClick={refresh}>Refresh data</PrimaryButton>}
      />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase">
            Gemini API calls
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{(usage.byKind?.["cv-parse"] || 0).toLocaleString()}</div>
          <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: `${usage.usagePercent}%` }} />
          </div>
          <div className="text-xs text-slate-400 mt-1">{usage.usagePercent}% of the {usage.monthlyLimit.toLocaleString()} monthly cap · est. ${usage.cost} · Updated {lastRefresh}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase">
            DFS requests
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{(usage.byKind?.["dfs-score"] || 0).toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-3">One scoring run per submitted application</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase">
            Avg response time
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">184ms</div>
          <div className="text-xs text-slate-400 mt-3">
            P95: 312ms · P99: 540ms
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-6 col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4">
            API usage over time
          </h3>
          <svg viewBox="0 0 400 100" className="w-full h-28">
            <polyline
              fill="none"
              stroke="#D97706"
              strokeWidth="2"
              points="0,80 50,70 100,60 150,55 200,40 250,45 300,25 350,30 400,15"
            />
          </svg>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-3">Cost breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Gemini AI</span>
              <span className="font-semibold">$4,281.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">DFS storage</span>
              <span className="font-semibold">$1,142.20</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="font-semibold">Total</span>
              <span className="font-bold">$5,423.70</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-rose-600 font-medium mb-1">
              <span>Budget warning</span>
              <span>92% of $6,000</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500" style={{ width: "92%" }} />
            </div>
          </div>
          <button type="button" className="ai-cap-button" onClick={() => setCapOpen(true)}><Settings size={14} /> Adjust monthly cap</button>
        </Card>
      </div>
      <Card>
        <div className="flex justify-between items-center p-5">
          <h3 className="font-semibold text-slate-900">Error log</h3>
          <Badge tone="rose">14 active errors</Badge>
        </div>
        <div className="responsive-table-wrap"><table className="w-full text-sm admin-table">
          <thead>
            <tr className="text-left text-xs font-semibold text-slate-400 uppercase">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Type</th>
              <th className="p-4">Message</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {errors.slice((errorPage - 1) * PAGE_SIZE, errorPage * PAGE_SIZE).map((e) => (
              <tr key={e.ts} className="border-t border-slate-100">
                <td className="p-4 text-slate-500 font-mono text-xs">{e.ts}</td>
                <td className="p-4">
                  <Badge tone={e.tone}>{e.type}</Badge>
                </td>
                <td className="p-4 text-slate-600">{e.msg}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5">
                    <Dot tone={e.stone} />
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="table-footer"><span>Showing {errors.length === 0 ? 0 : (errorPage - 1) * PAGE_SIZE + 1}–{Math.min(errorPage * PAGE_SIZE, errors.length)} of {errors.length} errors</span><div className="pagination"><button disabled={errorPage === 1} onClick={() => setErrorPage((p) => p - 1)}>Previous</button><span>Page {errorPage} of {Math.max(1, Math.ceil(errors.length / PAGE_SIZE))}</span><button disabled={errorPage === Math.max(1, Math.ceil(errors.length / PAGE_SIZE))} onClick={() => setErrorPage((p) => p + 1)}>Next</button></div></div>
      </Card>
      <Modal open={capOpen} onClose={() => setCapOpen(false)} title="Adjust monthly cap" footer={<><GhostButton onClick={() => setCapOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={() => { setCapOpen(false); toast?.(`Monthly cap updated to $${cap}`); }}>Save cap</PrimaryButton></>}>
        <p className="modal-copy">Set the monthly AI spending limit used for platform monitoring.</p>
        <Field label="Monthly cap (USD)" type="number" min="0" value={cap} onChange={(e) => setCap(e.target.value)} />
      </Modal>
    </div>
  );
}
