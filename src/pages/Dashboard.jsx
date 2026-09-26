import React from "react";
import { BarChart3, Clock3, Target, Users, ArrowUpRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Card, StatCard, ScoreRing, Button } from "../components/UI";
import AIWidget from "../components/AIWidget";

export default function Dashboard(){
 const {jobs,candidates}=useApp();
 return <div><div className="page-head"><div><h1>Dashboard</h1><p>Review your recruitment activity and next actions.</p></div><Button icon={<ArrowUpRight size={16}/>}>View reports</Button></div>
 <div className="stats-grid"><StatCard label="Open Jobs" value={jobs.filter(j=>!["Draft","Paused","Hired"].includes(j.status)).length} trend="+12% vs last month" icon={<BriefcaseIcon/>}/><StatCard label="Candidates" value={candidates.length+1240} trend="+8.4%" icon={<Users size={20}/>}/><StatCard label="Time to Hire" value="18 Days" trend="-12%" icon={<Clock3 size={20}/>}/><StatCard label="Offer Acceptance" value="88.5%" trend="+4.2%" icon={<Target size={20}/>}/></div>
 <div className="grid-2"><Card><div className="card-head"><div><h3>Hiring Funnel</h3><p>Candidate conversion per stage</p></div></div><div className="funnel">{[["Applied",1240,100],["Screening",642,52],["Interview",184,28],["Offer",42,22]].map(([s,n,p])=><div className="funnel-row" key={s}><div><b>{s}</b><span>{n}</span></div><div className="bar"><i style={{width:`${p}%`}}/></div></div>)}</div></Card>
 <Card><div className="card-head"><div><h3>Source of Hire</h3><p>Performance by acquisition channel</p></div></div><div className="donut"><div><b>1,240</b><small>TOTAL LEADS</small></div></div><div className="legend">{[["LinkedIn","45%"],["Referrals","25%"],["Agencies","20%"],["Others","10%"]].map(x=><span key={x[0]}><i/>{x[0]} <em>{x[1]}</em></span>)}</div></Card></div>
 <Card><div className="card-head"><div><h3>Recent Jobs</h3><p>Current hiring activity</p></div></div><div className="mini-list">{jobs.slice(0,5).map(j=><div className="mini-row" key={j.id}><div><b>{j.title}</b><small>{j.department} · {j.location}</small></div><div><ScoreRing value={j.aiMatch}/></div></div>)}</div></Card><AIWidget/></div>
}
function BriefcaseIcon(){return <BarChart3 size={20}/>}
