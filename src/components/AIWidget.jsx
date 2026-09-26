import React from "react";
import { Bot, X, Sparkles } from "lucide-react";
import { useState } from "react";
export default function AIWidget(){
 const [open,setOpen]=useState(false);
 return <><button className="ai-fab" onClick={()=>setOpen(true)}><Bot size={20}/></button>{open&&<div className="ai-panel"><div className="ai-head"><div><b>AI Recruiter Insights</b><small>Hirely AI Assistant</small></div><button type="button" className="icon-btn" aria-label="Close AI insights" onClick={()=>setOpen(false)}><X size={18}/></button></div><div className="ai-alert"><Sparkles size={17}/><div><b>Bottleneck Detected</b><p>Candidates are spending longer in the Technical Interview stage. Consider reviewing reviewer availability.</p></div></div><h5>RECOMMENDED ACTIONS</h5><button className="ai-action">Bulk follow-up screening <span>12 candidates pending response</span></button></div>}</>
}
