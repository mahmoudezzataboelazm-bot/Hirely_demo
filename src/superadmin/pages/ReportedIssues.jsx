import { useEffect, useState } from "react";
import { getSupportTickets, updateSupportTicket } from "../../services/hirelyBridge";
import {
  Card,
  Badge,
  Dot,
  PageHeader,
  PrimaryButton,
  GhostButton,
} from "../components/ui";
import { SelectField } from "../components/Modal";
import { Download, Search } from "../components/icons";
import { downloadCSV } from "../utils/csv";

const TYPE_TONE = { "Technical issue": "rose", Billing: "indigo", "Account & access": "amber", "Data or candidate issue": "slate", Other: "slate" };

function toTickets(tickets) {
  return tickets.map((t) => ({
    id: t.id,
    name: t.reportedBy || t.reporterRole,
    co: t.company || "Hirely Tech Hub",
    role: t.reporterRole,
    type: t.type || "Other",
    tone: TYPE_TONE[t.type] || "slate",
    priority: t.priority || "Medium",
    subject: (t.description || "").slice(0, 70) || "Reported issue",
    attachment: t.attachment || "No attachment",
    desc: t.description || "",
    status: t.status || "Open",
    stone: t.status === "Resolved" ? "emerald" : t.status === "Escalated" ? "rose" : t.status === "Open" ? "slate" : "amber",
    date: t.createdAt || "",
  }));
}

export default function ReportedIssues({ toast }) {
  // Real tickets submitted from the Company Admin / Recruiter
  // "Report a Problem" page. Updating a status here notifies the reporter
  // and shows up on their My Reports page.
  const [rows, setRows] = useState(() => toTickets(getSupportTickets()));
  useEffect(() => {
    const sync = () => setRows(toTickets(getSupportTickets()));
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const [openIdx, setOpenIdx] = useState(0);
  const [nextStatus, setNextStatus] = useState(rows[0]?.status || "Open");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const statusTone = (s) =>
    s === "Resolved"
      ? "emerald"
      : s === "Escalated"
        ? "rose"
        : s === "Open"
          ? "slate"
          : "amber";

  const handleUpdate = () => {
    if (currentIndex < 0) return;
    updateSupportTicket(rows[currentIndex].id, { status: nextStatus });
    setRows((rs) => rs.map((r, i) => i === currentIndex ? { ...r, status: nextStatus, stone: statusTone(nextStatus) } : r));
    toast(`Issue ${rows[currentIndex].id} marked as ${nextStatus}`);
  };
  const handleEscalate = () => {
    if (currentIndex < 0) return;
    updateSupportTicket(rows[currentIndex].id, { status: "Escalated", priority: "High" });
    setRows((rs) => rs.map((r, i) => i === currentIndex ? { ...r, status: "Escalated", stone: "rose", priority: "High" } : r));
    setNextStatus("Escalated");
    toast("Issue escalated to senior engineering");
  };
  const openPanel = (i) => {
    setOpenIdx(i);
    setNextStatus(rows[i].status);
  };

  const filtered = rows.filter((r) =>
    (!query || `${r.name} ${r.co} ${r.desc}`.toLowerCase().includes(query.toLowerCase())) &&
    (typeFilter === "All types" || r.type === typeFilter) &&
    (statusFilter === "All statuses" || r.status === statusFilter),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const current = filtered.find((r) => rows.indexOf(r) === openIdx) || filtered[0] || null;
  const currentIndex = current ? rows.indexOf(current) : -1;
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  useEffect(() => {
    if (!filtered.length) {
      setOpenIdx(-1);
      setNextStatus("Open");
      return;
    }
    const selectedStillVisible = filtered.some((r) => rows.indexOf(r) === openIdx);
    if (!selectedStillVisible) {
      const firstIndex = rows.indexOf(filtered[0]);
      setOpenIdx(firstIndex);
      setNextStatus(filtered[0].status);
    }
  }, [query, typeFilter, statusFilter]);
  const handleExport = () => {
    downloadCSV("hirely-reported-issues.csv", [
      ["Reporter", "Company", "Type", "Priority", "Description", "Attachment", "Status", "Date"],
      ...filtered.map((r) => [r.name, r.co, r.type, r.priority, r.desc, r.attachment || "", r.status, r.date]),
    ]);
    toast("Issue log exported as CSV");
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 reported-issues-main">
        <PageHeader
          title="Reported issues"
          subtitle="Manage and resolve system-wide user reports and bug submissions."
          action={<GhostButton icon={Download} onClick={handleExport}>Export log</GhostButton>}
        />
        <div className="admin-toolbar mb-4">
          <div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input className="w-full border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm" placeholder="Search reports..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></div>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}><option>All types</option><option>Technical issue</option><option>Account & access</option><option>Billing</option><option>Data or candidate issue</option><option>Other</option></select>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}><option>All statuses</option><option>Open</option><option>In Progress</option><option>Resolved</option><option>Escalated</option></select>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6 issues-kpi-grid">
          <Card className="p-5">
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Total reports
            </div>
            <div className="text-2xl font-bold mt-2">1,284</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Open bugs
            </div>
            <div className="text-2xl font-bold mt-2">
              42 <span className="text-rose-600 text-sm">8 critical</span>
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Avg. resolution
            </div>
            <div className="text-2xl font-bold mt-2">4.2h</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Resolution rate
            </div>
            <div className="text-2xl font-bold mt-2">94.8%</div>
          </Card>
        </div>
        <Card>
          <div className="responsive-table-wrap">
          <table className="w-full text-sm reported-issues-table">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-400 uppercase">
                <th className="p-4">Reporter</th>
                <th className="p-4">Type</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Description</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr
                  key={r.name}
                  onClick={() => openPanel(rows.indexOf(r))}
                  className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 ${rows.indexOf(r) === openIdx ? "bg-indigo-50/40" : ""}`}
                >
                  <td className="p-4">
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <div className="text-xs text-slate-400">{r.co}</div>
                  </td>
                  <td className="p-4">
                    <Badge tone={r.tone}>{r.type}</Badge>
                  </td>
                  <td className="p-4">
                    <Badge
                      tone={
                        r.priority === "High"
                          ? "rose"
                          : r.priority === "Medium"
                            ? "amber"
                            : "slate"
                      }
                    >
                      {r.priority}
                    </Badge>
                  </td>
                  <td className="p-4 text-slate-600 max-w-xs truncate">
                    {r.desc}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5">
                      <Dot tone={r.stone} />
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
        <div className="table-footer">
          <span>{filtered.length ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)} of ${filtered.length}` : "0 reports"}</span>
          <div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 border rounded-lg disabled:opacity-40">Previous</button><button disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="px-3 py-1.5 border rounded-lg disabled:opacity-40">Next</button></div>
        </div>
      </div>
      <div className="w-80 shrink-0 issue-details-column">
        <Card className="p-5 sticky top-6">
          <h3 className="font-semibold text-slate-900 mb-4">Issue details</h3>
          {current ? (
            <>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Original report</div>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Description</div>
              <p className="text-sm text-slate-600 italic bg-slate-50 rounded-lg p-3 mb-4">
                "{current.desc}"
              </p>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Reporter</div>
              <p className="text-sm font-medium mb-4">{current.name} · {current.co}</p>
              <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Attachment</div>
              <p className="text-sm font-medium text-indigo-600 mb-4">{current.attachment || "No attachment"}</p>
              <SelectField
                label="Status"
                options={["Open", "In Progress", "Resolved", "Escalated"]}
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
              />
              <div className="flex gap-2 mt-4">
                <PrimaryButton className="flex-1" onClick={handleUpdate}>Update issue</PrimaryButton>
              </div>
              <button onClick={handleEscalate} className="w-full mt-2 border border-rose-200 text-rose-600 text-sm font-semibold py-2 rounded-lg">
                Escalate issue
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-500">No reports match the selected filters.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
