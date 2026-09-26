import React from "react";
import { useState } from "react";
import { ChevronDown, MoreVertical, X, CheckCircle2, AlertCircle, Search, Plus, Trash2, Pencil, ArrowRight, CalendarDays, Mail, UserPlus } from "lucide-react";

export function Button({children, variant="primary", icon, onClick, type="button", disabled=false, className=""}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`btn btn-${variant} ${className}`}>{icon}{children}</button>
}
export function Card({children,className=""}){return <div className={`card ${className}`}>{children}</div>}
export function Badge({children,tone="neutral"}){return <span className={`badge badge-${tone}`}>{children}</span>}
export function Modal({open,title,onClose,children,footer}) {
  if(!open) return null;
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><div className="modal-body">{children}</div>{footer&&<div className="modal-foot">{footer}</div>}</div></div>
}
export function StatCard({label,value,trend,icon}){return <Card className="stat-card"><div className="stat-icon">{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{trend&&<div className="trend">{trend}</div>}</Card>}
export function Empty({title="Nothing here yet",text="Add your first item to get started.",action}){return <Card className="empty"><h3>{title}</h3><p>{text}</p>{action}</Card>}
export function ScoreRing({value=0,size="md"}){return <div className={`score-ring ${size}`} style={{"--score":`${value*3.6}deg`}}><span>{value}%</span></div>}
export function Dropdown({value,onChange,options=[]}){return <select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>}
export function ConfirmDelete({open,onClose,onConfirm,name}){return <Modal open={open} title="Delete item" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={onConfirm} icon={<Trash2 size={16}/>}>Delete</Button></>}><p>Delete <b>{name}</b>? This action cannot be undone.</p></Modal>}
export function SearchInput({value,onChange,placeholder="Search..."}){return <div className="search-input"><Search size={17}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>}
export function Kebab({onEdit,onDelete,onToggle,canDelete=true}){const [open,setOpen]=useState(false); return <div className="kebab"><button className="icon-btn" onClick={()=>setOpen(x=>!x)}><MoreVertical size={18}/></button>{open&&<div className="menu"><button onClick={()=>{setOpen(false);onEdit?.()}}><Pencil size={15}/>Edit</button>{onToggle&&<button onClick={()=>{setOpen(false);onToggle()}}>Pause/Resume</button>}{canDelete&&<button className="danger-text" onClick={()=>{setOpen(false);onDelete?.()}}><Trash2 size={15}/>Delete</button>}</div>}</div>}
export const formValue = e => e.target.value;
