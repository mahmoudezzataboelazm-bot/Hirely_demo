import React from "react";
import { useState } from "react";
import { UserPlus, ShieldCheck, RotateCcw, UserX, Link2, Copy } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Badge, Button, Card, Modal, ConfirmDelete } from "../components/UI";

export default function Team() {
  const { team, invite, deactivateMember, reactivateMember, resendInvite, changeRole } = useApp();
  const [email, setEmail] = useState(""); const [modal, setModal] = useState(false); const [error, setError] = useState(""); const [target, setTarget] = useState(null); const [roleTarget,setRoleTarget]=useState(null);
  const send = () => { if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address."); if (!invite(email)) return setError("The invitation could not be created."); setEmail(""); setError(""); setModal(false); };
  const copyInvite = member => navigator.clipboard?.writeText(`${window.location.origin}/invite/setup?token=${member.token}`);
  return <div><div className="page-head"><div><h1>Team</h1><p>Manage recruiters and role-based access.</p></div><Button icon={<UserPlus size={16}/>} onClick={()=>setModal(true)}>Invite recruiter</Button></div>
    <Card><div className="table-card no-border"><table><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Access</th><th>Actions</th></tr></thead><tbody>{team.map(m=><tr key={m.id}><td><div className="table-person"><div className="avatar">{m.name?.[0]||"R"}</div><div><b>{m.name}</b><small>{m.email}</small></div></div></td><td>{m.role}</td><td><Badge tone={m.status==="Active"?"success":m.status==="Deactivated"?"danger":"warning"}>{m.status}</Badge></td><td>{m.role==="Recruiter"?"Own jobs, pipeline, and saved candidates":"Full company access"}</td><td><div className="inline">{m.status==="Pending"&&<><Button variant="secondary" onClick={()=>resendInvite(m.id)}>Resend</Button><button className="icon-btn" title="Copy invitation link" onClick={()=>copyInvite(m)}><Copy size={15}/></button></>}{m.status!=="Pending"&&<Button variant="secondary" onClick={()=>setRoleTarget(m)}><ShieldCheck size={14}/> Change role</Button>}{m.status==="Deactivated"?<Button onClick={()=>reactivateMember(m.id)} icon={<RotateCcw size={14}/>}>Reactivate</Button>:<Button variant="danger" onClick={()=>setTarget(m)} icon={<UserX size={14}/>}>Deactivate</Button>}</div></td></tr>)}</tbody></table></div></Card>
    <Modal open={modal} title="Invite your recruitment team" onClose={()=>setModal(false)} footer={<><Button variant="secondary" onClick={()=>setModal(false)}>Cancel</Button><Button onClick={send}>Send invitation</Button></>}><label>Team member email<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="colleague@company.com" /></label>{error&&<div className="form-error">{error}</div>}<p className="muted">Each invitation has a one-time setup token and expires after 72 hours. Recruiters do not use standard registration.</p></Modal>
    <ConfirmDelete open={!!target} name={target?.name} onClose={()=>setTarget(null)} onConfirm={()=>{deactivateMember(target.id);setTarget(null)}} />
    <Modal open={!!roleTarget} title={`Change role for ${roleTarget?.name}`} onClose={()=>setRoleTarget(null)} footer={<Button onClick={()=>{changeRole(roleTarget.id,roleTarget.role==="Recruiter"?"Company Admin":"Recruiter");setRoleTarget(null)}}>Confirm role change</Button>}><p>The new role takes effect on the member's next login.</p><div className="center"><Link2 size={24}/><p>{roleTarget?.role==="Recruiter"?"Recruiter → Company Admin":"Company Admin → Recruiter"}</p></div></Modal>
  </div>;
}
