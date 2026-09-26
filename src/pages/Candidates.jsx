import React, { useMemo, useState } from "react";
import { CheckSquare, Eye, GitCompare, Save, Trash2, UserPlus, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Badge, Button, Card, Modal, ScoreRing, SearchInput } from "../components/UI";

const stages = ["Applied", "Screening", "Shortlisted", "Interview", "Assessment", "Offer", "Hired", "Rejected"];

export default function Candidates() {
  const { candidates, jobs, saveToTalentPool, addCandidate, moveCandidate, rejectCandidate, updateCandidate, archiveCandidate, user } = useApp();
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("All stages");
  const [scoreFilter, setScoreFilter] = useState("All scores");
  const [selected, setSelected] = useState(null);
  const [compare, setCompare] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const list = useMemo(() => candidates.filter(c => {
    const text = `${c.name || ""} ${c.email || ""}`.toLowerCase();
    const scoreOk = scoreFilter === "All scores" || (scoreFilter === "80+" && Number(c.score) >= 80) || (scoreFilter === "60-79" && Number(c.score) >= 60 && Number(c.score) < 80) || (scoreFilter === "Below 60" && Number(c.score) < 60);
    return text.includes(q.toLowerCase()) && (stageFilter === "All stages" || c.stage === stageFilter) && scoreOk && !["Withdrawn", "Closed", "Archived"].includes(c.stage);
  }), [candidates, q, stageFilter, scoreFilter]);

  const toggleSelected = id => setSelectedIds(x => x.includes(id) ? x.filter(v => v !== id) : [...x, id]);
  const toggleCompare = id => setCompare(x => x.includes(id) ? x.filter(v => v !== id) : x.length < 4 ? [...x, id] : x);
  const bulkMove = stage => { selectedIds.forEach(id => moveCandidate(id, stage)); setSelectedIds([]); };
  const bulkReject = () => { selectedIds.forEach(id => rejectCandidate(id, "Bulk rejection", "Candidate rejected from Candidates in bulk")); setSelectedIds([]); };

  const create = f => {
    addCandidate({ ...f, jobId: f.jobId, stage: "Applied", score: Number(f.score) || 50, skills: f.skills.split(",").map(x => x.trim()).filter(Boolean), tags: [], notes: "" });
    setAddOpen(false);
  };

  return <div>
    <div className="page-head"><div><h1>Candidates</h1><p>Search and manage candidates across your recruitment workspace.</p></div><div className="inline"><Button variant="secondary" icon={<GitCompare size={16}/>} disabled={compare.length < 2} onClick={() => setCompareOpen(true)}>Compare ({compare.length})</Button><Button icon={<UserPlus size={16}/>} onClick={() => setAddOpen(true)}>Add Candidate</Button></div></div>
    <Card><div className="toolbar"><SearchInput value={q} onChange={setQ} placeholder="Search candidates..."/><select value={stageFilter} onChange={e => setStageFilter(e.target.value)}><option>All stages</option>{stages.map(s => <option key={s}>{s}</option>)}</select><select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)}><option>All scores</option><option>80+</option><option>60-79</option><option>Below 60</option></select></div></Card>
    {selectedIds.length > 0 && <div className="bulk-bar"><b>{selectedIds.length} selected</b><div className="inline"><select defaultValue="" onChange={e => e.target.value && bulkMove(e.target.value)}><option value="">Move to stage...</option>{stages.filter(s => s !== "Rejected").map(s => <option key={s}>{s}</option>)}</select><Button variant="danger" onClick={bulkReject}><Trash2 size={15}/> Reject selected</Button><Button variant="secondary" onClick={() => setSelectedIds([])}>Clear</Button></div></div>}
    <div className="table-card"><table><thead><tr><th><input type="checkbox" checked={list.length > 0 && list.every(c => selectedIds.includes(c.id))} onChange={e => setSelectedIds(e.target.checked ? list.map(c => c.id) : [])}/></th><th>Candidate</th><th>Job</th><th>Stage</th><th>DFS Score</th><th>Experience</th><th>Action</th></tr></thead><tbody>{list.map(c => <tr key={c.id}><td><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelected(c.id)}/></td><td><div className="table-person"><div className="avatar">{c.name[0]}</div><div><b>{c.name}</b><small>{c.email}</small></div></div></td><td>{jobs.find(j => String(j.id) === String(c.jobId))?.title || "—"}</td><td><select className="stage-select" value={c.stage || "Applied"} onChange={e => moveCandidate(c.id, e.target.value)}>{stages.map(s => <option key={s}>{s}</option>)}</select></td><td><ScoreRing value={c.score}/></td><td>{c.experience} years</td><td><div className="inline"><Button variant="secondary" icon={<Eye size={15}/>} onClick={() => setSelected(c)}>View</Button><button className={`compare-check ${compare.includes(c.id) ? "active" : ""}`} title="Compare candidate" onClick={() => toggleCompare(c.id)}><CheckSquare size={15}/></button>{(user?.role === "company-admin" || user?.role === "recruiter") && <button className="icon-btn" title="Archive candidate" onClick={() => archiveCandidate(c.id, "Archived from Candidates")}><Trash2 size={15}/></button>}</div></td></tr>)}</tbody></table></div>
    <CandidateModal candidate={selected} jobs={jobs} onClose={() => setSelected(null)} save={saveToTalentPool} updateCandidate={updateCandidate} moveCandidate={moveCandidate} isAdmin={user?.role === "company-admin"}/>
    <CompareModal candidates={candidates.filter(c => compare.includes(c.id))} jobs={jobs} open={compareOpen} onClose={() => setCompareOpen(false)}/>
    <AddCandidateModal open={addOpen} onClose={() => setAddOpen(false)} jobs={jobs} onSave={create}/>
  </div>;
}

function CandidateModal({ candidate, jobs, onClose, save, updateCandidate, moveCandidate, isAdmin }) {
  const [note, setNote] = useState("");
  const [tag, setTag] = useState("");
  const [stage, setStage] = useState("Applied");
  React.useEffect(() => { if (candidate) { setNote(candidate.notes || ""); setStage(candidate.stage || "Applied"); } }, [candidate]);
  if (!candidate) return null;
  const tags = candidate.tags || [];
  const saveMeta = () => updateCandidate(candidate.id, { notes: note, tags: [...new Set(tags.concat(tag.trim() ? [tag.trim()] : []))] });
  return <Modal open={!!candidate} title={candidate.name} onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
    <p>{candidate.email}</p><p>{candidate.experience} years · {candidate.education}</p><div className="center"><ScoreRing value={candidate.score || 0} size="lg"/></div>
    <h4>Skills</h4><div className="tags">{candidate.skills?.map(s => <Badge key={s}>{s}</Badge>)}</div>
    <h4>Stage</h4><div className="inline"><select value={stage} onChange={e => setStage(e.target.value)}>{stages.map(s => <option key={s}>{s}</option>)}</select><Button onClick={() => { moveCandidate(candidate.id, stage); onClose(); }}>Update stage</Button></div>
    <h4>Internal Notes</h4><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add private hiring notes..."/><h4>Tags</h4><div className="inline"><input value={tag} onChange={e => setTag(e.target.value)} placeholder="e.g. Strong candidate"/><Button variant="secondary" onClick={saveMeta}><Save size={15}/> Save notes & tag</Button></div><div className="tags">{tags.map(t => <Badge key={t}>{t}</Badge>)}</div>
    {isAdmin && candidate.scoreOverride && <p className="muted">Score override reason: {candidate.scoreOverride.reason}</p>}
    <Button onClick={() => { save(candidate, ["Strong candidate"]); onClose(); }}>Save to Talent Pool</Button>
  </Modal>;
}

function CompareModal({ candidates, jobs, open, onClose }) { return <Modal open={open} title="Compare candidates" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}><div className="compare-grid">{candidates.map(c => <div className="compare-card" key={c.id}><div className="avatar">{c.name[0]}</div><h3>{c.name}</h3><small>{jobs.find(j => String(j.id) === String(c.jobId))?.title || "—"}</small><div className="center"><ScoreRing value={c.score}/></div><b>Experience</b><p>{c.experience} years</p><b>Education</b><p>{c.education}</p><b>Skills</b><div className="tags">{c.skills?.map(s => <Badge key={s}>{s}</Badge>)}</div><b>Stage</b><p>{c.stage}</p></div>)}</div></Modal>; }

function AddCandidateModal({ open, onClose, jobs, onSave }) { const [f, setF] = useState({ name:"", email:"", jobId:jobs[0]?.id||"", experience:3, education:"Bachelor's Degree", skills:"React.js, JavaScript", score:70 }); const set=(k,v)=>setF(x=>({...x,[k]:v})); return <Modal open={open} title="Add candidate" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={()=>{if(!f.name.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))return;onSave(f)}}>Add candidate</Button></>}><label>Name<input value={f.name} onChange={e=>set("name",e.target.value)}/></label><label>Email<input type="email" value={f.email} onChange={e=>set("email",e.target.value)}/></label><label>Job<select value={f.jobId} onChange={e=>set("jobId",e.target.value)}>{jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></label><div className="form-grid"><label>Experience<input type="number" min="0" value={f.experience} onChange={e=>set("experience",e.target.value)}/></label><label>Education<select value={f.education} onChange={e=>set("education",e.target.value)}><option>Bachelor's Degree</option><option>Master's Degree</option><option>PhD</option></select></label></div><label>Skills<input value={f.skills} onChange={e=>set("skills",e.target.value)}/></label><label>Initial DFS score<input type="number" min="0" max="100" value={f.score} onChange={e=>set("score",e.target.value)}/></label></Modal>; }
