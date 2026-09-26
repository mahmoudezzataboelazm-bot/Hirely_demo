import { useEffect, useMemo, useState } from "react";
import { Card, PageHeader, Badge, PrimaryButton, GhostButton } from "../components/ui";
import { Modal, SelectField } from "../components/Modal";
import { Download, Eye } from "../components/icons";
import { downloadCSV } from "../utils/csv";

const PAGE_SIZE = 8;

const normalizeEntry = (entry) => ({
  ...entry,
  type: entry.type || "Action",
  service: entry.service || "Platform",
  status: entry.status || "Success",
  details: entry.details || entry.action || "No additional details available.",
});

const statusTone = (status) => {
  if (status === "Success") return "emerald";
  if (status === "Warning") return "amber";
  if (status === "Error") return "rose";
  return "slate";
};

export default function AuditLog({ entries = [] }) {
  const [page, setPage] = useState(1);
  const [logType, setLogType] = useState("All types");
  const [service, setService] = useState("All services");
  const [status, setStatus] = useState("All statuses");
  const [selectedLog, setSelectedLog] = useState(null);

  const normalizedEntries = useMemo(() => entries.map(normalizeEntry), [entries]);

  const typeOptions = useMemo(
    () => ["All types", ...Array.from(new Set(normalizedEntries.map((e) => e.type)))],
    [normalizedEntries]
  );
  const serviceOptions = useMemo(
    () => ["All services", ...Array.from(new Set(normalizedEntries.map((e) => e.service)))],
    [normalizedEntries]
  );
  const statusOptions = ["All statuses", "Success", "Warning", "Error"];

  const filteredEntries = useMemo(() => normalizedEntries.filter((entry) => {
    const typeMatch = logType === "All types" || entry.type === logType;
    const serviceMatch = service === "All services" || entry.service === service;
    const statusMatch = status === "All statuses" || entry.status === status;
    return typeMatch && serviceMatch && statusMatch;
  }), [normalizedEntries, logType, service, status]);

  const summary = useMemo(() => ({
    total: normalizedEntries.length,
    errors: normalizedEntries.filter((e) => e.status === "Error").length,
    warnings: normalizedEntries.filter((e) => e.status === "Warning").length,
    info: normalizedEntries.filter((e) => e.status === "Success").length,
  }), [normalizedEntries]);

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [logType, service, status]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const visibleEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, currentPage]);

  const exportLogs = () => {
    const rows = [
      ["Action", "Type", "Service", "Status", "Time", "Details"],
      ...filteredEntries.map((entry) => [entry.action, entry.type, entry.service, entry.status, entry.time, entry.details]),
    ];
    downloadCSV("hirely-system-logs.csv", rows);
  };

  const clearFilters = () => {
    setLogType("All types");
    setService("All services");
    setStatus("All statuses");
  };

  return (
    <div className="admin-page">
      <PageHeader
        title="Activity & Audit Log"
        subtitle="Review system activity, errors, warnings, and Super Admin actions for traceability."
        action={<PrimaryButton icon={Download} onClick={exportLogs}>Export logs</PrimaryButton>}
      />

      <div className="audit-summary-grid">
        <Card><div className="audit-summary-card"><span>Total logs</span><strong>{summary.total}</strong></div></Card>
        <Card><div className="audit-summary-card"><span>Errors</span><strong>{summary.errors}</strong></div></Card>
        <Card><div className="audit-summary-card"><span>Warnings</span><strong>{summary.warnings}</strong></div></Card>
        <Card><div className="audit-summary-card"><span>Info</span><strong>{summary.info}</strong></div></Card>
      </div>

      <Card>
        <div className="audit-filter-bar">
          <SelectField label="Log type" options={typeOptions} value={logType} onChange={(e) => setLogType(e.target.value)} />
          <SelectField label="Service" options={serviceOptions} value={service} onChange={(e) => setService(e.target.value)} />
          <SelectField label="Status" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
          {(logType !== "All types" || service !== "All services" || status !== "All statuses") && (
            <GhostButton onClick={clearFilters}>Clear filters</GhostButton>
          )}
        </div>

        <div className="audit-table-wrap">
          <div className="audit-table audit-table-wide">
            <div className="audit-table-head">
              <span>Log</span><span>Type</span><span>Service</span><span>Status</span><span>Time</span><span>Action</span>
            </div>
            {visibleEntries.length === 0 ? (
              <div className="empty-state">No logs match the selected filters.</div>
            ) : visibleEntries.map((entry, i) => (
              <div className="audit-row audit-grid-row" key={`${entry.time}-${entry.action}-${i}`}>
                <div><strong className="text-slate-900">{entry.action}</strong><div className="muted small-text">Super Admin</div></div>
                <div><Badge tone="indigo">{entry.type}</Badge></div>
                <div className="small-text">{entry.service}</div>
                <div><Badge tone={statusTone(entry.status)}>{entry.status}</Badge></div>
                <div className="small-text">{entry.time}</div>
                <div><button className="audit-view-btn" onClick={() => setSelectedLog(entry)}><Eye size={14} /> View</button></div>
              </div>
            ))}
          </div>
        </div>

        {filteredEntries.length > 0 && (
          <div className="table-footer">
            <span>{`${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filteredEntries.length)} of ${filteredEntries.length}`}</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 border rounded-lg disabled:opacity-40">Previous</button>
              <button disabled={currentPage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="px-3 py-1.5 border rounded-lg disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={!!selectedLog} onClose={() => setSelectedLog(null)} title="Log details">
        {selectedLog && (
          <div className="audit-detail-list">
            <div><span>Action</span><strong>{selectedLog.action}</strong></div>
            <div><span>Type</span><strong>{selectedLog.type}</strong></div>
            <div><span>Service</span><strong>{selectedLog.service}</strong></div>
            <div><span>Status</span><Badge tone={statusTone(selectedLog.status)}>{selectedLog.status}</Badge></div>
            <div><span>Time</span><strong>{selectedLog.time}</strong></div>
            <div><span>Details</span><p>{selectedLog.details}</p></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
