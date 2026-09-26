import React from "react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Upload, Mail, UserPlus, ShieldCheck } from "lucide-react";
import { Button, Card } from "../components/UI";
import { useApp } from "../context/AppContext";

export function CompanySetup(){
  const nav=useNavigate(); const {completeCompanySetup}=useApp();
  const [f,setF]=useState({name:"",industry:"Technology",size:"51-200",logo:""}); const [error,setError]=useState("");
  const submit=()=>{if(!f.name.trim()) return setError("Company name is required."); completeCompanySetup(f); nav("/onboarding/plan");};
  return <Onboard title="Set up your company" step="1"><Card className="auth-card wide">
    <label>Company name<input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Hirely Tech Hub" /></label>
    <label>Industry<select value={f.industry} onChange={e=>setF({...f,industry:e.target.value})}><option>Technology</option><option>Finance</option><option>Healthcare</option><option>Retail</option><option>Education</option></select></label>
    <label>Company size<select value={f.size} onChange={e=>setF({...f,size:e.target.value})}><option>1-50</option><option>51-200</option><option>201-500</option><option>500+</option></select></label>
    <label>Company logo<div className="upload"><Upload size={22}/> Upload logo<input type="file" accept="image/*" onChange={e=>setF({...f,logo:e.target.files?.[0]?.name||""})}/>{f.logo&&<small>{f.logo}</small>}</div></label>
    {error&&<div className="form-error">{error}</div>}<Button onClick={submit}>Continue</Button>
  </Card></Onboard>
}

export function Plan(){
  const nav=useNavigate(); const {choosePlan}=useApp(); const [plan,setPlan]=useState("Growth");
  const plans=[["Starter","$49",["Up to 5 active jobs","Basic AI screening","Email support","Candidate messaging"]],["Growth","$129",["Unlimited active jobs","Advanced AI Score Rings","Priority 24/7 support","Talent pipeline automation","Custom interview kits"]],["Enterprise","Custom",["Everything in Growth","Dedicated account manager","SSO & Advanced Security","Custom API integrations"]]];
  return <Onboard title="Select a plan for your team" step="2"><div className="plans">{plans.map(p=><Card className={plan===p[0]?"plan-option selected":"plan-option"} key={p[0]} onClick={()=>setPlan(p[0])}><b>{p[0]}</b><h2>{p[1]}<small>{p[1]!=="Custom"&&"/month"}</small></h2>{p[2].map(x=><p key={x}>✓ {x}</p>)}<Button variant={plan===p[0]?"primary":"secondary"} onClick={()=>{choosePlan(p[0]);nav("/onboarding/team")}}>{p[0]==="Enterprise"?"Contact Sales":"Choose Plan"}</Button></Card>)}</div><Card className="trust"><b>Trust & Security</b><p>All plans include GDPR compliance, data encryption at rest, and 99.9% uptime SLA.</p></Card></Onboard>
}

export function InviteTeam(){
  const nav=useNavigate(); const {invite}=useApp(); const [emails,setEmails]=useState([]); const [email,setEmail]=useState(""); const [error,setError]=useState("");
  const add=()=>{if(!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address."); if(emails.includes(email)) return setError("This email is already invited."); setEmails([...emails,email]); setEmail("");setError("");};
  const send=()=>{emails.forEach(invite);nav("/onboarding/complete")};
  return <Onboard title="Invite your recruitment team" step="3"><Card className="auth-card wide"><p>Add the colleagues who will help manage candidates and streamline your hiring process.</p><label>Team member email<div className="inline"><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="colleague@company.com" onKeyDown={e=>e.key==="Enter"&&add()}/><Button onClick={add} icon={<UserPlus size={15}/>}>Add</Button></div></label>{error&&<div className="form-error">{error}</div>}<h3>Added Invites <small>{emails.length} members ready</small></h3><div className="tags">{emails.map(e=><span className="tag" key={e}>{e}<button onClick={()=>setEmails(emails.filter(x=>x!==e))}>×</button></span>)}</div><Button onClick={send}>Send Invitations</Button><button className="text-btn center" onClick={()=>nav("/onboarding/complete")}>Skip for now</button></Card></Onboard>
}

export function Complete(){const nav=useNavigate(); return <Onboard title="You're ready to hire" step="4"><Card className="complete"><CheckCircle2 size={54}/><h2>Company workspace created</h2><p>Your team can now post jobs and manage candidates.</p><div className="inline"><Button variant="secondary" onClick={()=>nav("/jobs/new")}>Post first job</Button><Button onClick={()=>nav("/dashboard")}>Go to dashboard</Button></div></Card></Onboard>}

export function InviteSetup(){
  const nav=useNavigate(); const [params]=useSearchParams(); const token=params.get("token"); const {team,acceptInvite}=useApp(); const member=team.find(x=>x.token===token)||team.find(x=>x.status==="Pending");
  const [name,setName]=useState(member?.name||""); const [password,setPassword]=useState(""); const [error,setError]=useState("");
  const submit=()=>{if(!member)return setError("This invitation is invalid or expired."); if(password.length<8)return setError("Password must contain at least 8 characters."); if(!acceptInvite(member.id,name,password))return setError("Complete the setup fields."); nav("/dashboard")};
  return <div className="auth-page"><Card className="auth-card"><div className="center"><ShieldCheck size={36}/><h1>Set up your recruiter account</h1><p>Your invitation is tied to this company.</p></div>{member?<><label>Email<input value={member.email} readOnly /></label><label>Full name<input value={name} onChange={e=>setName(e.target.value)} /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" /></label>{error&&<div className="form-error">{error}</div>}<Button onClick={submit}>Set password and continue</Button></>:<div className="form-error">Invitation not found or expired.</div>}<p className="center"><Mail size={14}/> Invitation links expire after 72 hours.</p></Card></div>
}

function Onboard({title,step,children}){return <div className="onboard"><div className="onboard-head"><b>Hirely</b><span>Step {step} of 4</span><div className="progress"><i style={{width:`${Number(step)*25}%`}}/></div><span> </span></div><main><h1>{title}</h1>{children}</main></div>}
