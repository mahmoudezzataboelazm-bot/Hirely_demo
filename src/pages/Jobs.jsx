import React from "react";
import { useState } from "react";
import { Plus, MapPin, Pencil, Trash2, Eye, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Badge, Button, Card, ConfirmDelete, ScoreRing, Modal } from "../components/UI";

export default function Jobs() {
  const { jobs, deleteJob, toggleJob, closeJob, user } = useApp();
  const [tab, setTab] = useState("All");
  const [del, setDel] = useState(null);
  const [view, setView] = useState(null);
  const navigate = useNavigate();
  const shown = jobs.filter(j => tab === "All" || j.status === tab);
  const canDelete = user?.role === "company-admin";
  return <div>
    <div className="page-head"><div><h1>Jobs <span className="count-pill">{jobs.length} TOTAL</span></h1><p>Manage active, paused, closed, and draft postings.</p></div><Button icon={<Plus size={17} />} onClick={() => navigate("/jobs/new")}>Post new job</Button></div>
    <div className="tabs">{["All", "Open", "Paused", "Closed", "Draft"].map(t => <button className={tab === t ? "tab active" : "tab"} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>
    <div className="jobs-grid">{shown.map(j => <Card className="job-card" key={j.id}>
      <div className="job-top"><Badge tone={j.status === "Paused" ? "neutral" : j.status === "Draft" ? "neutral" : j.status === "Closed" ? "danger" : "info"}>{j.status}</Badge><div className="job-actions"><button className="icon-btn" title="Edit job" onClick={() => navigate(`/jobs/${j.id}/edit`)}><Pencil size={15} /></button><button className="icon-btn" title="Preview job" onClick={() => setView(j)}><Eye size={15} /></button>{j.status !== "Draft" && j.status !== "Closed" && <button className="icon-btn" title={j.status === "Paused" ? "Resume job" : "Pause job"} onClick={() => toggleJob(j.id)}>{j.status === "Paused" ? <PlayCircle size={15} /> : <PauseCircle size={15} />}</button>}{canDelete && <button className="icon-btn danger-text" title="Delete job" onClick={() => setDel(j)}><Trash2 size={15} /></button>}</div></div>
      <h3>{j.title}</h3><p className="job-meta">{j.department} · <MapPin size={14} />{j.location}</p>
      <div className="job-metrics"><div><small>APPLICANTS</small><b>{j.applicants || 0}</b></div><div className="match-box"><ScoreRing value={j.aiMatch || 0} /><span>AI MATCH<br /><b>{j.aiMatch > 75 ? "Excellent" : j.aiMatch > 55 ? "Good" : "Low"}</b></span></div></div>
      <div className="job-foot"><span>Assigned to<br /><b>{j.assignedTo || "Unassigned"}</b></span><span>Days open<br /><b>{j.daysOpen || "--"}</b></span></div>
      {j.status !== "Closed" && j.status !== "Draft" && <Button type="button" variant="secondary" className="close-job-action" icon={<XCircle size={16} />} onClick={() => closeJob(j.id)}>Close job</Button>}
      
    </Card>)}</div>
    <ConfirmDelete open={!!del} name={del?.title} onClose={() => setDel(null)} onConfirm={() => { deleteJob(del.id); setDel(null); }} />
    <Modal open={!!view} title="Public job preview" onClose={() => setView(null)} footer={<Button variant="secondary" onClick={() => setView(null)}>Close</Button>}><h2>{view?.title}</h2><p>{view?.department} · {view?.location}</p><p>{view?.description || "Role description will appear here."}</p><div className="match-row"><ScoreRing value={view?.aiMatch || 0} /><span>Estimated match before applying</span></div></Modal>
  </div>;
}
