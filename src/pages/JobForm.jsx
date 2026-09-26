import React from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info, Award, Plus, X, Sparkles, Eye, Save, GitBranch } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Button, Card } from "../components/UI";
import { weightsTotal } from "../utils/validation";

const availableStages = ["Applied","Screening","Shortlisted","Interview","Assessment","Offer","Hired","Rejected"];

const empty = { title: "", department: "Engineering", location: "Dubai, UAE", minSalary: "", maxSalary: "", deadline: "", description: "", skills: ["React.js", "TypeScript"], experience: 5, education: "Bachelor's Degree", weights: { skills: 40, experience: 30, qualifications: 20, custom: 10 }, pipelineStages: ["Applied", "Screening", "Shortlisted", "Interview", "Assessment", "Offer", "Hired", "Rejected"], autoAdvance: 80, autoReject: 40, interviewAutoNotify: true };

export default function JobForm() {
  const { id } = useParams();
  const { jobs, addJob, updateJob } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [skill, setSkill] = useState("");
  useEffect(() => { if (id) { const j = jobs.find(x => x.id === id); if (j) setForm({ ...empty, ...j, weights: { ...empty.weights, ...(j.weights || {}) } }); } }, [id, jobs]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const total = useMemo(() => weightsTotal(form.weights), [form.weights]);
  const submit = (publish = true) => {
    setError("");
    if (!form.title.trim()) return setError("Job title is required.");
    if (!form.description.trim() && publish) return setError("Job description is required before publishing.");
    if (!form.skills.length && publish) return setError("Add at least one required skill.");
    if (Number(form.minSalary) && Number(form.maxSalary) && Number(form.minSalary) > Number(form.maxSalary)) return setError("Minimum salary cannot exceed maximum salary.");
    if (publish && total !== 100) return setError("DFS scoring weights must total exactly 100%.");
    if (publish && form.pipelineStages.length < 2) return setError("Select at least two pipeline stages.");
    if (publish && Number(form.autoReject) >= Number(form.autoAdvance)) return setError("Auto-reject threshold must be lower than auto-advance threshold.");
    const payload = { ...form, status: publish ? "Open" : "Draft", weights: Object.fromEntries(Object.entries(form.weights).map(([k, v]) => [k, Number(v)])) };
    if (id) updateJob(id, payload); else addJob(payload);
    navigate("/jobs");
  };
  const addSkill = () => { if (skill.trim() && !form.skills.includes(skill.trim())) { set("skills", [...form.skills, skill.trim()]); setSkill(""); } };
  return <div><div className="subhead"><button className="icon-btn" onClick={() => navigate("/jobs")}><ArrowLeft /></button><div><h2>{id ? "Edit Job" : "Create New Job Posting"}</h2><small>{id ? `ID: ${id}` : "ID: REQ-NEW"}</small></div><div className="subhead-actions"><Button variant="secondary" onClick={() => submit(false)} icon={<Save size={16} />}>Save as Draft</Button><Button onClick={() => submit(true)}>Publish Posting</Button></div></div>
    {error && <div className="form-error">{error}</div>}
    <div className="form-layout"><div>
      <Card><h3><Info size={18} /> Job Details</h3><div className="form-grid"><label>Job Title<input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Senior Software Engineer" /></label><label>Department<select value={form.department} onChange={e => set("department", e.target.value)}><option>Engineering</option><option>Design</option><option>Growth</option><option>People Ops</option><option>Success</option></select></label><label>Location<input value={form.location} onChange={e => set("location", e.target.value)} /></label><label>Salary Range (Monthly)<div className="inline"><input type="number" value={form.minSalary} onChange={e => set("minSalary", e.target.value)} placeholder="Min" /><input type="number" value={form.maxSalary} onChange={e => set("maxSalary", e.target.value)} placeholder="Max" /></div></label><label>Application Deadline<input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} /></label><label className="full">Job Description<textarea rows="7" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the role, responsibilities, and team culture..." /></label></div></Card>
      <Card><h3><Award size={18} /> Requirements</h3><label>Required Skill Tags<div className="tag-input">{form.skills.map(s => <span className="tag" key={s}>{s}<button onClick={() => set("skills", form.skills.filter(x => x !== s))}><X size={13} /></button></span>)}<input value={skill} onChange={e => setSkill(e.target.value)} onKeyDown={e => e.key === "Enter" && addSkill()} placeholder="Add skill" /><button className="add-tag" onClick={addSkill}><Plus size={14} />Add Skill</button></div></label><label>Minimum Experience (Years)<div className="range-line"><input type="range" min="0" max="15" value={form.experience} onChange={e => set("experience", Number(e.target.value))} /><b>{form.experience >= 5 ? "5+" : form.experience} Years</b></div></label><label>Education Level<select value={form.education} onChange={e => set("education", e.target.value)}><option>Bachelor's Degree</option><option>Master's Degree</option><option>PhD</option><option>Any</option></select></label></Card>
      <Card><h3><GitBranch size={18} /> Pipeline & Automation</h3><label>Auto-advance threshold<div className="range-line"><input type="range" min="50" max="100" value={form.autoAdvance} onChange={e => set("autoAdvance", Number(e.target.value))} /><b>{form.autoAdvance}</b></div></label><label>Auto-reject threshold<div className="range-line"><input type="range" min="0" max="70" value={form.autoReject} onChange={e => set("autoReject", Number(e.target.value))} /><b>{form.autoReject}</b></div></label><label className="check-row"><input type="checkbox" checked={form.interviewAutoNotify} onChange={e => set("interviewAutoNotify", e.target.checked)} /> Notify applicant when moved to Interview</label><h4>Pipeline stages</h4><div className="stage-checks">{availableStages.map(s => <label className="check-row" key={s}><input type="checkbox" checked={form.pipelineStages.includes(s)} onChange={e => set("pipelineStages", e.target.checked ? [...form.pipelineStages, s] : form.pipelineStages.filter(x => x !== s))} /> {s}</label>)}</div></Card>
      <Card><div className="card-head"><h3>DFS Scoring Weights <span className={total === 100 ? "success-pill" : "danger-pill"}>TOTAL: {total}%</span></h3></div>{Object.entries(form.weights).map(([k, v]) => <div className="weight-row" key={k}><span>{k[0].toUpperCase() + k.slice(1)}</span><input type="range" min="0" max="100" value={v} onChange={e => set("weights", { ...form.weights, [k]: Number(e.target.value) })} /><input className="weight-num" type="number" min="0" max="100" value={v} onChange={e => set("weights", { ...form.weights, [k]: Number(e.target.value) })} /><b>%</b></div>)}<div className="ai-tip"><Sparkles size={16} /> AI Insights: weighting must equal 100% before a job can go live.</div></Card>
    </div><aside className="preview"><div className="preview-head">LIVE PREVIEW<h2>{form.title || "Senior Software Engineer"}</h2><p>Hirely Tech Hub</p></div><div className="preview-body"><p>⌖ {form.location}</p><p>▣ {form.minSalary || "25,000"} - {form.maxSalary || "35,000"} AED</p><p>◷ Full-time · {form.deadline || "2 Weeks left"}</p><hr /><p>Ideal Match Profile</p><div className="center"><div className="big-ring">82%</div></div><Button variant="secondary" icon={<Eye size={16} />} onClick={() => alert("Public preview uses the same job data when the backend is connected.")}>Full Public Preview</Button></div></aside></div></div>;
}
