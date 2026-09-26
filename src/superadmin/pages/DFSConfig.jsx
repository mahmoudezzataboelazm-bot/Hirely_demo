import { useState } from "react";
import { getDFSDefaults, saveDFSDefaults, FACTORY_DFS, getJobs } from "../../services/hirelyBridge";
import {
  Card,
  Badge,
  Dot,
  PageHeader,
  PrimaryButton,
  GhostButton,
} from "../components/ui";
import { Sigma, Download } from "../components/icons";
import { downloadCSV } from "../utils/csv";

// The four dimensions here are the exact dimensions the DFS engine scores
// (services/hirelyBridge.js -> calculateMatchScore), so what is saved here
// becomes the default weight template in the Company Admin / Recruiter job form.
const DIMENSIONS = [
  ["skills", "Technical skills"],
  ["experience", "Relevant experience"],
  ["education", "Qualifications & education"],
  ["location", "Location match"],
];

export default function DFSConfig({ toast }) {
  const [weights, setWeights] = useState(() => getDFSDefaults());
  const sum = DIMENSIONS.reduce((n, [k]) => n + Number(weights[k] || 0), 0);
  const set = (k, v) => setWeights((w) => ({ ...w, [k]: Number(v) }));
  const handleReset = () => {
    setWeights(FACTORY_DFS);
    saveDFSDefaults(FACTORY_DFS);
    toast("Weights reset to the factory template");
  };
  const handleExport = () => {
    downloadCSV("hirely-dfs-config.csv", [["Parameter", "Weight"], ...DIMENSIONS.map(([k, label]) => [label, `${weights[k]}%`])]);
    toast("DFS configuration exported as CSV");
  };
  const handleSave = () => {
    const result = saveDFSDefaults(weights);
    toast(result.error || "Saved — new jobs now start from this weight template");
  };

  // Real per-job weights currently in use inside this workspace.
  const rows = getJobs().map((job) => ({
    co: job.title,
    node: `JOB-${job.id}`,
    w: DIMENSIONS.map(([k]) => `${k[0].toUpperCase()}:${job.weights?.[k] ?? weights[k]}%`).join(" "),
    status: job.weights ? "Custom weights" : "Using default",
    tone: job.weights ? "emerald" : "slate",
  }));

  return (
    <div>
      <PageHeader
        title="DFS configuration"
        subtitle="Set the default weight template new jobs start from. Each company still sets its own final weights per job."
        action={
          <div className="flex gap-2">
            <GhostButton icon={Download} onClick={handleExport}>Export</GhostButton>
            <GhostButton onClick={handleReset}>Reset defaults</GhostButton>
            <PrimaryButton onClick={handleSave}>
              Save as default template
            </PrimaryButton>
          </div>
        }
      />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-6 col-span-2">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-semibold text-slate-900">
              Default weight template
            </h3>
            <Badge tone={sum === 100 ? "emerald" : "rose"}>
              <Dot tone={sum === 100 ? "emerald" : "rose"} />
              Sum: {sum}%
            </Badge>
          </div>
          {DIMENSIONS.map(([key, label]) => (
            <div key={key} className="mb-5">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">{label}</span>
                <Badge tone="indigo">{weights[key]}%</Badge>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights[key]}
                onChange={(e) => set(key, e.target.value)}
                className="w-full accent-indigo-700"
              />
            </div>
          ))}
        </Card>
        <Card className="p-6 bg-indigo-900 text-indigo-50 border-none">
          <div className="flex items-center gap-2 font-semibold mb-3">
            <Sigma size={16} />
            Formula preview
          </div>
          <pre className="text-xs bg-indigo-950/40 rounded-lg p-3 overflow-x-auto">
            {`DFS = (Skills * ${(weights.skills / 100).toFixed(2)}) +
      (Experience * ${(weights.experience / 100).toFixed(2)}) +
      (Education * ${(weights.education / 100).toFixed(2)}) +
      (Location * ${(weights.location / 100).toFixed(2)})`}
          </pre>
        </Card>
      </div>
      <Card className="mt-4">
        <div className="p-5 flex justify-between items-center"><div className="font-semibold text-slate-900">Per-job DFS weights in use</div><Badge tone="indigo">Global default: {sum}%</Badge></div>
        <div className="responsive-table-wrap"><table className="w-full text-sm admin-table">
          <thead>
            <tr className="text-left text-xs font-semibold text-slate-400 uppercase">
              <th className="p-4">Job</th>
              <th className="p-4">Configuration node</th>
              <th className="p-4">Weights applied</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.node} className="border-t border-slate-100">
                <td className="p-4 font-semibold text-slate-900">{r.co}</td>
                <td className="p-4 font-mono text-xs text-slate-500">
                  {r.node}
                </td>
                <td className="p-4 text-slate-600">{r.w}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5">
                    <Dot tone={r.tone} />
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Card>
      <Card className="mt-4">
        <div className="p-5"><h3 className="font-semibold text-slate-900">Configuration audit log</h3><p className="text-xs text-slate-400 mt-1">Recent changes to the platform default model.</p></div>
        <div className="audit-row"><span>Default weights loaded</span><span className="muted small-text">System · Today</span></div>
        <div className="audit-row"><span>Per-company overrides remain isolated</span><span className="muted small-text">Policy · Today</span></div>
      </Card>
    </div>
  );
}
