import React, {createContext,useContext,useMemo,useState,useEffect} from 'react'

// Reset demo data for Candidates and Talent Pool so they can be tested from a clean state.
if (localStorage.getItem('hirely_demo_data_v11') !== '1') {
  localStorage.removeItem('hirely_candidates');
  localStorage.removeItem('hirely_talent_pool');
  localStorage.removeItem('hirely_reported_issues');
  localStorage.removeItem('hirely_recruiter_reported_issues');
  localStorage.removeItem('hirely_demo_data_v3');
  localStorage.removeItem('hirely_demo_data_v9');
  localStorage.setItem('hirely_demo_data_v11', '1');
}
import {BrowserRouter,useLocation,useNavigate,useSearchParams,Routes,Route,Navigate,Link} from 'react-router-dom'
import {LayoutDashboard,BriefcaseBusiness,Users,KanbanSquare,BarChart3,Database,UserRound,CreditCard, Megaphone,Settings,Search,Bell,Plus,MoreHorizontal,ChevronRight,ChevronLeft,Trash2,Pause,Play,Edit3,Mail,UserPlus,ShieldCheck,LogOut,X,Check,AlertCircle,CalendarDays,Sparkles,SlidersHorizontal,ArrowUpRight,Download,Eye,Clock3,Camera,ArrowRight,ArrowLeft,CheckCircle2,LockKeyhole,Bookmark,Cpu} from 'lucide-react'
import './styles.css'
import AIWidget from './components/AIWidget'
import SuperAdminApp from './superadmin/SuperAdminApp'
import {
  listPublicJobs, getPublicJob, submitApplication, syncApplicantFromCandidates,
  syncApplicationsWithJobs, withdrawApplication as bridgeWithdraw, respondToInterview,
  syncProfileToCandidates, myApplications, hasApplied, calculateMatchScore,
  listSkills, getDFSDefaults, isFeatureEnabled, isLocalTenantSuspended, logAudit
} from './services/hirelyBridge'

// One-time reset: the Applicant portal now reads the real company job board,
// so the old standalone applicant demo data is cleared.
if (localStorage.getItem('hirely_linked_roles_v1') !== '1') {
  localStorage.removeItem('hirely_applicant_applications');
  localStorage.removeItem('hirely_applicant_notifications');
  localStorage.removeItem('hirely_applicant_saved_jobs');
  localStorage.removeItem('hirely_applicant_unread');
  localStorage.setItem('hirely_linked_roles_v1', '1');
}

const initialJobs=[
{id:1,title:'Senior Frontend Developer',department:'Engineering',location:'Cairo, Egypt',type:'Full-time',status:'Open',applicants:24,match:87,created:'Aug 28, 2026',owner:'Omar Ashraf',salary:'35k - 50k EGP',description:'Build and maintain React interfaces for the Hirely platform.',requirements:['React','JavaScript','REST APIs','Git'],weights:{skills:40,experience:30,education:15,location:15}},
{id:2,title:'Product Designer',department:'Design',location:'Remote',type:'Full-time',status:'Open',applicants:18,match:82,created:'Aug 24, 2026',owner:'Sara Ahmed',salary:'30k - 45k EGP',description:'Design product experiences and work with engineering.',requirements:['Figma','UX Research','Design Systems'],weights:{skills:45,experience:30,education:10,location:15}},
{id:3,title:'Backend Engineer',department:'Engineering',location:'Cairo, Egypt',type:'Full-time',status:'Paused',applicants:31,match:79,created:'Aug 18, 2026',owner:'Omar Ashraf',salary:'40k - 60k EGP',description:'Build APIs and services for the hiring platform.',requirements:['Node.js','Express','SQL','Docker'],weights:{skills:45,experience:35,education:10,location:10}}
]
const initialCandidates=[
{id:1,name:'Sara Ahmed',email:'sara@example.com',job:'Senior Frontend Developer',stage:'Shortlisted',score:84,skills:91,primarySkills:['React','JavaScript','REST APIs'],experience:78,education:86,location:82,owner:'Omar Ashraf',applied:'Sep 1, 2026',feedback:'Strong React profile with relevant product experience.',activity:['Application submitted — Sep 1, 2026']},
{id:2,name:'Omar Khaled',email:'omar@example.com',job:'Senior Frontend Developer',stage:'Interview',score:76,skills:80,primarySkills:['React','Node.js','System Design'],experience:74,education:70,location:82,owner:'Omar Ashraf',applied:'Aug 30, 2026',feedback:'Good technical fit. Review system design experience.',activity:['Application submitted — Aug 30, 2026']},
{id:3,name:'Mariam Ali',email:'mariam@example.com',jobId:2,job:'Product Designer',stage:'Screening',score:68,skills:74,primarySkills:['Figma','UX Research','Design Systems'],experience:65,education:70,location:63,owner:'Sara Ahmed',applied:'Aug 29, 2026',feedback:'Portfolio shows strong visual design.',activity:['Application submitted — Aug 29, 2026']},
{id:4,name:'Youssef Adel',email:'youssef@example.com',job:'Senior Frontend Developer',stage:'Rejected',score:32,skills:28,primarySkills:['HTML','CSS','JavaScript'],experience:35,education:44,location:50,owner:'Omar Ashraf',applied:'Aug 27, 2026',feedback:'Skills match is below the role requirement.',activity:['Application submitted — Aug 27, 2026']}
]
const initialTeam=[
{id:1,name:'Omar Ashraf',email:'omar.ashraf@hirely.io',role:'Recruiter',status:'Active',assignedJobs:8,lastActive:'1 hour ago'},
{id:2,name:'Mona Hassan',email:'mona.hassan@hirely.io',role:'Recruiter',status:'Active',assignedJobs:12,lastActive:'5 hours ago'},
{id:3,name:'Yara Ali',email:'yara.ali@hirely.io',role:'Recruiter',status:'Pending',assignedJobs:0,lastActive:'-'},
{id:4,name:'Sarah Al-Farsi',email:'sarah.farsi@hirely.io',role:'Admin',status:'Active',assignedJobs:12,lastActive:'2 mins ago'},
{id:5,name:'James Wilson',email:'j.wilson@hirely.io',role:'Admin',status:'Active',assignedJobs:4,lastActive:'Yesterday'}
]
const initialAnnouncements=[
{title:'AI insights are now available',date:'Sep 2, 2026',body:'AI Recruiter Insights can now summarize pipeline bottlenecks and recommend actions.'},
{title:'Scheduled maintenance',date:'Aug 28, 2026',body:'The platform will be unavailable for a short maintenance window.'},
{title:'New analytics report',date:'Aug 20, 2026',body:'Company Analytics now includes source of hire and stage drop-off metrics.'}
]

const AppContext=createContext(null)
// Stages a candidate leaves the active Kanban board for (DEP-20): the record
// and score stay in the data for analytics, they just stop occupying a column.
const ACTIVE_BOARD_EXCLUDED=['Withdrawn','Archived','Closed']
function jobsForInitialCandidate(title){
 const match=initialJobs.find(j=>String(j.title).toLowerCase()===String(title||'').toLowerCase());
 return match?.id ?? null;
}

function Provider({children}){
 const [jobs,setJobs]=useState(()=>JSON.parse(localStorage.getItem('hirely_jobs')||'null')||initialJobs)
 const [candidates,setCandidates]=useState(()=>{const saved=JSON.parse(localStorage.getItem('hirely_candidates')||'null')||initialCandidates;return saved.map(c=>{const jobId=c.jobId||jobsForInitialCandidate(c.job);const job=initialJobs.find(j=>String(j.id)===String(jobId));return {...c,jobId,primarySkills:c.primarySkills?.length?c.primarySkills:(job?.requirements||['JavaScript','Communication']).slice(0,4)}})})
 const [team,setTeam]=useState(()=>{const saved=JSON.parse(localStorage.getItem('hirely_team')||'null')||initialTeam;const normalized=saved.map(m=>({...m,role:m.role==='Company Admin'?'Admin':m.role,assignedJobs:m.assignedJobs??0,lastActive:m.lastActive??'Sep 2026'}));return normalized.some(m=>m.role==='Admin')?normalized:[...normalized,...initialTeam.filter(m=>m.role==='Admin')]})
 const [announcements,setAnnouncements]=useState(()=>JSON.parse(localStorage.getItem('hirely_announcements')||'null')||initialAnnouncements)
 const [profile,setProfileState]=useState(()=>{const role=localStorage.getItem('hirely_role');const key=role==='recruiter'?'hirely_recruiter_profile':'hirely_profile';return JSON.parse(localStorage.getItem(key)||'null')||(role==='recruiter'?{name:'Omar Ashraf',email:'omar.ashraf@hirely.io',company:'Hirely Tech Hub',title:'Recruiter',phone:'+20 100 000 0000'}:{name:'Heba Mohamed',email:'',company:'',title:'Company Admin',phone:'+20 100 123 4567'})}); const setProfile=v=>setProfileState(prev=>{const next=typeof v==='function'?v(prev):v;localStorage.setItem(currentRole()==='recruiter'?'hirely_recruiter_profile':'hirely_profile',JSON.stringify(next));return next}); const [company,setCompanyState]=useState(()=>JSON.parse(localStorage.getItem('hirely_company')||'null')||{name:'',industry:'Technology',size:'11-50',logo:null,plan:'Growth'}); const setCompany=v=>setCompanyState(prev=>{const next=typeof v==='function'?v(prev):v;localStorage.setItem('hirely_company',JSON.stringify(next));return next}); const recruiterDefaultNotifications=[{id:'r1',title:'New candidate assigned',body:'Sara Ahmed is assigned to your Senior Frontend Developer job.',time:'10 min ago',read:false,route:'/candidates'},{id:'r2',title:'Interview scheduled',body:'Omar Khaled has an interview request pending.',time:'1 hour ago',read:false,route:'/pipeline'},{id:'r3',title:'Pipeline update',body:'A candidate moved in one of your assigned jobs.',time:'Today',read:true,route:'/pipeline'}]; const [notifications,setNotifications]=useState(()=>currentRole()==='recruiter'?(JSON.parse(localStorage.getItem('hirely_recruiter_notifications')||'null')||recruiterDefaultNotifications):(JSON.parse(localStorage.getItem('hirely_notifications')||'null')||[{id:1,title:'New candidate applied',body:'Sara Ahmed applied for Senior Frontend Developer.',time:'10 min ago',read:false,route:'/candidates'},{id:2,title:'Interview scheduled',body:'Omar Khaled has an interview request pending.',time:'1 hour ago',read:false,route:'/pipeline'},{id:3,title:'AI Recruiter Insight',body:'Assessment has the highest drop-off at 37%.',time:'Today',read:true,route:'/analytics'}])); const updateNotifications=v=>{setNotifications(v);const key=currentRole()==='recruiter'?'hirely_recruiter_notifications':'hirely_notifications';localStorage.setItem(key,JSON.stringify(v))}
 const [adminReportedIssues,setAdminReportedIssues]=useState(()=>JSON.parse(localStorage.getItem('hirely_reported_issues')||'null')||[]); const [recruiterReportedIssues,setRecruiterReportedIssues]=useState(()=>JSON.parse(localStorage.getItem('hirely_recruiter_reported_issues')||'null')||[]); const reportedIssues=currentRole()==='recruiter'?recruiterReportedIssues:adminReportedIssues; const submitIssue=issue=>{const next={...issue,id:`HIR-${String(Date.now()).slice(-6)}`,status:'Open',createdAt:new Date().toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}),role:currentRole()}; const all=[next,...reportedIssues]; if(currentRole()==='recruiter'){setRecruiterReportedIssues(all);persist('hirely_recruiter_reported_issues',all)}else{setAdminReportedIssues(all);persist('hirely_reported_issues',all)} const nextNotifications=[{id:Date.now(),title:'Report submitted',body:`Your issue ${next.id} was submitted to Hirely Support.`,time:'Just now',read:false,route:'/support/reports'},...notifications];updateNotifications(nextNotifications);return next.id}
 const persist=(key,value)=>localStorage.setItem(key,JSON.stringify(value))
 const updateJobs=v=>{setJobs(v);persist('hirely_jobs',v);syncApplicationsWithJobs(v)}
 const updateCandidates=v=>{
   const previous=candidates;
   let next=typeof v==='function'?v(previous):v;
   next=next.map(candidate=>{
     const old=previous.find(x=>x.id===candidate.id);
     const job=jobForCandidate(candidate,jobs);
     const rule=job?.stageAutomation?.[candidate.stage];
     if(rule?.action==='Auto-reject' && Number(candidate.score||0)<=Number(rule.threshold??40) && candidate.stage!=='Rejected' && candidate.stage!=='Hired'){
       return {...candidate,stage:'Rejected',applicationStage:'Rejected',autoDecision:{type:'Auto-reject',threshold:Number(rule.threshold??40),at:new Date().toISOString()},activity:[`Automatically rejected by job rule at ${rule.threshold}% threshold`,...(candidate.activity||[])]};
     }
     if(rule?.action==='Auto-advance' && Number(candidate.score||0)>=Number(rule.threshold??80) && job?.pipeline?.length){
       const index=job.pipeline.indexOf(candidate.stage);
       const nextStage=index>=0?job.pipeline[index+1]:null;
       if(nextStage && nextStage!==candidate.stage){
         return {...candidate,stage:nextStage,applicationStage:nextStage,autoDecision:{type:'Auto-advance',from:candidate.stage,to:nextStage,threshold:Number(rule.threshold??80),at:new Date().toISOString()},activity:[`Automatically advanced to ${nextStage} by job rule at ${rule.threshold}% threshold`,...(candidate.activity||[])]};
       }
     }
     return candidate;
   });
   next.forEach(candidate=>{
     const old=previous.find(x=>x.id===candidate.id);
     if(!old)return;
     const owner=candidate.owner;
     if(old.stage!==candidate.stage){
       const entry=notificationEntry('Pipeline update',`${candidate.name} moved to ${candidate.stage}.`,'/pipeline');
       pushRoleNotification('company-admin',entry);
       if(owner)pushRoleNotification('recruiter',{...entry,body:`${candidate.name} moved to ${candidate.stage} in your job.`});
     }
     if(old.statusUpdate?.at!==candidate.statusUpdate?.at){
       pushRoleNotification('recruiter',notificationEntry('Applicant status update',`Status update prepared for ${candidate.name}.`,'/candidates'));
     }
     if(old.interview?.at!==candidate.interview?.at || (!old.interview && candidate.interview)){
       pushRoleNotification('recruiter',notificationEntry('Interview scheduled',`${candidate.name} has an interview request for ${candidate.interview?.date||'the selected date'} at ${candidate.interview?.time||'the selected time'}.`,'/pipeline'));
       pushRoleNotification('company-admin',notificationEntry('Interview scheduled',`${candidate.name} has an interview scheduled by ${candidate.interview?.by||'a recruiter'}.`,'/pipeline'));
     }
   });
   setCandidates(next);persist('hirely_candidates',next);
   // Mirror every recruiter / company-admin action into the applicant portal.
   syncApplicantFromCandidates(next);
 }
 // An application submitted from the Applicant portal writes straight to
 // localStorage, so reload the ATS state when that happens.
 useEffect(()=>{
   // The applicant portal reads the shared store directly, so make sure the
   // seeded jobs/candidates exist there from the first render.
   if(!localStorage.getItem('hirely_jobs'))persist('hirely_jobs',jobs);
   if(!localStorage.getItem('hirely_candidates'))persist('hirely_candidates',candidates);
   const sync=()=>{const stored=JSON.parse(localStorage.getItem('hirely_candidates')||'null');if(Array.isArray(stored))setCandidates(stored)};
   const syncJobs=()=>{const stored=JSON.parse(localStorage.getItem('hirely_jobs')||'null');if(Array.isArray(stored))setJobs(stored)};
   // The Super Admin portal writes to the same store (suspension, plan
   // override, announcements, user status), so reload when it does.
   const syncCompany=()=>{const stored=JSON.parse(localStorage.getItem('hirely_company')||'null');if(stored)setCompanyState(stored)};
   const syncTeam=()=>{const stored=JSON.parse(localStorage.getItem('hirely_team')||'null');if(Array.isArray(stored))setTeam(stored)};
   const syncAnnouncements=()=>{const stored=JSON.parse(localStorage.getItem('hirely_announcements')||'null');if(Array.isArray(stored))setAnnouncements(stored)};
   const syncAll=()=>{sync();syncJobs();syncCompany();syncTeam();syncAnnouncements()};
   window.addEventListener('hirely-candidates-change',sync);
   window.addEventListener('hirely-jobs-change',syncJobs);
   window.addEventListener('hirely-company-change',syncCompany);
   window.addEventListener('hirely-team-change',syncTeam);
   window.addEventListener('hirely-announcements-change',syncAnnouncements);
   window.addEventListener('storage',syncAll);
   return()=>{
     window.removeEventListener('hirely-candidates-change',sync);
     window.removeEventListener('hirely-jobs-change',syncJobs);
     window.removeEventListener('hirely-company-change',syncCompany);
     window.removeEventListener('hirely-team-change',syncTeam);
     window.removeEventListener('hirely-announcements-change',syncAnnouncements);
     window.removeEventListener('storage',syncAll);
   };
 },[]);
 const updateTeam=v=>{setTeam(v);persist('hirely_team',v)}
 const updateAnnouncements=v=>{setAnnouncements(v);persist('hirely_announcements',v)}
 return <AppContext.Provider value={{jobs,updateJobs,candidates,updateCandidates,team,updateTeam,announcements,updateAnnouncements,profile,setProfile,company,setCompany,notifications,updateNotifications,reportedIssues,submitIssue,closeJob:id=>updateJobs(jobs.map(j=>String(j.id)===String(id)?{...j,status:'Closed'}:j))}}>{children}</AppContext.Provider>
}
const useApp=()=>useContext(AppContext)
function currentRole(){return localStorage.getItem('hirely_role')||'company-admin'}
function recruiterSession(){return JSON.parse(localStorage.getItem('hirely_recruiter_session')||'null')||{name:'Omar Ashraf',email:'omar.ashraf@hirely.io'} }
function recruiterName(){return recruiterSession().name||'Omar Ashraf'}
function recruiterJobs(jobs){const name=recruiterName();return jobs.filter(j=>j.assignedTo===name || j.owner===name || j.createdBy===name)}
function recruiterCandidates(candidates,jobs){const ids=new Set(recruiterJobs(jobs).map(j=>String(j.id)));return candidates.filter(c=>ids.has(String(c.jobId)) || c.owner===recruiterName())}
function jobForCandidate(candidate,jobs){return jobs.find(j=>String(j.id)===String(candidate.jobId))||jobs.find(j=>String(j.title).toLowerCase()===String(candidate.job||'').toLowerCase())}
function notificationEntry(title,body,route){return {id:`n-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,title,body,time:'Just now',read:false,route}}
function pushRoleNotification(role,entry){const key=role==='recruiter'?'hirely_recruiter_notifications':'hirely_notifications';const current=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify([entry,...current].slice(0,30)))}
function Logo(){const recruiter=currentRole()==='recruiter';return <Link to="/dashboard" className="logo"><span className="logo-mark">H</span><span className="logo-copy"><b>Hirely</b><small>{recruiter?'Recruiter Portal':'Company Admin Portal'}</small></span></Link>}
// Navigation is filtered by the plan's feature flags, which the Super Admin
// controls per subscription tier (DEP-02).
const adminNav=[
['/dashboard','Dashboard',LayoutDashboard],['/jobs','Jobs',BriefcaseBusiness],['/pipeline','Pipeline',KanbanSquare],['/candidates','Candidates',Users],['/analytics','Analytics',BarChart3],['/talent-pool','Talent Pool',Database,'talent-pool'],['/team','Team',UserRound],['/billing','Billing & Subscription',CreditCard],['/announcements','Announcements',Megaphone],['/support/report','Report a Problem',AlertCircle]
]
const recruiterNav=[
['/dashboard','Dashboard',LayoutDashboard],['/jobs','My Jobs',BriefcaseBusiness],['/pipeline','Pipeline',KanbanSquare],['/candidates','Candidates',Users],['/analytics','Analytics',BarChart3],['/talent-pool','Talent Pool',Database,'talent-pool'],['/support/report','Report a Problem',AlertCircle]
]
const navForRole=role=>(role==='recruiter'?recruiterNav:adminNav).filter(([,,,feature])=>!feature||isFeatureEnabled(feature))
function Shell({children}){
 const loc=useLocation(),navg=useNavigate();
 const [mobile,setMobile]=useState(false),[notifOpen,setNotifOpen]=useState(false),[q,setQ]=useState('');
 const {jobs,candidates,profile,notifications,updateNotifications,company,team}=useApp();
 const role=currentRole(); const notificationKey=role==='recruiter'?'hirely_recruiter_notifications':'hirely_notifications'; const [roleNotifications,setRoleNotifications]=useState(()=>JSON.parse(localStorage.getItem(notificationKey)||'null')||notifications||[]); useEffect(()=>{setRoleNotifications(JSON.parse(localStorage.getItem(notificationKey)||'null')||notifications||[])},[role]); const saveRoleNotifications=v=>{setRoleNotifications(v);localStorage.setItem(notificationKey,JSON.stringify(v))}; const displayProfile=role==='recruiter'?(JSON.parse(localStorage.getItem('hirely_recruiter_profile')||'null')||recruiterSession()):profile; const scopedJobs=role==='recruiter'?recruiterJobs(jobs):jobs; const scopedCandidates=role==='recruiter'?recruiterCandidates(candidates,jobs):candidates;
 useEffect(()=>{if(role==='recruiter'&&['/team','/billing','/announcements'].some(path=>loc.pathname.startsWith(path)))navg('/dashboard')},[role,loc.pathname]);
 const results=[...scopedJobs.map(j=>({kind:'Job',title:j.title,meta:`${j.department} · ${j.location}`,route:`/jobs/${j.id}`})),...scopedCandidates.map(c=>({kind:'Candidate',title:c.name,meta:`${c.job||scopedJobs.find(j=>String(j.id)===String(c.jobId))?.title||'Candidate'} · ${c.stage}`,route:'/candidates'})),{kind:'Report',title:'Report a Problem',meta:'Submit and track support reports',route:'/support/report'},{kind:'Report',title:'My Reports',meta:'Track submitted support reports',route:'/support/reports'}].filter(x=>`${x.title} ${x.meta}`.toLowerCase().includes(q.toLowerCase())).slice(0,7);
 const unread=roleNotifications.filter(n=>!n.read).length;
 const openNotif=n=>{saveRoleNotifications(roleNotifications.map(x=>x.id===n.id?{...x,read:true}:x));setNotifOpen(false);navg(n.route)};
 if(company?.status==='Suspended') return <AccountSuspended/>;
 // DEP-05: a recruiter deactivated by the Company Admin is blocked the
 // moment their session re-renders anywhere in the app — no separate
 // "logout" step is needed since the guard runs on every Shell render,
 // including the one triggered by the cross-tab 'storage' event.
 if(role==='recruiter'){
   const email=recruiterSession().email?.toLowerCase();
   const record=team.find(m=>m.email?.toLowerCase()===email);
   if(record?.status==='Deactivated')return <RecruiterDeactivated/>;
 }
 return (
  <div className={'shell '+(role==='recruiter'?'recruiter-theme':'admin-theme')}>
   <aside className={'sidebar '+(mobile?'open':'')}>
    <div className="side-head"><Logo/><button className="icon mobile-only" onClick={()=>setMobile(false)}><X size={18}/></button></div>
    <nav>{navForRole(role).map(([path,label,Icon])=><button key={path} className={'nav '+(loc.pathname.startsWith(path)?'active':'')} onClick={()=>{navg(path);setMobile(false)}}><Icon size={17}/><span>{label}</span></button>)}</nav>
    <div className="side-bottom"><button className="nav" onClick={()=>navg('/profile')}><Settings size={17}/><span>Profile settings</span></button><button className="nav" onClick={()=>{localStorage.removeItem('hirely_role');localStorage.removeItem('hirely_recruiter_session');navg('/login')}}><LogOut size={17}/><span>Sign out</span></button></div>
   </aside>
   <main className="main">
    <header className="topbar">
     <button className="icon mobile-only" onClick={()=>setMobile(true)}>☰</button>
     <div className="top-search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search jobs, candidates..."/><button className="search-clear" onClick={()=>setQ('')} style={{display:q?'block':'none'}}>×</button></div>
     {q&&<div className="search-results">{results.length?results.map((r,i)=><button key={i} onClick={()=>{setQ('');navg(r.route)}}><span>{r.kind}</span><div><b>{r.title}</b><small>{r.meta}</small></div><ChevronRight size={14}/></button>):<div className="no-results">No jobs or candidates found.</div>}</div>}
     <div className="top-actions">
      <div className="notif-wrap"><button className="icon" onClick={()=>setNotifOpen(v=>!v)}><Bell size={18}/>{unread>0&&<i className="dot"/>}</button>{notifOpen&&<div className="notif-panel"><div className="notif-head"><div><b>Notifications</b><small>{unread} unread</small></div>{unread>0&&<button onClick={()=>saveRoleNotifications(roleNotifications.map(n=>({...n,read:true})))}>Mark all read</button>}</div>{roleNotifications.map(n=><button className={'notification '+(!n.read?'unread':'')} key={n.id} onClick={()=>openNotif(n)}><span className="notif-icon"><Bell size={14}/></span><div><b>{n.title}</b><p>{n.body}</p><small>{n.time}</small></div></button>)}</div>}</div>
      <div className="user-mini"><span className="avatar">{displayProfile.photo?<img src={displayProfile.photo} alt="Profile"/>:displayProfile.name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}</span><div><b>{displayProfile.name}</b><small>{role==='recruiter'?'Recruiter':'Company Admin'}</small></div></div>
     </div>
    </header>
    {children}
   </main>
   <AIWidget/>
  </div>
 );
}

function ReportProblemForm(){
 const {submitIssue}=useApp();
 const navg=useNavigate();
 const [form,setForm]=useState({type:'Technical issue',description:'',priority:'Medium',attachment:''});
 const [error,setError]=useState('');
 const [fileInputKey,setFileInputKey]=useState(0);
 const update=(k,v)=>{setForm({...form,[k]:v});setError('')};
 const submit=()=>{
  if(!form.description.trim())return setError('Please complete the description.');
  if(form.description.trim().length<15)return setError('Description must contain at least 15 characters.');
  submitIssue({...form,description:form.description.trim()});
  setForm({type:'Technical issue',description:'',priority:'Medium',attachment:''});setFileInputKey(k=>k+1);
  setError('');
  navg('/support/reports');
 };
 return <Card><div className="form-grid setup-two"><Field label="Issue type"><select value={form.type} onChange={e=>update('type',e.target.value)}><option>Technical issue</option><option>Account & access</option><option>Billing</option><option>Data or candidate issue</option><option>Other</option></select></Field><Field label="Priority"><select value={form.priority} onChange={e=>update('priority',e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></Field></div><Field label="Description"><textarea rows="6" value={form.description} onChange={e=>update('description',e.target.value)} placeholder="Explain what happened and what you expected."/></Field><Field label="Attachment (optional)"><label className="file-picker" htmlFor="report-attachment"><span>Choose file</span><small>{form.attachment||'No file chosen'}</small></label><input key={fileInputKey} id="report-attachment" className="hidden-file-input" type="file" onChange={e=>update('attachment',e.target.files?.[0]?.name||'')}/></Field>{form.attachment&&<p className="muted">Attached file: {form.attachment}</p>}{error&&<div className="form-error"><AlertCircle size={15}/>{error}</div>}<div className="report-actions"><Button onClick={submit}>Submit report</Button></div></Card>
}

function ReportProblem(){
 const navg=useNavigate();
 return <Page title="Report a Problem" subtitle="Tell us what went wrong and track your submitted reports."><ReportProblemForm/><Card className="my-reports-card"><div className="card-title"><div><h3>My Reports</h3><p>View and track all problems submitted from your company workspace.</p></div><Button variant="ghost" onClick={()=>navg('/support/reports')}>View My Reports <ArrowUpRight size={14}/></Button></div></Card></Page>
}

function MyReports(){
 const {reportedIssues}=useApp();
 const [page,setPage]=useState(1);
 const pageSize=8;
 const totalPages=Math.max(1,Math.ceil(reportedIssues.length/pageSize));
 const safePage=Math.min(page,totalPages);
 const visible=reportedIssues.slice((safePage-1)*pageSize,safePage*pageSize);
 useEffect(()=>setPage(1),[reportedIssues.length]);
 return <Page title="My Reports" subtitle="Track problems submitted from your company workspace."><Card>{reportedIssues.length?<><div className="support-report-table"><div className="support-report-row head"><span>ID</span><span>Type</span><span>Priority</span><span>Status</span><span>Date</span></div>{visible.map(x=><div className="support-report-row" key={x.id}><span><b>{x.id}</b></span><span>{x.type}</span><span>{x.priority}</span><span><Badge tone={x.status==='Resolved'?'green':x.status==='In Progress'?'purple':'amber'}>{x.status}</Badge></span><span>{x.createdAt}</span></div>)}</div>{reportedIssues.length>pageSize&&<div className="pagination" style={{justifyContent:'center',marginTop:20}}><button disabled={safePage===1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeft size={15}/></button>{Array.from({length:totalPages},(_,i)=><button key={i+1} className={safePage===i+1?'current':''} onClick={()=>setPage(i+1)}>{i+1}</button>)}<button disabled={safePage===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}><ChevronRight size={15}/></button><span className="muted" style={{marginLeft:8}}>Page {safePage} of {totalPages}</span></div>}</>:<div className="empty-state">You have not submitted any reports yet.</div>}</Card></Page>
}

function Page({title,subtitle,actions,children,className=''}){return <section className={'page '+className}><div className="page-head"><div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{actions&&<div className="actions">{actions}</div>}</div>{children}</section>}
function Button({children,variant='primary',className='',...p}){return <button className={['btn',variant,className].filter(Boolean).join(' ')} {...p}>{children}</button>}
function Card({children,className=''}){return <div className={'card '+className}>{children}</div>}
function Badge({children,tone=''}){return <span className={'badge '+tone}>{children}</span>}
function Modal({title,onClose,children,footer,className=''}){return <div className="modal-bg"><div className={'modal '+className}><div className="modal-head"><h3>{title}</h3><button className="icon" onClick={onClose}><X size={18}/></button></div><div className="modal-body">{children}</div>{footer&&<div className="modal-foot">{footer}</div>}</div></div>}
function TextInputModal({title,label,initialValue='',placeholder='',onClose,onSave,saveLabel='Save'}){const [value,setValue]=useState(initialValue);return <Modal title={title} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={()=>{if(value.trim())onSave(value.trim())}} disabled={!value.trim()}>{saveLabel}</Button></>}><Field label={label}><input autoFocus value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder} onKeyDown={e=>{if(e.key==='Enter'&&value.trim())onSave(value.trim())}}/></Field></Modal>}
function InviteLinkModal({link,onClose}){const [copied,setCopied]=useState(false);const copy=async()=>{try{await navigator.clipboard.writeText(link);setCopied(true)}catch{setCopied(false)}};return <Modal title="Recruiter invitation ready" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button onClick={copy}>{copied?'Copied':'Copy link'}</Button></>}><p className="muted">This setup link is valid for 72 hours. Send it to the invited recruiter.</p><div className="invite-link-box"><input value={link} readOnly onFocus={e=>e.target.select()}/></div>{copied&&<p className="success-text">Invitation link copied to clipboard.</p>}</Modal>}
function Score({value,size=''}){return <div className={'score '+size} style={{'--p':`${value*3.6}deg`}}><span>{value}%</span></div>}

function Dashboard(){
 const {jobs,candidates,profile}=useApp(); const role=currentRole(); const displayProfile=role==='recruiter'?(JSON.parse(localStorage.getItem('hirely_recruiter_profile')||'null')||recruiterSession()):profile; const scopedJobs=role==='recruiter'?recruiterJobs(jobs):jobs; const scopedCandidates=role==='recruiter'?recruiterCandidates(candidates,jobs):candidates; const navg=useNavigate();
 const activeJobs=scopedJobs.filter(j=>j.status==='Open'); const interviews=scopedCandidates.filter(c=>c.stage==='Interview').length; const avg=Math.round(scopedCandidates.reduce((sum,c)=>sum+Number(c.score||0),0)/(scopedCandidates.length||1));
 return <Page title={`Good morning, ${displayProfile.name.split(' ')[0]}`} subtitle={role==='recruiter'?'Here is what is happening across your assigned hiring work today.':'Here is what is happening with your hiring pipeline today.'}>
  <div className="stats"><Stat title={role==='recruiter'?'Assigned jobs':'Active jobs'} value={activeJobs.length} change="Current workload" icon={BriefcaseBusiness}/><Stat title="Candidates" value={scopedCandidates.length} change="In your scope" icon={Users}/><Stat title="Interviews" value={interviews} change="Interview stage" icon={CalendarDays}/><Stat title="Avg. match score" value={`${avg}%`} change="Current candidates" icon={Sparkles}/></div>
  <div className="grid two"><Card><div className="card-title"><div><h3>Hiring funnel</h3><p>{role==='recruiter'?'Your assigned jobs':'All active jobs'}</p></div><Button variant="ghost" onClick={()=>navg('/pipeline')}>View pipeline <ArrowUpRight size={15}/></Button></div>{['Applied','Screening','Shortlisted','Interview','Offer'].map(x=>{const n=scopedCandidates.filter(c=>c.stage===x).length;return <div className="funnel" key={x}><div><span>{x}</span><b>{n}</b></div><div className="track"><i style={{width:`${Math.max(4,n/(Math.max(1,scopedCandidates.length))*100)}%`}}/></div></div>})}</Card>
  <Card><div className="card-title"><div><h3>Recent candidates</h3><p>Latest candidates in your scope</p></div><Link className="link" to="/candidates">View all</Link></div>{scopedCandidates.slice(0,5).map(c=><div className="recent" key={c.id}><span className="avatar">{c.name.split(' ').map(x=>x[0]).join('')}</span><div><b>{c.name}</b><small>{c.job||scopedJobs.find(j=>String(j.id)===String(c.jobId))?.title||'—'} · {c.stage}</small></div><Score value={Number(c.score||0)}/></div>)}</Card></div>
  <Card><div className="card-title"><div><h3>{role==='recruiter'?'My Jobs':'Jobs performance'}</h3><p>Applications and average match</p></div><Link className="link" to="/jobs">Manage jobs</Link></div><div className="simple-table"><div className="tr th"><span>Job</span><span>Applications</span><span>Match</span></div>{scopedJobs.map(j=><div className="tr" key={j.id}><span><b>{j.title}</b><small>{j.department} · {j.location}</small></span><span>{j.applicants||0}</span><span className="green">{j.match||0}%</span></div>)}</div></Card>
 </Page>
}
function Stat({title,value,change,icon:Icon}){return <Card className="stat"><div className="stat-icon"><Icon size={19}/></div><small>{title}</small><strong>{value}</strong><em>{change}</em></Card>}

function Jobs(){
 const {jobs,updateJobs,candidates,updateCandidates}=useApp();const navg=useNavigate();const role=currentRole();const scopedJobs=role==='recruiter'?recruiterJobs(jobs):jobs;const canDelete=role==='company-admin';
 const [q,setQ]=useState(''),[filter,setFilter]=useState('All'),[del,setDel]=useState(null),[page,setPage]=useState(1);
 const pageSize=9;
 const filtered=scopedJobs.filter(j=>!j.archived&&(filter==='All'||j.status===filter)&&(`${j.title} ${j.department} ${j.location}`.toLowerCase().includes(q.toLowerCase())));
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const safePage=Math.min(page,totalPages);const visible=filtered.slice((safePage-1)*pageSize,safePage*pageSize);
 const toggle=id=>updateJobs(jobs.map(j=>j.id===id?{...j,status:j.status==='Open'?'Paused':'Open'}:j));
 const close=id=>updateJobs(jobs.map(j=>String(j.id)===String(id)?{...j,status:'Closed'}:j));
 const duplicate=job=>{
   const copy={...job,id:Date.now(),title:`${job.title} (Copy)`,status:'Draft',applicants:0,match:0,created:new Date().toLocaleDateString(),owner:role==='recruiter'?recruiterName():'Heba Mohamed',assignedTo:role==='recruiter'?recruiterName():job.assignedTo,createdBy:role==='recruiter'?recruiterName():job.createdBy,deadline:''};
   updateJobs([copy,...jobs]);
 };
 useEffect(()=>{setPage(1)},[q,filter]);
 return <Page title={role==='recruiter'?'My Jobs':'Jobs'} subtitle={role==='recruiter'?'View and manage only the jobs assigned to you.':'Create and manage your job postings.'} actions={<Button onClick={()=>navg('/jobs/new')}><Plus size={16}/> Create new job</Button>}><div className="toolbar"><div className="search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search jobs..."/></div><div className="seg"><button className={filter==='All'?'sel':''} onClick={()=>setFilter('All')}>All</button><button className={filter==='Open'?'sel':''} onClick={()=>setFilter('Open')}>Open</button><button className={filter==='Paused'?'sel':''} onClick={()=>setFilter('Paused')}>Paused</button><button className={filter==='Closed'?'sel':''} onClick={()=>setFilter('Closed')}>Closed</button></div></div>{role==='recruiter'&&<div className="scope-banner"><div className="scope-banner-icon"><BriefcaseBusiness size={17}/></div><div><b>My assigned jobs</b><span>Jobs you created or were assigned to appear here.</span></div></div>}<div className="job-grid">{visible.map(j=><JobCard key={j.id} job={j} onDelete={canDelete?()=>setDel(j):undefined} onToggle={()=>toggle(j.id)} onClose={()=>close(j.id)} onDuplicate={()=>duplicate(j)}/>)}</div>{filtered.length>pageSize&&<div className="pagination" style={{justifyContent:'center',marginTop:20}}><button disabled={safePage===1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeft size={15}/></button>{Array.from({length:totalPages},(_,i)=><button key={i+1} className={safePage===i+1?'current':''} onClick={()=>setPage(i+1)}>{i+1}</button>)}<button disabled={safePage===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}><ChevronRight size={15}/></button><span className="muted" style={{marginLeft:8}}>Page {safePage} of {totalPages}</span></div>}{del&&<Modal title="Delete job?" onClose={()=>setDel(null)} footer={<><Button variant="ghost" onClick={()=>setDel(null)}>Cancel</Button><Button variant="danger" onClick={()=>{
  updateJobs(jobs.map(x=>String(x.id)===String(del.id)?{...x,status:'Closed',archived:true,deletedAt:new Date().toISOString()}:x));
  // Deletion archives everything: unlike Close (which only stops new
  // applications and leaves existing ones active), the job's candidates
  // are archived too, so they leave the active Pipeline and Candidates lists.
  updateCandidates(candidates.map(c=>(String(c.jobId)===String(del.id)||String(c.job||'').toLowerCase()===String(del.title||'').toLowerCase())
    ?{...c,stage:'Archived',applicationStage:'Archived',archived:true,updatedAt:new Date().toISOString(),activity:[`Application archived — the job posting "${del.title}" was deleted`,...(c.activity||[])]}
    :c));
  setDel(null)
}}>Delete job</Button></>}><p>Delete <b>{del.title}</b>? All existing applications for this job will be archived and removed from the active Pipeline and Candidates lists.</p><div className="danger-box"><AlertCircle size={17}/> This action cannot be undone.</div></Modal>}</Page>
}
function JobCard({job,onDelete,onToggle,onClose,onDuplicate}){const navg=useNavigate();const [menu,setMenu]=useState(false);return <Card className="job-card"><div className="job-card-head"><Badge tone={job.status==='Open'?'green':job.status==='Paused'?'amber':job.status==='Closed'?'red':'gray'}>{job.status}</Badge><div className="job-menu-wrap"><button className="icon" aria-label="Job actions" onClick={()=>setMenu(v=>!v)}><MoreHorizontal size={18}/></button>{menu&&<div className="menu job-menu"><Link to={`/jobs/${job.id}/edit`} onClick={()=>setMenu(false)}>Edit job</Link><button onClick={()=>{onDuplicate();setMenu(false)}}>Duplicate</button>{job.status!=='Closed'&&job.status!=='Draft'&&<button onClick={()=>{onToggle();setMenu(false)}}>{job.status==='Open'?'Pause job':'Resume job'}</button>}{job.status!=='Closed'&&job.status!=='Draft'&&<button onClick={()=>{onClose();setMenu(false)}}>Close job</button>}{onDelete&&<button className="danger-text" onClick={()=>{onDelete();setMenu(false)}}>Delete job</button>}</div>}</div></div><h3>{job.title}</h3><p>{job.department} · {job.location}</p><div className="job-meta"><span>{job.type}</span><span>·</span><span>{job.salary || 'Salary not specified'}</span></div>{job.deadline&&<div className="job-deadline"><CalendarDays size={13}/> Apply by {job.deadline}</div>}<div className="job-stats"><div><small>Applicants</small><button className="metric-link" onClick={()=>navg(`/pipeline?job=${job.id}`)}>{job.applicants}</button></div><div className="match"><Score value={job.match}/><small>Avg. match</small></div></div><div className="job-foot"><span>{job.owner?`Assigned to ${job.owner}`:`Created ${job.created}`}</span><Button variant="ghost" onClick={()=>navg(`/jobs/${job.id}`)}>View details</Button></div></Card>}

function Announcements(){
  const {announcements}=useApp();
  const [selected,setSelected]=useState(null);
  return <Page title="Announcements" subtitle="Stay updated with platform enhancements, maintenance, and company news.">
    <div className="announcement-grid">{announcements.map((a,i)=><Card key={`${a.title}-${i}`}><div className="announcement-icon"><Megaphone size={18}/></div><small>{a.date}</small><h3>{a.title}</h3><p>{a.body}</p><button className="text-btn" onClick={()=>setSelected(a)}>Read More <ChevronRight size={14}/></button></Card>)}</div>
    <Card className="admin-logs-card"><h3>Recent Admin Logs</h3><div className="log"><span>System update published by Super Admin</span><small>2 hours ago</small></div><div className="log"><span>Maintenance notification scheduled</span><small>5 hours ago</small></div></Card>
    {selected&&<Modal title={selected.title} onClose={()=>setSelected(null)} footer={<Button onClick={()=>setSelected(null)}>Close</Button>}><p>{selected.body}</p><small>{selected.date}</small></Modal>}
  </Page>
}
function AccountSuspended(){
 const navg=useNavigate();
 return <div className="suspended-page"><div className="suspended-card"><div className="suspended-icon"><LockKeyhole size={28}/></div><h1>Account suspended</h1><p>Your company account is currently suspended. You cannot access the workspace while the account is suspended.</p><div className="suspended-actions"><a className="btn secondary" href="mailto:support@hirely.com?subject=Hirely%20Account%20Suspension">Contact Support</a><Button onClick={()=>{localStorage.removeItem('hirely_role');navg('/login')}}>Sign out</Button></div></div></div>
}
function RecruiterDeactivated(){
 const navg=useNavigate();
 // Mirrors AccountSuspended's markup/classes 1:1 (styled by the same
 // .suspended-* rules) inside .recruiter-theme, which recolors it to the
 // Recruiter Portal's blue brand instead of changing its structure.
 const signOut=()=>{localStorage.removeItem('hirely_role');localStorage.removeItem('hirely_recruiter_session');navg('/login')};
 return <div className="recruiter-theme"><div className="suspended-page"><div className="suspended-card"><div className="suspended-icon"><LockKeyhole size={28}/></div><h1>Account deactivated</h1><p>Your recruiter account has been deactivated by your Company Admin. You cannot access the workspace while the account is deactivated. Any open jobs you owned have been reassigned to the Company Admin.</p><div className="suspended-actions"><a className="btn secondary" href="mailto:support@hirely.com?subject=Hirely%20Recruiter%20Account">Contact Company Admin</a><Button onClick={signOut}>Sign out</Button></div></div></div></div>
}
function Billing(){
 const {company,setCompany,team}=useApp();
 const [planOpen,setPlanOpen]=useState(false),[cardOpen,setCardOpen]=useState(false),[cardMode,setCardMode]=useState('add'),[cancelOpen,setCancelOpen]=useState(false);
 const [cancelled,setCancelled]=useState(()=>localStorage.getItem('hirely_subscription_cancelled')==='1');
 const [card,setCard]=useState(()=>JSON.parse(localStorage.getItem('hirely_payment_method')||'null')||{name:'Heba Mohamed',number:'4242 4242 4242 4242',expiry:'08 / 28',cvv:''});
 const [cardForm,setCardForm]=useState(card),[cardError,setCardError]=useState('');
 const plans=[['Starter',49,5],['Growth',129,15],['Enterprise',0,'Unlimited']];
 const activeRecruiters=team.filter(m=>m.role==='Recruiter'&&m.status==='Active').length;
 const currentPlan=plans.find(x=>x[0]===company.plan)||plans[1],seatLimit=currentPlan[2];
 const openCardModal=mode=>{setCardMode(mode);setCardForm(mode==='edit'?card:{name:'',number:'',expiry:'',cvv:''});setCardError('');setCardOpen(true)};
 const saveCard=()=>{const digits=cardForm.number.replace(/\s/g,'');if(!cardForm.name.trim()||!/^[0-9]{16}$/.test(digits)||!/^[0-9]{2}\s*\/\s*[0-9]{2}$/.test(cardForm.expiry.trim())||!/^[0-9]{3,4}$/.test(cardForm.cvv.trim())){setCardError('Enter a valid cardholder name, 16-digit card number, expiry date, and CVV.');return}const next={...cardForm,number:digits.replace(/(\d{4})(?=\d)/g,'$1 ')};setCard(next);localStorage.setItem('hirely_payment_method',JSON.stringify(next));setCardOpen(false)};
 const choosePlan=name=>{if(name==='Enterprise')return;const plan=plans.find(x=>x[0]===name);setCompany(prev=>({...prev,plan:name,monthly:plan[1]}));setCancelled(false);localStorage.removeItem('hirely_subscription_cancelled');setPlanOpen(false)};
 const cancelSubscription=()=>{setCancelled(true);localStorage.setItem('hirely_subscription_cancelled','1');setCancelOpen(false)};
 const invoices=[{id:'INV-2026-08',date:'Aug 01, 2026',amount:`$${company.monthly||129}.00`,status:'Paid'},{id:'INV-2026-07',date:'Jul 01, 2026',amount:`$${company.monthly||129}.00`,status:'Paid'},{id:'INV-2026-06',date:'Jun 01, 2026',amount:`$${company.monthly||129}.00`,status:'Paid'}];
 return <Page title="Billing & Subscription" subtitle="Manage your workspace plan, payment methods, and invoice history." actions={<Button onClick={()=>setPlanOpen(true)}><CreditCard size={15}/> Change plan</Button>}>
  <div className="grid two billing-grid">
   <Card><Badge tone={cancelled?'amber':'green'}>{cancelled?'CANCELLATION SCHEDULED':'CURRENT PLAN'}</Badge><h2>{company.plan||'Growth'} Plan</h2><p>{cancelled?'Your subscription is scheduled for cancellation.':'Manage your company subscription.'}</p><div className="plan-price">${company.monthly||129}<small>/month</small></div><Button variant="secondary" onClick={()=>setPlanOpen(true)}>Change Plan</Button>{!cancelled&&<Button variant="ghost" onClick={()=>setCancelOpen(true)} style={{marginLeft:8}}>Cancel subscription</Button>}</Card>
   <Card><div className="card-title"><div><h3>Payment Method</h3><p>Manage the card used for your subscription.</p></div><Button variant="ghost" onClick={()=>openCardModal('edit')}>Edit</Button></div><div className="credit-card"><span>•••• •••• ••••</span><b>{card.number.slice(-4)}</b><small>{card.name||'Saved payment method'} · Expires {card.expiry||'—'}</small></div><Button variant="secondary" onClick={()=>openCardModal('add')}>+ Add New Card</Button></Card>
  </div>
  <Card className="billing-usage-card"><div className="card-title"><div><h3>Seat Usage</h3><p>Active recruiters used vs your current plan limit.</p></div><Badge tone={seatLimit!=='Unlimited'&&activeRecruiters>=seatLimit?'amber':'green'}>{activeRecruiters} / {seatLimit}</Badge></div><div className="seat-track"><i style={{width:seatLimit==='Unlimited'?'12%':`${Math.min(100,(activeRecruiters/seatLimit)*100)}%`}}/></div><div className="seat-meta"><span>{activeRecruiters} active recruiters</span><span>{seatLimit==='Unlimited'?'Unlimited recruiter seats':`${Math.max(0,seatLimit-activeRecruiters)} seats remaining`}</span></div></Card>
  <Card className="invoice-card"><div className="card-title"><div><h3>Invoice History</h3><p>View your previous subscription invoices.</p></div><Download size={18}/></div><div className="invoice-table"><div className="invoice-row invoice-head"><span>Invoice</span><span>Date</span><span>Amount</span><span>Status</span><span></span></div>{invoices.map(inv=><div className="invoice-row" key={inv.id}><span><b>{inv.id}</b></span><span>{inv.date}</span><span>{inv.amount}</span><span><Badge tone="green">{inv.status}</Badge></span><Button variant="ghost" className="invoice-download" onClick={()=>{const blob=new Blob([`Hirely Invoice ${inv.id}\nDate: ${inv.date}\nAmount: ${inv.amount}\nStatus: ${inv.status}`],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${inv.id}.txt`;a.click();URL.revokeObjectURL(a.href)}}><Download size={14}/> Download</Button></div>)}</div></Card>
  {planOpen&&<Modal title="Change subscription plan" onClose={()=>setPlanOpen(false)}>{plans.map(([name,price,limit])=><Card className={company.plan===name?'plan-option selected':'plan-option'} key={name}><div className="card-head"><div><b>{name}</b><h3>{price?`$${price}/month`:'Custom'}</h3><small>{limit==='Unlimited'?'Unlimited recruiter seats':`Up to ${limit} active recruiters`}</small></div><Button onClick={()=>choosePlan(name)}>{name==='Enterprise'?'Contact Sales':company.plan===name?'Current plan':'Choose'}</Button></div></Card>)}</Modal>}
  {cancelOpen&&<Modal title="Cancel subscription?" onClose={()=>setCancelOpen(false)} footer={<><Button variant="ghost" onClick={()=>setCancelOpen(false)}>Keep subscription</Button><Button variant="danger" onClick={cancelSubscription}>Cancel subscription</Button></>}><p>Your workspace will keep its current plan for this frontend demo, but the subscription will be marked as cancelled.</p></Modal>}
  {cardOpen&&<Modal title={cardMode==='edit'?'Update payment method':'Add payment method'} onClose={()=>setCardOpen(false)} footer={<><Button variant="ghost" onClick={()=>setCardOpen(false)}>Cancel</Button><Button onClick={saveCard}>Save payment method</Button></>}><Field label="Cardholder name"><input value={cardForm.name} onChange={e=>setCardForm({...cardForm,name:e.target.value})} placeholder="Heba Mohamed"/></Field><Field label="Card number"><input value={cardForm.number} onChange={e=>setCardForm({...cardForm,number:e.target.value})} placeholder="4242 4242 4242 4242" inputMode="numeric"/></Field><div className="form-grid"><Field label="Expiry date"><input value={cardForm.expiry} onChange={e=>setCardForm({...cardForm,expiry:e.target.value})} placeholder="MM / YY"/></Field><Field label="CVV"><input value={cardForm.cvv} onChange={e=>setCardForm({...cardForm,cvv:e.target.value})} placeholder="123" inputMode="numeric"/></Field></div>{cardError&&<div className="form-error"><AlertCircle size={15}/>{cardError}</div>}</Modal>}
 </Page>
}

function JobDetails(){const {jobs,candidates}=useApp();const navg=useNavigate();const loc=useLocation();const id=loc.pathname.split('/')[2];const role=currentRole();const job=jobs.find(j=>String(j.id)===String(id));if(!job || (role==='recruiter'&&!recruiterJobs(jobs).some(j=>String(j.id)===String(id))))return <Page title="Job not found" subtitle="The requested job could not be found."><Button onClick={()=>navg('/jobs')}>Back to Jobs</Button></Page>;const applicants=candidates.filter(c=>String(c.jobId??c.job)===String(job.id)||c.job===job.title);return <Page title={job.title} subtitle={`${job.department} · ${job.location}`} actions={<><Button variant="ghost" onClick={()=>navg('/jobs')}>Back to Jobs</Button><Button onClick={()=>navg(`/jobs/${job.id}/edit`)}><Edit3 size={15}/> Edit job</Button></>}><div className="grid two"><Card><h3>Job details</h3><div className="detail-list"><p><b>Status</b> <Badge tone={job.status==='Closed'?'red':job.status==='Paused'?'amber':job.status==='Open'?'green':'gray'}>{job.status}</Badge></p><p><b>Employment</b> {job.type}</p><p><b>Salary</b> {job.salary || 'Not specified'}</p><p><b>Applicants</b> {job.applicants || applicants.length}</p><p><b>Created</b> {job.created || '—'}</p><p><b>Application deadline</b> {job.deadline || 'No deadline'}</p></div><h3>Description</h3><p>{job.description || 'No description added.'}</p><h3>Requirements</h3><div className="tags">{(job.requirements||[]).filter(Boolean).map(x=><span className="tag" key={x}>{x}</span>)}</div></Card><Card><div className="card-title"><div><h3>Applicants</h3><p>View candidates who applied to this job.</p></div><Button variant="ghost" onClick={()=>navg(`/pipeline?job=${job.id}`)}>View pipeline <ArrowUpRight size={14}/></Button></div>{applicants.length?applicants.map(c=><button className="recent clickable" key={c.id} onClick={()=>navg('/candidates')}><span className="avatar">{c.name.split(' ').map(x=>x[0]).join('')}</span><div><b>{c.name}</b><small>{c.stage}</small></div><Score value={c.score||0}/></button>):<p className="muted">No applicants yet.</p>}</Card></div></Page>}

function JobForm(){
 const {jobs,updateJobs}=useApp(); const navg=useNavigate(); const loc=useLocation(); const role=currentRole(); const editing=loc.pathname.includes('/edit'); const id=loc.pathname.split('/')[2]; const existing=jobs.find(j=>String(j.id)===String(id)); const allowed=!existing||role!=='recruiter'||recruiterJobs(jobs).some(j=>String(j.id)===String(id));
 const blank={title:'',department:'Engineering',location:'Cairo, Egypt',type:'Full-time',status:'Draft',salary:'',description:'',deadline:'',requirements:[''],weights:{...getDFSDefaults()},pipeline:['Applied','Screening','Shortlisted','Interview','Assessment','Offer'],stageAutomation:{},autoAdvance:80,autoReject:40,autoNotify:true};
 const [form,setForm]=useState(existing?{...blank,...existing,requirements:existing.requirements?.length?existing.requirements:[''],weights:{...blank.weights,...(existing.weights||{})},pipeline:existing.pipeline?.length?existing.pipeline:[...blank.pipeline],stageAutomation:{...(existing.stageAutomation||{})}}:blank); const [saved,setSaved]=useState(''); const [stageEditor,setStageEditor]=useState(null);
 useEffect(()=>{if(editing){const j=jobs.find(x=>String(x.id)===String(id));setForm(j?{...blank,...j,requirements:j.requirements?.length?j.requirements:[''],weights:{...blank.weights,...(j.weights||{})},pipeline:j.pipeline?.length?j.pipeline:[...blank.pipeline],stageAutomation:{...(j.stageAutomation||{})}}:blank)}else setForm(blank)},[id,editing,jobs.length]);
 if(!allowed)return <Page title="Access restricted" subtitle="This job is not assigned to your recruiter account."><Button onClick={()=>navg('/jobs')}>Back to My Jobs</Button></Page>;
 const total=Object.values(form.weights||{}).reduce((a,b)=>a+Number(b||0),0); const set=(k,v)=>setForm(f=>({...f,[k]:v}));
 const publish=()=>{if(!form.title.trim())return setSaved('title');if(!form.description.trim())return setSaved('description');if(!(form.requirements||[]).some(x=>String(x).trim()))return setSaved('skills');if(total!==100)return setSaved('weights');if(Number(form.autoReject)>=Number(form.autoAdvance))return setSaved('automation');const owner=existing?.owner||(role==='recruiter'?recruiterName():'Heba Mohamed');const next={...form,id:existing?.id||Date.now(),status:'Open',applicants:existing?.applicants||0,match:existing?.match||0,created:existing?.created||new Date().toLocaleDateString(),owner,assignedTo:existing?.assignedTo||(role==='recruiter'?recruiterName():undefined),createdBy:existing?.createdBy||(role==='recruiter'?recruiterName():undefined)};updateJobs(existing?jobs.map(j=>String(j.id)===String(id)?next:j):[next,...jobs]);setSaved('ok');setTimeout(()=>navg('/jobs'),500)};
 return <Page title={editing?'Edit job posting':'Create new job posting'} subtitle="Define the role, requirements, scoring and pipeline." actions={<><Button variant="ghost" onClick={()=>navg('/jobs')}>Cancel</Button><Button onClick={publish}>{editing?'Save changes':'Publish job'}</Button></>}>
  <div className="form-layout"><div><Card><h3>Job details</h3><div className="form-grid"><Field label="Job title"><input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Senior Frontend Developer"/></Field><Field label="Department"><select value={form.department} onChange={e=>set('department',e.target.value)}><option>Engineering</option><option>Design</option><option>Product</option><option>Marketing</option></select></Field><Field label="Location"><input value={form.location} onChange={e=>set('location',e.target.value)}/></Field><Field label="Employment type"><select value={form.type} onChange={e=>set('type',e.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></Field><Field label="Salary range"><input value={form.salary||''} onChange={e=>set('salary',e.target.value)} placeholder="e.g. 35k - 50k EGP"/></Field><Field label="Application deadline"><input type="date" value={form.deadline||''} onChange={e=>set('deadline',e.target.value)}/></Field><Field label="Description" full><textarea rows="6" value={form.description||''} onChange={e=>set('description',e.target.value)}/></Field></div></Card>
  <Card><div className="card-title"><div><h3>Requirements</h3><p>Skills used in candidate matching.</p></div><Button variant="secondary" onClick={()=>set('requirements',[...(form.requirements||[]),''])}><Plus size={14}/> Add requirement</Button></div><datalist id="hirely-skill-library">{listSkills().map(x=><option key={x} value={x}/>)}</datalist>{(form.requirements||[]).map((r,i)=><div className="req" key={i}><input list="hirely-skill-library" value={r} onChange={e=>{const a=[...form.requirements];a[i]=e.target.value;set('requirements',a)}} placeholder="e.g. React"/><button className="icon" onClick={()=>set('requirements',form.requirements.filter((_,x)=>x!==i))}><Trash2 size={15}/></button></div>)}</Card>
  <Card><div className="card-title"><div><h3>DFS scoring weights</h3><p>Weights must equal 100% before publishing.</p></div><span className={'total '+(total===100?'valid':'invalid')}>{total}%</span></div><div className="weights">{Object.entries(form.weights||{}).map(([k,v])=><Field label={k[0].toUpperCase()+k.slice(1)} key={k}><input type="number" min="0" max="100" value={v} onChange={e=>set('weights',{...form.weights,[k]:Number(e.target.value)})}/></Field>)}</div>{total!==100&&<div className="form-error"><AlertCircle size={16}/> Adjust the weights so the total is exactly 100%.</div>}{saved==='title'&&<div className="form-error">Job title is required.</div>}{saved==='description'&&<div className="form-error">Job description is required.</div>}{saved==='skills'&&<div className="form-error">At least one required skill is needed.</div>}{saved==='weights'&&<div className="form-error">DFS weights must total exactly 100%.</div>}{saved==='automation'&&<div className="form-error">Auto-reject must be below auto-advance.</div>}{saved==='ok'&&<div className="success-box"><Check size={16}/> Job saved. Redirecting to My Jobs...</div>}</Card></div>
  <div><Card className="sticky"><h3>Pipeline stages</h3><p>Applicants move through these stages.</p>{(form.pipeline||[]).map((x,i)=><div className="pipeline-stage" key={`${x}-${i}`}><span>{i+1}</span><b>{x}</b><div className="stage-actions"><button className="icon" onClick={()=>setStageEditor({index:i,value:x})}><Edit3 size={14}/></button><button className="icon" onClick={()=>{if(form.pipeline.length>1)set('pipeline',form.pipeline.filter((_,n)=>n!==i))}}><Trash2 size={14}/></button></div></div>)}<Button variant="secondary" onClick={()=>setStageEditor({index:null,value:''})}><Plus size={14}/> Add stage</Button></Card>
  {isFeatureEnabled('automation')&&<Card className="sticky"><h3>Automation rules</h3><p>Configure auto-advance, auto-reject and applicant notifications.</p>{(form.pipeline||[]).map(stage=>{const rule=form.stageAutomation?.[stage]||{action:'None',threshold:80};return <div className="automation-stage" key={stage}><div className="automation-stage-head"><b>{stage}</b><select value={rule.action} onChange={e=>set('stageAutomation',{...(form.stageAutomation||{}),[stage]:{...rule,action:e.target.value}})}><option>None</option><option>Auto-advance</option><option>Auto-reject</option></select></div>{rule.action!=='None'&&<Field label="Score threshold"><input type="number" min="0" max="100" value={rule.threshold} onChange={e=>set('stageAutomation',{...(form.stageAutomation||{}),[stage]:{...rule,threshold:Number(e.target.value)}})}/></Field>}</div>})}<label className="rule"><input type="checkbox" checked={form.autoNotify!==false} onChange={e=>set('autoNotify',e.target.checked)}/> Applicant receives status updates</label></Card>}</div></div>
 {stageEditor&&<TextInputModal title={stageEditor.index===null?'Add pipeline stage':'Edit pipeline stage'} label="Stage name" initialValue={stageEditor.value} placeholder="e.g. Technical Interview" onClose={()=>setStageEditor(null)} onSave={name=>{const a=[...(form.pipeline||[])];if(stageEditor.index===null)a.push(name);else a[stageEditor.index]=name;set('pipeline',a);setStageEditor(null)}} saveLabel={stageEditor.index===null?'Add stage':'Save changes'}/>}
 </Page>
}
function Field({label,children,full}){return <label className={full?'field full':'field'}><span>{label}</span>{children}</label>}

function Pipeline(){
 const {candidates,jobs,updateCandidates}=useApp(); const location=useLocation(); const params=new URLSearchParams(location.search); const queryJob=params.get('job'); const isRecruiter=currentRole()==='recruiter'; const scopedJobs=isRecruiter?recruiterJobs(jobs):jobs; const scopedCandidates=isRecruiter?recruiterCandidates(candidates,jobs):candidates;
 const [jobId,setJobId]=useState(queryJob?String(queryJob):(isRecruiter?String(scopedJobs[0]?.id||''):'all')); const [selectedId,setSelectedId]=useState(null); const [selectedIds,setSelectedIds]=useState([]); const [stageFilter,setStageFilter]=useState('All'); const [sort,setSort]=useState('Score'); const [filterOpen,setFilterOpen]=useState(false); const [bulkAction,setBulkAction]=useState('');
 useEffect(()=>{if(queryJob&&scopedJobs.some(j=>String(j.id)===String(queryJob)))setJobId(String(queryJob));else if(isRecruiter&&!scopedJobs.some(j=>String(j.id)===String(jobId)))setJobId(String(scopedJobs[0]?.id||''))},[queryJob,scopedJobs.length]);
 const selectedJob=scopedJobs.find(j=>String(j.id)===String(jobId)); const visible=scopedCandidates.filter(c=>{if(c.archived)return false;if(ACTIVE_BOARD_EXCLUDED.includes(c.stage))return false;const candidateJobId=c.jobId??jobs.find(j=>String(j.title).toLowerCase()===String(c.job||'').toLowerCase())?.id;if(jobId==='all')return !isRecruiter;return String(candidateJobId)===String(selectedJob?.id)||String(c.job||'').toLowerCase()===String(selectedJob?.title||'').toLowerCase()}); const filtered=visible.filter(c=>stageFilter==='All'||c.stage===stageFilter).sort((a,b)=>sort==='Score'?Number(b.score||0)-Number(a.score||0):sort==='Name'?a.name.localeCompare(b.name):String(b.updatedAt||b.applied||'').localeCompare(String(a.updatedAt||a.applied||''))); const defaultStages=['Applied','Sourced','Screening','Shortlisted','Assessment','Interview','Offer','Hired','Rejected']; const stageList=[...new Set((jobId==='all'&&!isRecruiter?scopedJobs.flatMap(j=>j.pipeline?.length?j.pipeline:defaultStages):(selectedJob?.pipeline?.length?selectedJob.pipeline:defaultStages)).concat(filtered.map(c=>c.stage||'Applied')) )].filter(x=>!ACTIVE_BOARD_EXCLUDED.includes(x)); const toggle=id=>setSelectedIds(x=>x.includes(id)?x.filter(i=>i!==id):[...x,id]); const updateSelected=patch=>{updateCandidates(candidates.map(c=>selectedIds.includes(c.id)?{...c,...patch,updatedAt:new Date().toISOString(),activity:[patch.stage?`Moved to ${patch.stage} by ${currentRole()==='recruiter'?recruiterName()+' (Recruiter)':'Company Admin'}`:`Bulk action by ${currentRole()==='recruiter'?recruiterName()+' (Recruiter)':'Company Admin'}`,...(c.activity||[])]}:c));setSelectedIds([]);setBulkAction('')}; const selected=candidates.find(c=>c.id===selectedId);
 return <Page title="Pipeline" subtitle={isRecruiter?'Manage candidates across your assigned jobs.':'Review and move candidates through your hiring stages.'}><div className="pipeline-toolbar"><select value={jobId} onChange={e=>{setJobId(e.target.value);setSelectedId(null);setSelectedIds([])}}>{!isRecruiter&&<option value="all">All Jobs</option>}{scopedJobs.map(j=><option value={j.id} key={j.id}>{j.title}</option>)}</select><Button variant="secondary" onClick={()=>setFilterOpen(v=>!v)}><SlidersHorizontal size={15}/> Filters</Button>{selectedIds.length>0&&<><Button variant="secondary" onClick={()=>setBulkAction('move')}>Bulk Move</Button><Button variant="danger" onClick={()=>setBulkAction('reject')}>Bulk Reject</Button><Button variant="ghost" onClick={()=>setBulkAction('archive')}>Archive / Remove</Button></>}<span className="pipeline-count">{filtered.filter(c=>!['Rejected','Withdrawn','Closed','Archived'].includes(c.stage)).length} active candidates</span></div>{filterOpen&&<Card className="pipeline-filters"><div className="candidate-filter"><label>Stage</label><select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option>All</option>{stageList.map(x=><option key={x}>{x}</option>)}</select></div><div className="candidate-filter"><label>Sort</label><select value={sort} onChange={e=>setSort(e.target.value)}><option>Score</option><option>Name</option><option>Last Updated</option></select></div><Button variant="ghost" onClick={()=>{setStageFilter('All');setSort('Score')}}>Clear</Button></Card>}{(!selectedJob&&!(jobId==='all'&&!isRecruiter))?<Card><div className="empty-state">No assigned jobs are available yet.</div></Card>:<div className="kanban">{stageList.map(stage=>{const items=filtered.filter(c=>c.stage===stage);return <div className="kanban-col" key={stage}><div className="col-head"><b>{stage}</b><span>{items.length}</span></div>{items.map(c=><div className="candidate-wrap" key={c.id}><input className="candidate-check" type="checkbox" checked={selectedIds.includes(c.id)} onChange={()=>toggle(c.id)}/><button className="candidate" onClick={()=>setSelectedId(c.id)}><div className="candidate-top"><span className="avatar">{c.name.split(' ').map(x=>x[0]).join('')}</span><MoreHorizontal size={16}/></div><b>{c.name}</b><small>{c.job||selectedJob.title}</small><div className="candidate-score"><Score value={Number(c.score||0)}/><span>{c.score>=80?'Strong match':c.score>=60?'Good match':'Low match'}</span></div><div className="candidate-foot"><span>{c.applied||''}</span><ArrowUpRight size={13}/></div></button></div>)}</div>})}</div>}{selected&&<CandidatePanel candidate={selected} isCompanyAdmin={!isRecruiter} onClose={()=>setSelectedId(null)} move={(id,st)=>updateCandidates(candidates.map(c=>c.id===id?{...c,stage:st,applicationStage:st,updatedAt:new Date().toISOString(),activity:[`Moved to ${st} by ${isRecruiter?recruiterName()+' (Recruiter)':'Company Admin'}`,...((c.activity)||[])]}:c))} onUpdate={u=>updateCandidates(candidates.map(c=>c.id===u.id?u:c))}/>} {bulkAction==='move'&&<Modal title="Bulk move candidates" onClose={()=>setBulkAction('')}><Field label="Stage"><select defaultValue="" onChange={e=>updateSelected({stage:e.target.value,applicationStage:e.target.value})}><option value="" disabled>Select stage</option>{stageList.map(x=><option key={x}>{x}</option>)}</select></Field></Modal>}{bulkAction==='reject'&&<Modal title="Bulk reject candidates" onClose={()=>setBulkAction('')} footer={<><Button variant="ghost" onClick={()=>setBulkAction('')}>Cancel</Button><Button variant="danger" onClick={()=>updateSelected({stage:'Rejected',applicationStage:'Rejected'})}>Reject selected</Button></>}><p>Reject {selectedIds.length} selected candidates?</p></Modal>}{bulkAction==='archive'&&<Modal title="Archive candidates" onClose={()=>setBulkAction('')} footer={<><Button variant="ghost" onClick={()=>setBulkAction('')}>Cancel</Button><Button onClick={()=>updateSelected({stage:'Archived',applicationStage:'Archived',archived:true})}>Archive selected</Button></>}><p>Remove {selectedIds.length} selected candidates from the active pipeline?</p></Modal>}</Page>
}
function CandidatePanel({candidate,onClose,move,onUpdate,isCompanyAdmin=true}){
 const {jobs}=useApp();
 const actor=currentRole()==='recruiter'?`${recruiterName()} (Recruiter)`:'Company Admin';
 const [tab,setTab]=useState('Profile');
 const [schedule,setSchedule]=useState(false),[reject,setReject]=useState(false),[statusOpen,setStatusOpen]=useState(false),[override,setOverride]=useState(false),[cvOpen,setCvOpen]=useState(false);
 const [note,setNote]=useState(''),[tag,setTag]=useState(''),[score,setScore]=useState(candidate.score),[reason,setReason]=useState(''),[rejectReason,setRejectReason]=useState(''),[statusNote,setStatusNote]=useState(''),[statusType,setStatusType]=useState('Shortlisted');
 const [sf,setSf]=useState({format:'Video',date:'',time:'',duration:'30 minutes',notes:''});
 const skills=candidate.primarySkills?.length?candidate.primarySkills:(jobs.find(j=>String(j.id)===String(candidate.jobId))?.requirements||['JavaScript','Communication']).slice(0,4);
 const stages=jobs.find(j=>String(j.id)===String(candidate.jobId))?.pipeline||['Applied','Screening','Shortlisted','Interview','Assessment','Offer','Hired','Rejected'];
 const saveNotes=()=>{if(!note.trim())return;onUpdate({...candidate,notes:[...(candidate.notes||[]),{text:note.trim(),date:new Date().toLocaleDateString(),by:actor}]});setNote('')};
 const addTag=()=>{const v=tag.trim();if(!v)return;onUpdate({...candidate,tags:[...new Set([...(candidate.tags||[]),v])]});setTag('')};
 const removeTag=t=>onUpdate({...candidate,tags:(candidate.tags||[]).filter(x=>x!==t)});
 const saveOverride=()=>{const n=Math.max(0,Math.min(100,Number(score)));if(!reason.trim())return;onUpdate({...candidate,originalScore:candidate.originalScore??candidate.score,score:n,scoreOverride:{score:n,reason:reason.trim(),at:new Date().toISOString()},activity:[`DFS score overridden from ${candidate.score} to ${n} by ${actor}`,...((candidate.activity)||[])]});setOverride(false);setReason('')};
 const shortlist=()=>{onUpdate({...candidate,stage:'Shortlisted',applicationStage:'Shortlisted',updatedAt:new Date().toISOString(),activity:[`Shortlisted by ${actor}`,...((candidate.activity)||[])]});setTab('Profile')};
 const sendReject=()=>{if(!rejectReason)return;const at=new Date().toISOString();const feedback=reason.trim();onUpdate({...candidate,stage:'Rejected',applicationStage:'Rejected',feedback,rejectionReason:rejectReason,updatedAt:at,applicantNotification:{type:'rejection',message:feedback||`Your application was not selected because of ${rejectReason.toLowerCase()}.`,preparedAt:at,sendVia:'backend'},activity:[`Rejection notification prepared by ${actor} — ${rejectReason}${feedback?` — ${feedback}`:''}`,...((candidate.activity)||[])]});setReject(false);setReason('');setRejectReason('');onClose()};
 const markStage=stage=>{onUpdate({...candidate,stage,applicationStage:stage,updatedAt:new Date().toISOString(),activity:[`Moved to ${stage} by ${actor}`,...((candidate.activity)||[])]});setStatusOpen(false);setStatusNote('')};
 const sendStatusUpdate=()=>{const templates={Screening:`Your application has moved to the screening stage. Our team will review your profile and follow up with next steps.`,Shortlisted:`Great news! Your application has been shortlisted. Our team will be in touch with the next steps.`,Interview:`Your application has moved to the interview stage. We will send the interview details shortly.`,Offer:`We are pleased to let you know that your application has progressed to the offer stage.`,Rejected:`Thank you for your interest in this role. We have decided not to move forward with your application at this time.`};const at=new Date().toISOString();const text=statusNote.trim()||templates[statusType]||`Candidate status updated to ${statusType}.`;onUpdate({...candidate,statusUpdate:{type:statusType,message:text,by:actor,at},applicantNotification:{type:'status',stage:statusType,message:text,preparedAt:at,sendVia:'backend'},activity:[`Status update prepared by ${actor} — ${statusType}`,...((candidate.activity)||[])]});setStatusOpen(false);setStatusNote('')};
 const sendInterview=()=>{if(!sf.date||!sf.time)return;const at=new Date().toISOString();onUpdate({...candidate,interview:{...sf,status:'Pending',by:actor,at},applicantNotification:{type:'interview',message:`Interview invitation: ${sf.format} on ${sf.date} at ${sf.time}.`,preparedAt:at,sendVia:'backend'},activity:[`Interview invitation prepared by ${actor} for ${sf.date} at ${sf.time}`,...((candidate.activity)||[])]});setSchedule(false);setTab('Activity')};
 return <div className="side-bg" onClick={onClose}><aside className="detail" onClick={e=>e.stopPropagation()}>
  <div className="detail-head"><div><span className="avatar xl">{candidate.name.split(' ').map(x=>x[0]).join('')}</span><h2>{candidate.name}</h2><p>{candidate.email}</p></div><button className="icon" onClick={onClose}><X size={20}/></button></div>
  <div className="detail-score"><Score value={Number(candidate.score||0)} size="lg"/><div><b>DFS Match Score</b><p>Calculated from the job weights.</p>{candidate.originalScore!=null&&candidate.originalScore!==candidate.score&&<small>Original score: {candidate.originalScore}% · Overridden</small>}</div></div>
  {isFeatureEnabled('ai-summary')&&<section className="ai-summary-card"><h4><Sparkles size={16}/> AI Summary</h4><p>{candidate.aiSummary||"AI-generated candidate summary will appear here when the AI integration is connected. The Recruiter can review this section after the AI teammate connects the summary service."}</p></section>}
  <div className="candidate-detail-tabs">{['Profile','CV','Notes','Activity'].map(x=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x}</button>)}</div>
  {tab==='Profile'&&<>
   <section><h4>Candidate profile</h4><div className="profile-summary"><p><b>Experience:</b> {candidate.yearsExperience??candidate.experience??"—"} {typeof (candidate.yearsExperience??candidate.experience)==="number" && (candidate.yearsExperience??candidate.experience)<=15 ? "years" : ""}</p><p><b>Location:</b> {candidate.locationName||"—"}</p><p><b>Education:</b> {candidate.educationLabel||"Bachelor's degree"}</p></div></section>
   <section><h4>Dimension breakdown</h4><Dimension name="Skills match" value={candidate.skills||candidate.score||0}/><Dimension name="Experience" value={candidate.experience||0}/><Dimension name="Education" value={candidate.education||0}/><Dimension name="Location" value={candidate.location||0}/></section>
   <section><h4>Application</h4><p><b>{candidate.job}</b></p><p>Applied {candidate.applied||'—'}</p><Badge tone={candidate.stage==='Rejected'?'red':candidate.stage==='Hired'?'green':candidate.stage==='Interview'?'blue':'purple'}>{candidate.stage||'Applied'}</Badge>{candidate.applicationStage&&<p className="muted">Application stage: {candidate.applicationStage}</p>}</section>
   <section><h4>Primary Skills</h4><div className="candidate-skills detail-skills">{skills.map(x=><span key={x}>{x}</span>)}</div></section>
   {Array.isArray(candidate.answers)&&candidate.answers.some(a=>String(a||'').trim())&&<section className="screening-answers"><h4>Screening questions</h4><div className="screening-qa"><b>How many years of relevant experience do you have?</b><p>{candidate.answers[0]||'—'}</p></div><div className="screening-qa"><b>Why are you a strong fit for this role?</b><p>{candidate.answers[1]||'—'}</p></div></section>}
  </>}
  {tab==='CV'&&<section className="cv-preview-card"><h4>CV / Resume</h4><p className="muted">Candidate CV preview is available as a frontend demo. The stored file will be connected when the backend file service is added.</p><div className="cv-paper"><div className="cv-line wide"/><div className="cv-line"/><div className="cv-line"/><div className="cv-heading"/><div className="cv-line wide"/><div className="cv-line"/><div className="cv-line"/><div className="cv-heading"/><div className="cv-line wide"/><div className="cv-line"/></div><Button variant="secondary" onClick={()=>setCvOpen(true)}>Open CV preview</Button></section>}
  {tab==='Notes'&&<>
   <section><h4>Internal Notes</h4>{(candidate.notes||[]).map((n,i)=><div className="note-item" key={i}><b>{n.text}</b><small>{n.date}{n.by?` · ${n.by}`:''}</small></div>)}{!(candidate.notes||[]).length&&<p className="muted">No internal notes yet.</p>}<div className="inline-form"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add an internal note"/><Button variant="secondary" onClick={saveNotes}>Add</Button></div></section>
   <section><h4>Tags</h4><div className="tags candidate-tags">{(candidate.tags||[]).map(t=><span className="tag" key={t}>{t}<button onClick={()=>removeTag(t)}>×</button></span>)}</div><div className="inline-form"><input value={tag} onChange={e=>setTag(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTag()} placeholder="Add a tag"/><Button variant="secondary" onClick={addTag}>Add</Button></div></section>
  </>}
  {tab==='Activity'&&<section><h4>Activity</h4>{(candidate.activity||[]).map((x,i)=><div className="activity" key={i}><span className="activity-dot"/><div>{typeof x==='string'?x:x.text}</div></div>)}{!(candidate.activity||[]).length&&<p className="muted">No activity recorded yet.</p>}</section>}
  <section><h4>Actions</h4><div className="action-grid">{!isCompanyAdmin&&<Button variant="secondary" onClick={shortlist}><CheckCircle2 size={14}/> Shortlist</Button>}<Button variant="secondary" onClick={()=>markStage('Hired')}><CheckCircle2 size={14}/> Mark as Hired</Button><Button variant="secondary" onClick={()=>setStatusOpen(true)}>Send status update</Button><Button variant="secondary" onClick={()=>setSchedule(true)}><CalendarDays size={14}/> Schedule interview</Button>{isCompanyAdmin&&<Button variant="secondary" onClick={()=>{setScore(candidate.score);setReason('');setOverride(true)}}><Edit3 size={14}/> Override score</Button>}<Button variant="danger" onClick={()=>{setReason('');setRejectReason('');setReject(true)}}>Reject candidate</Button></div><Field label="Move to stage"><select value={candidate.stage||'Applied'} onChange={e=>move(candidate.id,e.target.value)}>{stages.map(x=><option key={x}>{x}</option>)}</select></Field></section>
  {schedule&&<Modal title="Schedule interview" onClose={()=>setSchedule(false)} footer={<><Button variant="ghost" onClick={()=>setSchedule(false)}>Cancel</Button><Button onClick={sendInterview} disabled={!sf.date||!sf.time}>Send invitation</Button></>}><Field label="Format"><select value={sf.format} onChange={e=>setSf({...sf,format:e.target.value})}><option>Video</option><option>Phone</option><option>In-person</option></select></Field><div className="form-grid"><Field label="Date"><input type="date" value={sf.date} onChange={e=>setSf({...sf,date:e.target.value})}/></Field><Field label="Time"><input type="time" value={sf.time} onChange={e=>setSf({...sf,time:e.target.value})}/></Field><Field label="Duration"><select value={sf.duration} onChange={e=>setSf({...sf,duration:e.target.value})}><option>30 minutes</option><option>45 minutes</option><option>60 minutes</option><option>90 minutes</option></select></Field></div><Field label="Preparation notes"><textarea rows="4" value={sf.notes} onChange={e=>setSf({...sf,notes:e.target.value})}/></Field></Modal>}
  {statusOpen&&<Modal title="Send status update" onClose={()=>setStatusOpen(false)} footer={<><Button variant="ghost" onClick={()=>setStatusOpen(false)}>Cancel</Button><Button onClick={sendStatusUpdate}>Send update</Button></>}><p>Prepare a professional status update for <b>{candidate.name}</b>.</p><Field label="Status type"><select value={statusType} onChange={e=>{setStatusType(e.target.value);setStatusNote('')}}><option>Screening</option><option>Shortlisted</option><option>Interview</option><option>Offer</option><option>Rejected</option></select></Field><Field label="Message (optional)"><textarea rows="5" value={statusNote} onChange={e=>setStatusNote(e.target.value)} placeholder="The system will generate a professional message if you leave this blank."/></Field></Modal>}
  {override&&<Modal title="Override DFS score" onClose={()=>setOverride(false)} footer={<><Button variant="ghost" onClick={()=>setOverride(false)}>Cancel</Button><Button onClick={saveOverride} disabled={!reason.trim()}>Save override</Button></>}><Field label="New score"><input type="number" min="0" max="100" value={score} onChange={e=>setScore(e.target.value)}/></Field><Field label="Reason"><textarea rows="4" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required reason"/></Field></Modal>}
  {reject&&<Modal title="Reject candidate" onClose={()=>setReject(false)} footer={<><Button variant="ghost" onClick={()=>setReject(false)}>Cancel</Button><Button variant="danger" onClick={sendReject} disabled={!rejectReason}>Send rejection with feedback</Button></>}><Field label="Rejection reason"><select value={rejectReason} onChange={e=>setRejectReason(e.target.value)}><option value="">Select a reason</option><option>Skills mismatch</option><option>Experience mismatch</option><option>Role requirements changed</option><option>Position filled</option><option>Other</option></select></Field><Field label="Feedback"><textarea rows="5" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Optional feedback shown to the applicant"/></Field></Modal>}
  {cvOpen&&<Modal title={`${candidate.name} — CV Preview`} onClose={()=>setCvOpen(false)} footer={<Button onClick={()=>setCvOpen(false)}>Close</Button>}><div className="cv-paper cv-modal-paper"><h3>{candidate.name}</h3><p>{candidate.email}</p><h4>Professional Summary</h4><p>{candidate.aiSummary||'Frontend candidate profile preview for the frontend-only demo.'}</p><h4>Skills</h4><p>{skills.join(' · ')}</p><h4>Experience</h4><p>{candidate.yearsExperience??candidate.experience??'—'} years relevant experience</p></div></Modal>}
 </aside></div>
}

function Dimension({name,value}){return <div className="dimension"><div><span>{name}</span><b>{value}%</b></div><div className="track"><i style={{width:`${value}%`}}/></div></div>}

function Candidates(){
 const {candidates,jobs,updateCandidates}=useApp();
 const isCompanyAdmin=currentRole()!=='recruiter'; const scopedJobs=isCompanyAdmin?jobs:recruiterJobs(jobs); const scopedCandidates=isCompanyAdmin?candidates:recruiterCandidates(candidates,jobs);
 const [q,setQ]=useState(''),[role,setRole]=useState('All'),[score,setScore]=useState('All'),[stage,setStage]=useState('All'),[page,setPage]=useState(1),[selectedIds,setSelectedIds]=useState([]),[selectedId,setSelectedId]=useState(null),[compare,setCompare]=useState(false),[bulk,setBulk]=useState('');
 const jobTitle=c=>c.job||jobs.find(j=>String(j.id)===String(c.jobId))?.title||'—';
 const stages=[...new Set([...scopedJobs.flatMap(j=>j.pipeline||[]),...scopedCandidates.map(c=>c.stage).filter(Boolean)])];
 const list=scopedCandidates.filter(c=>!c.archived&&(!q||`${c.name} ${c.email} ${jobTitle(c)} ${(c.primarySkills||[]).join(' ')}`.toLowerCase().includes(q.toLowerCase()))&&(role==='All'||jobTitle(c)===role)&&(score==='All'||(score==='80+'&&c.score>=80)||(score==='60-79'&&c.score>=60&&c.score<80)||(score==='<60'&&c.score<60))&&(stage==='All'||c.stage===stage));
 const perPage=6,totalPages=Math.max(1,Math.ceil(list.length/perPage)),currentPage=Math.min(page,totalPages),pageItems=list.slice((currentPage-1)*perPage,currentPage*perPage);
 useEffect(()=>setPage(1),[q,role,score,stage]);
 const toggle=id=>setSelectedIds(x=>x.includes(id)?x.filter(i=>i!==id):[...x,id]);
 const applyBulk=patch=>{updateCandidates(candidates.map(c=>selectedIds.includes(c.id)?{...c,...patch,updatedAt:new Date().toISOString(),activity:[patch.stage?`Moved to ${patch.stage} by ${currentRole()==='recruiter'?recruiterName()+' (Recruiter)':'Company Admin'}`:`Bulk action by ${currentRole()==='recruiter'?recruiterName()+' (Recruiter)':'Company Admin'}`,...(c.activity||[])]}:c));setSelectedIds([]);setBulk('')};
 const selected=scopedCandidates.find(c=>c.id===selectedId), compared=scopedCandidates.filter(c=>selectedIds.includes(c.id)).slice(0,4);
 return <Page title="Candidates" subtitle={isCompanyAdmin?'All candidates across your company jobs.':'Candidates from your assigned jobs.'}>
  <div className="toolbar candidates-toolbar"><div className="search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search candidates..."/></div><div className="candidate-filter"><label>Target Role</label><select value={role} onChange={e=>setRole(e.target.value)}><option>All</option>{scopedJobs.map(j=><option key={j.id}>{j.title}</option>)}</select></div><div className="candidate-filter"><label>Match Score</label><select value={score} onChange={e=>setScore(e.target.value)}><option>All</option><option>80+</option><option>60-79</option><option>&lt;60</option></select></div><div className="candidate-filter"><label>Stage</label><select value={stage} onChange={e=>setStage(e.target.value)}><option>All</option>{stages.map(x=><option key={x}>{x}</option>)}</select></div><Button variant="ghost" onClick={()=>{setQ('');setRole('All');setScore('All');setStage('All')}}>Clear filters</Button></div>
  {selectedIds.length>0&&<div className="bulk-toolbar"><b>{selectedIds.length} selected</b><Button variant="secondary" disabled={selectedIds.length<2} onClick={()=>setCompare(true)}>Compare</Button><Button variant="secondary" onClick={()=>setBulk('move')}>Bulk Move</Button><Button variant="danger" onClick={()=>setBulk('reject')}>Bulk Reject</Button><Button variant="ghost" onClick={()=>setBulk('archive')}>Archive / Remove</Button></div>}
  <Card className="table-wrap candidates-table-wrap"><table><thead><tr><th><input type="checkbox" checked={pageItems.length>0&&pageItems.every(c=>selectedIds.includes(c.id))} onChange={()=>{const ids=pageItems.map(c=>c.id);setSelectedIds(x=>ids.every(id=>x.includes(id))?x.filter(id=>!ids.includes(id)):[...new Set([...x,...ids])])}}/></th><th>Candidate</th><th>Primary Skills</th><th>Stage</th><th>Match Score</th><th>Owner</th><th>Applied</th><th/></tr></thead><tbody>{pageItems.length?pageItems.map(c=>{const skills=c.primarySkills?.length?c.primarySkills:(jobs.find(j=>String(j.id)===String(c.jobId))?.requirements||[]).slice(0,4);return <tr key={c.id}><td><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={()=>toggle(c.id)}/></td><td><div className="person"><span className="avatar">{c.name.split(' ').map(x=>x[0]).join('')}</span><div><b>{c.name}</b><small>{jobTitle(c)} · {c.email}</small></div></div></td><td><div className="candidate-skills">{skills.map(x=><span key={x}>{x}</span>)}</div></td><td><Badge tone={c.stage==='Rejected'?'red':c.stage==='Hired'?'green':c.stage==='Interview'?'blue':c.stage==='Shortlisted'?'purple':'neutral'}>{c.stage||'Applied'}</Badge></td><td><Score value={Number(c.score||0)}/></td><td>{c.owner||'Heba Mohamed'}</td><td>{c.applied||''}</td><td><button className="icon" onClick={()=>setSelectedId(c.id)}><Eye size={16}/></button></td></tr>}) : <tr><td colSpan="8"><div className="empty-state">No candidates match the selected filters.</div></td></tr>}</tbody></table></Card>
  <div className="pagination"><button className="icon" disabled={currentPage===1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeft size={16}/></button><span>Page {currentPage} of {totalPages}</span><button className="icon" disabled={currentPage===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}><ChevronRight size={16}/></button></div>
  {selected&&<CandidatePanel candidate={selected} isCompanyAdmin={isCompanyAdmin} onClose={()=>setSelectedId(null)} move={(id,st)=>updateCandidates(candidates.map(c=>c.id===id?{...c,stage:st,applicationStage:st,updatedAt:new Date().toISOString(),activity:[`Moved to ${st} by ${currentRole()==='recruiter'?recruiterName()+' (Recruiter)':'Company Admin'}`,...((c.activity)||[])]}:c))} onUpdate={u=>updateCandidates(candidates.map(c=>c.id===u.id?u:c))}/>} 
  {compare&&<Modal title="Compare candidates" className="compare-modal" onClose={()=>setCompare(false)} footer={<Button onClick={()=>setCompare(false)}>Close</Button>}><div className="compare-grid">{compared.map(c=><div className="compare-card" key={c.id}><div className="person"><span className="avatar">{c.name.split(' ').map(x=>x[0]).join('')}</span><div><b>{c.name}</b><small>{jobTitle(c)}</small></div></div><div className="compare-row"><span>Match Score</span><b>{c.score}%</b></div><div className="compare-row"><span>Stage</span><b>{c.stage}</b></div><div className="compare-row"><span>Experience</span><b>{c.experience||'—'}%</b></div><div className="compare-row"><span>Education</span><b>{c.education||'—'}%</b></div><div className="compare-row"><span>Skills</span><b>{(c.primarySkills||[]).join(', ')||'—'}</b></div></div>)}</div></Modal>}
  {bulk==='move'&&<Modal title="Bulk move candidates" onClose={()=>setBulk('')}><Field label="Stage"><select defaultValue="" onChange={e=>applyBulk({stage:e.target.value,applicationStage:e.target.value})}><option value="" disabled>Select stage</option>{[...new Set(jobs.flatMap(j=>j.pipeline||[]))].map(x=><option key={x}>{x}</option>)}</select></Field></Modal>}
  {bulk==='reject'&&<Modal title="Bulk reject candidates" onClose={()=>setBulk('')} footer={<><Button variant="ghost" onClick={()=>setBulk('')}>Cancel</Button><Button variant="danger" onClick={()=>applyBulk({stage:'Rejected',applicationStage:'Rejected'})}>Reject selected</Button></>}><p>Reject {selectedIds.length} selected candidates?</p></Modal>}
  {bulk==='archive'&&<Modal title="Archive candidates" onClose={()=>setBulk('')} footer={<><Button variant="ghost" onClick={()=>setBulk('')}>Cancel</Button><Button onClick={()=>applyBulk({stage:'Archived',applicationStage:'Archived',archived:true})}>Archive selected</Button></>}><p>Remove {selectedIds.length} selected candidates from the active list and pipeline?</p></Modal>}
 </Page>
}
function analyticsStart(range){const now=new Date('2026-09-15T23:59:59');const days=range==='Last 7 days'?7:range==='Last 30 days'?30:range==='Last 90 days'?90:365;return new Date(now.getTime()-days*86400000)}
function candidateInRange(candidate,range){if(range==='This year')return String(candidate.applied||'').includes('2026');const raw=String(candidate.applied||'');const d=new Date(raw);return Number.isNaN(d.getTime())?true:d>=analyticsStart(range)}
function Analytics(){
  const {jobs,candidates}=useApp();
  const [metric,setMetric]=useState('Gender');
  const [range,setRange]=useState('Last 90 Days');
  const [selectedDate,setSelectedDate]=useState('');
  const analyticsCandidates=(candidates||[]).filter(c=>candidateInRange(c,range==='Last 90 Days'?'Last 90 days':range==='Last 30 Days'?'Last 30 days':range==='Last 7 Days'?'Last 7 days':'This year'));
  const companyApplications=Math.max(analyticsCandidates.length,1240);
  const hiredCount=analyticsCandidates.filter(c=>c.stage==='Hired').length;
  const costPerHire=hiredCount?Math.round(37800/hiredCount):4200;
  const data={
    Gender:[['Engineering',72,34],['Product',55,48],['Sales',81,51],['Design',42,49],['Operations',65,39]],
    Ethnicity:[['Engineering',58,41],['Product',52,44],['Sales',67,46],['Design',49,53],['Operations',61,40]],
    'Age Range':[['Engineering',64,38],['Product',57,45],['Sales',73,42],['Design',46,50],['Operations',62,36]]
  };
  const exportRows=[
    ['Metric','Value'],['Reporting period',range],['Selected date',selectedDate||'Not selected'],['Time to hire','18 days'],['Offer acceptance rate','88.5%'],['Sourcing efficiency','64%'],['Applications',companyApplications],['Cost per hire',`${costPerHire} EGP`],
    ['Hiring funnel','Applied 1240 | Screening 642 | Interview 184 | Offer 42']
  ];
  return <Page className="company-admin-analytics-page" title="Company Analytics" subtitle="Review your organization's recruitment health and performance metrics." actions={isFeatureEnabled('analytics-export')?<div className="analytics-export-actions"><Button variant="secondary" onClick={()=>downloadAnalyticsCsv('hirely-company-analytics.csv',exportRows)}><Download size={15}/> Export CSV</Button><Button variant="secondary" onClick={()=>printAnalyticsReport('Hirely Company Analytics Report',exportRows)}>Export PDF</Button></div>:null}>
    <div className="company-analytics-reference-head">
      <div className="company-analytics-date-range"><small>DATE RANGE</small><select value={range} onChange={e=>setRange(e.target.value)}><option>Last 90 Days</option><option>Last 30 Days</option><option>Last 7 Days</option><option>This Year</option></select></div>
      <label className="company-analytics-date-picker"><CalendarDays size={15}/><span>Select Date</span><input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} aria-label="Select analytics date"/></label>
    </div>
    <div className="company-analytics-stats">
      <div className="company-kpi-card"><div className="company-kpi-top"><span className="company-kpi-icon purple"><Clock3 size={18}/></span><em className="positive">↘ -12%</em></div><small>Time to Hire</small><strong>18 Days</strong><span>vs 21 last month</span></div>
      <div className="company-kpi-card"><div className="company-kpi-top"><span className="company-kpi-icon green"><Check size={18}/></span><em className="positive">↗ +4.2%</em></div><small>Offer Acceptance Rate</small><strong>88.5%</strong><span>Industry avg: 72%</span><i className="kpi-progress"><b style={{width:'88.5%'}}/></i></div>
      <div className="company-kpi-card"><div className="company-kpi-top"><span className="company-kpi-icon amber"><Users size={18}/></span><em className="negative">→ 0%</em></div><small>Sourcing Efficiency</small><strong>64%</strong><span>Conversion rate</span></div>
    </div>
    <div className="company-analytics-main-grid">
      <Card className="company-funnel-card"><div className="reference-card-head"><div><h3>Hiring Funnel</h3><p>Candidate conversion per stage</p></div><button className="reference-more" aria-label="Funnel options">•••</button></div><div className="reference-funnel"><div className="reference-funnel-row first"><div className="reference-funnel-label"><span/> <b>Applied</b><strong>1,240</strong></div><div className="reference-funnel-track full"><i/></div><small>100% VOLUME</small></div>{[['Screening',642,'52%'],['Interview',184,'28%'],['Offer',42,'22%']].map(([label,n,pct])=><div className="reference-funnel-row" key={label}><div className="reference-funnel-label"><span className={label.toLowerCase()}/> <b>{label}</b><strong>{n}</strong><em>{pct}</em></div><div className="reference-funnel-track"><i style={{width:`${label==='Screening'?52:label==='Interview'?28:22}%`}}/></div></div>)}</div></Card>
      <Card className="company-source-card"><div className="reference-card-head"><div><h3>Source of Hire</h3><p>Performance by acquisition channel</p></div></div><div className="reference-donut"><div><b>1,240</b><small>TOTAL LEADS</small></div></div><div className="reference-source-legend"><span><i className="linkedin"/>LinkedIn <em>45%</em></span><span><i className="referrals"/>Referrals <em>25%</em></span><span><i className="agencies"/>Agencies <em>20%</em></span><span><i className="others"/>Others <em>10%</em></span></div></Card>
    </div>
    <Card className="company-diversity-card"><div className="reference-diversity-head"><div><h3>Diversity Metrics</h3><p>Breakdown of candidates and hires by department</p></div><div className="diversity-tabs">{['Gender','Ethnicity','Age Range'].map(x=><button key={x} className={metric===x?'active':''} onClick={()=>setMetric(x)}>{x}</button>)}</div></div><div className="reference-diversity-chart">{data[metric].map(([label,candidatesValue,hiresValue])=><div className="reference-diversity-group" key={label}><div className="reference-diversity-bars"><span className="reference-candidate-bar" style={{height:`${candidatesValue*1.75}px`}}/><span className="reference-hire-bar" style={{height:`${hiresValue*1.75}px`}}/></div><b>{label}</b></div>)}</div><div className="reference-diversity-legend"><span><i/> {metric==='Gender'?'Male Candidates':metric==='Ethnicity'?'Group A':'Age 25-34'}</span><span><i/> {metric==='Gender'?'Female Candidates':metric==='Ethnicity'?'Group B':'Age 35-44'}</span></div></Card>
  </Page>
}

function downloadAnalyticsCsv(filename, rows){
 const csv=rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}
function printAnalyticsReport(title, rows){
 const body=rows.map(row=>`<tr>${row.map(v=>`<td>${String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}</td>`).join('')}</tr>`).join('');
 const html=`<!doctype html><html><head><meta charset=\"utf-8\"><title>${title}</title><style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;padding:8px;color:#182235}h1{color:#0b4f91;margin:0 0 8px;font-size:22px}p{color:#687286;font-size:11px}table{width:100%;border-collapse:collapse;margin-top:20px}td{border:1px solid #d8dee8;padding:9px;font-size:11px}tr:first-child{font-weight:700;background:#eef4ff}tr:nth-child(even){background:#fafcff}</style></head><body><h1>${title}</h1><p>Hirely ATS analytics report</p><table>${body}</table></body></html>`;
 const frame=document.createElement('iframe');
 frame.setAttribute('aria-hidden','true');
 frame.style.position='fixed'; frame.style.right='0'; frame.style.bottom='0'; frame.style.width='0'; frame.style.height='0'; frame.style.border='0'; frame.style.visibility='hidden';
 document.body.appendChild(frame);
 const doc=frame.contentDocument || frame.contentWindow.document;
 doc.open(); doc.write(html); doc.close();
 const cleanup=()=>{setTimeout(()=>frame.remove(),1000)};
 frame.onload=()=>{setTimeout(()=>{try{frame.contentWindow.focus();frame.contentWindow.print();}finally{frame.contentWindow.onafterprint=cleanup; setTimeout(cleanup,1500)}},80)};
 // Some browsers do not fire iframe onload after document.write, so keep a small fallback.
 setTimeout(()=>{if(document.body.contains(frame)){try{frame.contentWindow.focus();frame.contentWindow.print();}finally{frame.contentWindow.onafterprint=cleanup; setTimeout(cleanup,1500)} }},250);
}
function RecruiterAnalytics(){
 const {candidates,jobs}=useApp();
 const scopedJobs=recruiterJobs(jobs);
 const [range,setRange]=useState('Last 30 days');
 const scopedCandidates=recruiterCandidates(candidates,jobs).filter(c=>candidateInRange(c,range));
 const totalApplicants=Math.max(scopedCandidates.length, scopedJobs.reduce((sum,j)=>sum+Number(j.applicants||0),0));
 const hired=scopedCandidates.filter(c=>c.stage==='Hired').length;
 const avg=Math.round(scopedCandidates.reduce((s,c)=>s+Number(c.score||0),0)/(scopedCandidates.length||1));
 const conversion=totalApplicants?Math.round((hired/totalApplicants)*100):0;
 const costPerHire=hired?Math.round(37800/hired):4200;
 const stageCounts={Applied:Math.max(scopedCandidates.filter(c=>c.stage==='Applied').length,Math.round(totalApplicants*.42)),Screening:Math.max(scopedCandidates.filter(c=>c.stage==='Screening').length,Math.round(totalApplicants*.19)),Interview:Math.max(scopedCandidates.filter(c=>c.stage==='Interview').length,Math.round(totalApplicants*.07)),Offer:Math.max(scopedCandidates.filter(c=>c.stage==='Offer').length,Math.round(totalApplicants*.02)),Hired:Math.max(hired,2)};
 const funnel=[['Applied',stageCounts.Applied],['Screening',stageCounts.Screening],['Interview',stageCounts.Interview],['Offer',stageCounts.Offer],['Hired',stageCounts.Hired]];
 const dropOff=funnel.slice(0,-1).map((item,i)=>{const current=item[1],next=funnel[i+1][1];return {label:`${item[0].slice(0,3)} → ${funnel[i+1][0].slice(0,3)}`,value:current?Math.max(0,Math.round((1-next/current)*100)):0}});
 const highestDrop=dropOff.reduce((best,item)=>item.value>best.value?item:best,dropOff[0]||{label:'Scr → Int',value:0});
 const scoreBuckets=[['0-20',scopedCandidates.filter(c=>Number(c.score)<21).length||3],['21-40',scopedCandidates.filter(c=>Number(c.score)>=21&&Number(c.score)<=40).length||8],['41-60',scopedCandidates.filter(c=>Number(c.score)>=41&&Number(c.score)<=60).length||22],['61-80',scopedCandidates.filter(c=>Number(c.score)>=61&&Number(c.score)<=80).length||31],['81-100',scopedCandidates.filter(c=>Number(c.score)>=81).length||10]];
 const trend=[['Jun',22],['Jul',30],['Aug',28],['Sep',21],['Oct',24],['Nov',18]];
 const exportRows=[['Metric','Value'],['Reporting period',range],['Avg time-to-hire','18 days'],['Total applicants',totalApplicants],['Conversion rate',`${conversion}%`],['Average DFS',`${avg}%`],['Cost per hire',`${costPerHire} EGP`],...funnel.map(([s,n])=>[`Funnel ${s}`,n]),...scoreBuckets.map(([s,n])=>[`Score ${s}`,n])];
 const exportReport=()=>downloadAnalyticsCsv('hirely-recruiter-analytics.csv',exportRows);
 const printReport=()=>printAnalyticsReport('Hirely Recruiter Analytics Report',exportRows);
 return <Page className="recruiter-analytics-page" title="Analytics" subtitle="Hiring performance for your assigned jobs.">
   <div className="recruiter-analytics-view recruiter-analytics-skin">
   <div className="scope-banner recruiter-analytics-banner"><div className="scope-banner-icon"><AlertCircle size={19}/></div><div><b>Viewing analytics for your assigned jobs</b></div></div>
   <div className="analytics-controls recruiter-analytics-controls"><div><span>Reporting period</span><select value={range} onChange={e=>setRange(e.target.value)}><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option><option>This year</option></select></div></div>
   <div className="stats recruiter-analytics-stats"><Stat title="Avg time-to-hire" value="18d" change="-2d vs last month" icon={Clock3}/><Stat title="My total applicants" value={totalApplicants} change="Assigned jobs" icon={Users}/><Stat title="Conversion" value={`${conversion||1.4}%`} change="— Steady" icon={Sparkles}/><Stat title="Avg score" value={avg||67} change="Current applicants" icon={Sparkles}/></div>
   <div className="recruiter-analytics-grid">
    <Card className="recruiter-chart-card funnel-chart-card"><div className="chart-card-head"><h3>Funnel Drop-off</h3></div><div className="funnel-chart">{funnel.map(([label,n],i)=><div className="funnel-chart-row" key={label}><span>{label}</span><div className="funnel-bar-track"><i style={{width:`${Math.max(3,(n/Math.max(1,funnel[0][1]))*100)}%`}}/></div><b>{n}</b></div>)}</div></Card>
    <Card className="recruiter-chart-card stage-drop-card"><div className="chart-card-head"><h3>Stage Drop-off Rates</h3></div><div className="stage-bars">{dropOff.map((item,i)=><div className="stage-bar-item" key={item.label}><div className={'stage-bar '+(item.label===highestDrop.label?'highest':'')} style={{height:`${Math.max(12,item.value*2.5)}px`}}>{item.label===highestDrop.label&&<span>Highest Drop</span>}</div><small>{item.label}</small></div>)}</div></Card>
    <Card className="recruiter-chart-card trend-chart-card"><div className="chart-card-head"><h3>Time-to-Hire Trend (Days)</h3><small>Last 6 Months</small></div><div className="line-chart-wrap"><svg viewBox="0 0 560 270" role="img" aria-label="Time-to-hire trend"><line x1="45" y1="20" x2="45" y2="235"/><line x1="45" y1="235" x2="545" y2="235"/><polyline points={trend.map(([,v],i)=>`${55+i*95},${235-(v/32)*200}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2.5"/>{trend.map(([m,v],i)=><g key={m}><circle cx={55+i*95} cy={235-(v/32)*200} r="4"/><text x={55+i*95} y={255} textAnchor="middle">{m}</text><text x={55+i*95} y={225-(v/32)*200} textAnchor="middle">{v}</text></g>)}</svg></div></Card>
    <Card className="recruiter-chart-card score-chart-card"><div className="chart-card-head"><h3>Candidate Score Distribution</h3></div><div className="score-bars">{scoreBuckets.map(([label,n])=><div className="score-bar-item" key={label}><span style={{height:`${Math.max(8,n*7)}px`}}/><small>{label}</small></div>)}</div></Card>
   </div>
   </div>
 </Page>
}
function TalentPool(){
  const {candidates, updateCandidates, jobs} = useApp(); const portalRole=currentRole(); const ownerName=portalRole==='recruiter'?recruiterName():null;
  const [items,setItems]=useState(()=>JSON.parse(localStorage.getItem('hirely_talent_pool')||'null')||[
    {id:101,name:'Sarah Chen',role:'Senior Product Designer',location:'Dubai, UAE',experience:8,skills:['Figma','Design Systems','Strategy'],stage:'Saved to Talent Pool',score:88,saved:'Sep 2, 2026',owner:'Omar Ashraf'},
    {id:102,name:'Marcus Thompson',role:'Frontend Lead',location:'Remote',experience:6,skills:['React','Node.js','AWS'],stage:'Saved to Talent Pool',score:64,saved:'Aug 29, 2026',owner:'Omar Ashraf'},
    {id:103,name:'Elena Rodriguez',role:'Marketing Manager',location:'Riyadh, Saudi Arabia',experience:12,skills:['B2B SaaS','Growth','Analytics'],stage:'Saved to Talent Pool',score:92,saved:'Aug 27, 2026',owner:'Company Admin'},
    {id:104,name:'Youssef Adel',role:'Frontend Developer',location:'Cairo, Egypt',experience:4,skills:['React.js','JavaScript','TypeScript'],stage:'Saved to Talent Pool',score:84,saved:'Aug 25, 2026',owner:'Omar Ashraf'}
  ]);
  const [q,setQ]=useState('');
  const [roleFilter,setRoleFilter]=useState('Engineering');
  const [experience,setExperience]=useState('3+ Years');
  const [location,setLocation]=useState('Dubai, UAE');
  const [skills,setSkills]=useState(['React.js','TypeScript']);
  const [tab,setTab]=useState('all');
  const [sort,setSort]=useState('Relevance');
  const [page,setPage]=useState(1);
  const [filtersActive,setFiltersActive]=useState(false);
  const [importFile,setImportFile]=useState(null);
  const [add,setAdd]=useState(false);
  const [addError,setAddError]=useState('');
  const [bulk,setBulk]=useState(false);
  const [profile,setProfile]=useState(null);
  const [pipelineJob,setPipelineJob]=useState('');
  const [pipelineRole,setPipelineRole]=useState('');
  const [pipelineCandidate,setPipelineCandidate]=useState(null);
  const [pipelineError,setPipelineError]=useState('');
  const [magic,setMagic]=useState(false);
  const [menu,setMenu]=useState(null);
  const [tagTarget,setTagTarget]=useState(null);
  const [skillModal,setSkillModal]=useState(false);
  const perPage=3;

  useEffect(()=>{localStorage.setItem('hirely_talent_pool',JSON.stringify(items))},[items]);
  useEffect(()=>{setPage(1)},[q,roleFilter,experience,location,skills,tab,sort,filtersActive]);

  const removeSkill=(skill)=>{setSkills(skills.filter(x=>x!==skill));setFiltersActive(true)};
  const addSkill=()=>setSkillModal(true);
  const roleMatch=(x)=>{
    if(!filtersActive) return true;
    if(roleFilter==='All') return true;
    if(roleFilter==='Engineering') return /engineer|developer|frontend|backend|technical|lead/i.test(x.role);
    if(roleFilter==='Design') return /designer|design|ux/i.test(x.role);
    if(roleFilter==='Marketing') return /marketing|growth/i.test(x.role);
    return true;
  };
  const expMatch=(x)=>{
    if(!filtersActive) return true;
    if(experience==='Any') return true;
    if(experience==='3+ Years') return x.experience>=3;
    if(experience==='5+ Years') return x.experience>=5;
    if(experience==='10+ Years') return x.experience>=10;
    return true;
  };
  const locationMatch=(x)=>!filtersActive || location==='Any Location' || !location.trim() || x.location.toLowerCase().includes(location.toLowerCase().replace(', uae','').trim());
  const skillMatch=(x)=>!filtersActive || !skills.length || skills.some(s=>x.skills.some(k=>k.toLowerCase().includes(s.toLowerCase())));
  const scopedItems=portalRole==='recruiter'?items.filter(x=>!x.owner||x.owner===ownerName):items;
  const filtered=scopedItems.filter(x=>{
    const text=[x.name,x.role,x.location,...x.skills].join(' ').toLowerCase();
    const search=!q.trim() || text.includes(q.toLowerCase().trim());
    const matches=search && roleMatch(x) && expMatch(x) && locationMatch(x) && skillMatch(x);
    if(tab==='matches') return matches && x.score>=80;
    if(tab==='recent') return matches && /Sep|Aug/.test(x.saved);
    return matches;
  }).sort((a,b)=>sort==='AI Score' ? b.score-a.score : sort==='Name' ? a.name.localeCompare(b.name) : b.score-a.score);
  const totalPages=Math.max(1,Math.ceil(filtered.length/perPage));
  const pageItems=filtered.slice((page-1)*perPage,page*perPage);
  const initialCount=scopedItems.length;
  const normalizePerson=v=>String(v||'').trim().toLowerCase();
  const sameTalentPerson=(a,b)=>{
    const source=a.sourceCandidateId!=null&&b.sourceCandidateId!=null&&String(a.sourceCandidateId)===String(b.sourceCandidateId);
    const email=normalizePerson(a.email)&&normalizePerson(b.email)&&normalizePerson(a.email)===normalizePerson(b.email);
    const nameRole=normalizePerson(a.name)&&normalizePerson(b.name)&&normalizePerson(a.name)===normalizePerson(b.name)&&normalizePerson(a.role||a.job)===normalizePerson(b.role||b.job);
    return source||email||nameRole;
  };
  const addCandidate=(data)=>{
    const exists=items.some(x=>sameTalentPerson(x,data));
    if(exists){setAddError('This candidate is already in the Talent Pool.');return false;}
    const candidate={...data,id:Date.now(),saved:'Today',score:Number(data.score||75),stage:'Saved to Talent Pool',owner:ownerName||'Company Admin'};
    setItems([candidate,...items]);
    setAdd(false);
    setAddError('');
    return true;
  };
  const deleteCandidate=(id)=>{
    setItems(items.filter(x=>x.id!==id));
    setMenu(null);
    setProfile(p=>p?.id===id?null:p);
  };
  const addToPipeline=(x,jobId,customRole='')=>{
    const targetJob=jobs.find(j=>String(j.id)===String(jobId));
    const targetTitle=targetJob?.title || customRole.trim();
    const entryStage=portalRole==='recruiter'?'Applied':'Sourced';
    if(!targetTitle){setPipelineError('Select a target job first.');return;}
    const samePersonInTarget=candidates.find(c=>{
      const person=sameTalentPerson(c,x);
      const roleSame=(targetJob&&((c.jobId!=null&&String(c.jobId)===String(targetJob.id))||normalizePerson(c.job)===normalizePerson(targetJob.title)))||(!targetJob&&normalizePerson(c.job)===normalizePerson(targetTitle));
      return person&&roleSame;
    });
    if(samePersonInTarget){setPipelineError(`This candidate is already in the ${targetTitle} pipeline.`);return;}
    const next=[...candidates,{id:Date.now(),sourceCandidateId:x.sourceCandidateId??x.id,name:x.name,email:x.email||`${x.name.toLowerCase().replace(/\s+/g,'.')}@example.com`,jobId:targetJob?.id??null,job:targetTitle,stage:entryStage,applicationStage:entryStage,score:Number(x.score||75),primarySkills:x.skills||[],skills:Number(x.score||75),experience:Number(x.experience||3)*10,education:75,location:75,owner:ownerName||'Company Admin',applied:'Today',activity:[`Added from Talent Pool to ${targetTitle} by ${ownerName||'Company Admin'}`] }];
    updateCandidates(next);setMenu(null);setProfile(null);setPipelineCandidate(null);setPipelineJob('');setPipelineRole('');setPipelineError('');
  };
  const runMagicMatch=()=>{setMagic(true);setTab('matches');setSort('AI Score');setRole('All');setExperience('Any');setLocation('Any Location');setSkills([]);setFiltersActive(false)};
  return <Page title="Talent Pool" subtitle={portalRole==='recruiter'?"Your personal saved candidates for future roles.":"Access candidates from your historical recruitment data."} actions={<><Button onClick={()=>{setAddError('');setAdd(true)}}><UserPlus size={15}/> Add member</Button><Button variant="secondary" onClick={()=>setBulk(true)}><Download size={15}/> Bulk Import</Button>{portalRole!=='recruiter'&&<Button variant="secondary" onClick={runMagicMatch}><Sparkles size={15}/> Magic Match</Button>}</>}>
    <div className="talent-layout">
      <div>
        <Card className="talent-filter-card">
          <div className="talent-filter-head"><h3>Advanced Filter</h3><button className="link-button" onClick={()=>{setRole('All');setExperience('Any');setLocation('Any Location');setSkills([]);setQ('');setFiltersActive(false)}}>Clear all</button></div>
          <div className="talent-filters">
            <Field label="Role category"><select value={roleFilter} onChange={e=>{setRoleFilter(e.target.value);setFiltersActive(true)}}><option>All</option><option>Engineering</option><option>Design</option><option>Marketing</option></select></Field>
            <Field label="Min. experience"><select value={experience} onChange={e=>{setExperience(e.target.value);setFiltersActive(true)}}><option>Any</option><option>3+ Years</option><option>5+ Years</option><option>10+ Years</option></select></Field>
            <Field label="Location"><div className="talent-location"><Search size={15}/><input value={location} onChange={e=>{setLocation(e.target.value);setFiltersActive(true)}} placeholder="Dubai, UAE"/></div></Field>
          </div>
          <div className="talent-chips">{skills.map(s=><button className="talent-chip" key={s} onClick={()=>removeSkill(s)}>{s}<X size={12}/></button>)}<button className="chip-add" onClick={addSkill}>+</button></div>
        </Card>
        <Card className="talent-table-card">
          <div className="talent-tabs"><div><button className={tab==='all'?'active':''} onClick={()=>setTab('all')}>All Candidates</button><button className={tab==='recent'?'active':''} onClick={()=>setTab('recent')}>Recently Active</button><button className={tab==='matches'?'active':''} onClick={()=>setTab('matches')}>Matches ({scopedItems.filter(x=>x.score>=80).length})</button></div><div className="talent-sort"><span>Sort by:</span><select value={sort} onChange={e=>setSort(e.target.value)}><option>Relevance</option><option>AI Score</option><option>Name</option></select><SlidersHorizontal size={17}/></div></div>
          <div className="talent-table-scroll"><table className="talent-table"><thead><tr><th>Candidate</th><th>Experience & Skills</th><th>Last Status</th><th>AI Score</th><th></th></tr></thead><tbody>
            {pageItems.length ? pageItems.map(x=><tr key={x.id}><td><div className="talent-person"><span className="avatar talent-avatar">{x.name.split(' ').map(y=>y[0]).join('').slice(0,2)}</span><div><b>{x.name}</b><small>{x.role} · {x.location}</small></div></div></td><td><b>{x.experience} Years Experience</b><div className="talent-skills">{x.skills.map(s=><span key={s}>{s}</span>)}</div></td><td><Badge tone={/Offer Declined/i.test(x.stage)?'green':/Interviewed|Shortlisted/i.test(x.stage)?'purple':'neutral'}>{x.stage}</Badge></td><td><Score value={x.score}/></td><td className="talent-menu-cell"><button className="icon" onClick={()=>setMenu(menu===x.id?null:x.id)}><MoreHorizontal size={18}/></button>{menu===x.id&&<div className="menu talent-row-menu"><button onClick={()=>{setProfile(x);setMenu(null)}}>View profile</button><button onClick={()=>{setTagTarget(x);setMenu(null)}}>Add tag</button><button onClick={()=>{setPipelineCandidate(x);setPipelineJob('');setPipelineRole(x.role||'');setPipelineError('');setMenu(null)}}>Add to pipeline</button>{portalRole!=='recruiter'&&<button className="danger-text" onClick={()=>deleteCandidate(x.id)}>Remove from pool</button>}</div>}</td></tr>) : <tr><td colSpan="5"><div className="talent-empty">No candidates match these filters.</div></td></tr>}
          </tbody></table></div>
          <div className="talent-footer"><span>Showing {filtered.length?((page-1)*perPage+1):0} to {Math.min(page*perPage,filtered.length)} of {initialCount.toLocaleString()} candidates</span><div className="pagination"><button className="icon" disabled={page===1} onClick={()=>setPage(Math.max(1,page-1))}><ChevronLeft size={17}/></button>{Array.from({length:Math.min(3,totalPages)},(_,i)=>i+1).map(n=><button key={n} className={page===n?'current':''} onClick={()=>setPage(n)}>{n}</button>)}<button className="icon" disabled={page===totalPages} onClick={()=>setPage(Math.min(totalPages,page+1))}><ChevronRight size={17}/></button></div></div>
        </Card>
      </div>
      <div className="talent-stats"><Card className="talent-total"><small>{portalRole==='recruiter'?'PERSONAL TALENT':'TOTAL TALENT'}</small><strong>{initialCount.toLocaleString()}</strong><span><Users size={20}/></span></Card><Card className="talent-hired"><small>{portalRole==='recruiter'?'SAVED MATCHES':'HIRED THIS MONTH'}</small><strong>{scopedItems.filter(x=>x.score>=80).length}</strong><span><CheckCircle2 size={20}/></span></Card></div>
    </div>
    {add&&<TalentAddModal onClose={()=>{setAdd(false);setAddError('')}} onSave={addCandidate} error={addError} candidates={portalRole==='recruiter'?recruiterCandidates(candidates,jobs):candidates}/>} 
    {bulk&&<Modal title="Bulk import candidates" onClose={()=>setBulk(false)} footer={<><Button variant="ghost" onClick={()=>setBulk(false)}>Cancel</Button><Button disabled={!importFile} onClick={()=>{if(importFile){const reader=new FileReader();reader.onload=e=>{const rows=String(e.target.result).split(/\r?\n/).slice(1).filter(Boolean);const imported=rows.map((row,i)=>{const parts=row.split(',').map(v=>v.trim());return {id:Date.now()+i,name:parts[0]||`Imported Candidate ${i+1}`,role:parts[1]||'Software Engineer',location:parts[2]||'Remote',experience:Number(parts[3]||3),skills:(parts[4]||'JavaScript, React').split('|').map(v=>v.trim()),stage:parts[5]||'Imported',score:Number(parts[6]||75),saved:'Today',owner:ownerName||'Company Admin'}});setItems([...imported,...items]);setImportFile(null);setBulk(false)};reader.readAsText(importFile)}}}>Import candidates</Button></>}><div className="bulk-import"><Download size={28}/><h3>Import candidate history</h3><p>Choose a CSV file. Columns can be name, role, location, experience, skills, status and score.</p><input type="file" accept=".csv" onChange={e=>setImportFile(e.target.files?.[0]||null)}/>{importFile&&<small>{importFile.name}</small>}</div></Modal>}
    {profile&&<Modal title="Candidate profile" onClose={()=>setProfile(null)} footer={<><Button variant="ghost" onClick={()=>setProfile(null)}>Close</Button><Button onClick={()=>{setPipelineCandidate(profile);setPipelineJob('');setPipelineRole(profile.role||'');setPipelineError('');setProfile(null)}}>Add to pipeline</Button></>}><div className="talent-profile"><span className="avatar xl talent-avatar">{profile.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</span><h2>{profile.name}</h2><p>{profile.role} · {profile.location}</p><p>{profile.experience} Years Experience</p><h4>Skills</h4><div className="talent-skills">{profile.skills.map(s=><span key={s}>{s}</span>)}</div><h4>Last status</h4><Badge tone="purple">{profile.stage}</Badge></div></Modal>}
    {tagTarget&&<TextInputModal title="Add tag" label="Tag name" placeholder="e.g. Strong candidate" onClose={()=>setTagTarget(null)} onSave={value=>{setItems(items.map(item=>item.id===tagTarget.id?{...item,tags:[...new Set([...(item.tags||[]),value])]}:item));setTagTarget(null)}} saveLabel="Save tag"/>}
  {skillModal&&<TextInputModal title="Add skill" label="Skill" placeholder="e.g. React" onClose={()=>setSkillModal(false)} onSave={value=>{if(!skills.includes(value)){setSkills([...skills,value]);setFiltersActive(true)}setSkillModal(false)}} saveLabel="Add skill"/>}
    {pipelineCandidate&&<Modal title="Add to pipeline" onClose={()=>setPipelineCandidate(null)} footer={<><Button variant="ghost" onClick={()=>{setPipelineCandidate(null);setPipelineError('')}}>Cancel</Button><Button onClick={()=>addToPipeline(pipelineCandidate,pipelineJob,pipelineRole)} disabled={portalRole==='recruiter'?!pipelineJob:(!pipelineJob&&!pipelineRole.trim())}>Add to pipeline</Button></>}><p><b>{pipelineCandidate.name}</b> will enter the pipeline at {portalRole==='recruiter'?'the Applied stage':'the Sourced stage'}. {portalRole==='recruiter'?'Choose one of your active assigned jobs.':'Choose an existing job or enter a future role.'}</p><Field label="Target job"><select value={pipelineJob} onChange={e=>{setPipelineJob(e.target.value);if(e.target.value)setPipelineRole('')}}><option value="">{portalRole==='recruiter'?'Select an active job':'Select an existing job'}</option>{(portalRole==='recruiter'?recruiterJobs(jobs):jobs).filter(j=>portalRole==='recruiter'?j.status==='Open':true).map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></Field>{pipelineError&&<div className="form-error">{pipelineError}</div>}{portalRole!=='recruiter'&&<><div className="field-divider">or</div><Field label="Future / other role"><input value={pipelineRole} onChange={e=>{setPipelineRole(e.target.value);if(e.target.value)setPipelineJob('')}} placeholder="e.g. Marketing Specialist"/></Field></>}</Modal>}
  </Page>
}
function TalentAddModal({onClose,onSave,candidates=[],error=''}){
  const available=candidates.filter(c=>!['Archived','Withdrawn'].includes(c.stage));
  const [selected,setSelected]=useState('');
  const [name,setName]=useState('');const [role,setRole]=useState('Frontend Developer');const [location,setLocation]=useState('Cairo, Egypt');const [experience,setExperience]=useState(3);const [skills,setSkills]=useState('React, JavaScript');
  const chooseCandidate=(id)=>{
    setSelected(id);
    const c=available.find(x=>String(x.id)===String(id));
    if(!c)return;
    setName(c.name||'');setRole(c.job||'Frontend Developer');setLocation(c.locationName||'Cairo, Egypt');setExperience(Number(c.yearsExperience??c.experience??3));setSkills((c.primarySkills||[]).join(', ')||'React, JavaScript');
  };
  const submit=()=>onSave({name:name.trim(),role,location,experience:Number(experience),skills:skills.split(',').map(x=>x.trim()).filter(Boolean),stage:'Saved to Talent Pool',score:75,sourceCandidateId:selected?Number(selected):undefined,email:available.find(x=>String(x.id)===String(selected))?.email});
  return <Modal title="Add member" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!name.trim()} onClick={submit}>Add member</Button></>}><Field label="Candidate"><select value={selected} onChange={e=>chooseCandidate(e.target.value)}><option value="">Add new candidate</option>{available.map(c=><option key={c.id} value={c.id}>{c.name} · {c.job||'Candidate'}</option>)}</select></Field><Field label="Candidate name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarah Chen"/></Field><Field label="Role"><input value={role} onChange={e=>setRole(e.target.value)}/></Field><div className="form-grid"><Field label="Location"><input value={location} onChange={e=>setLocation(e.target.value)}/></Field><Field label="Years of experience"><input type="number" min="0" value={experience} onChange={e=>setExperience(e.target.value)}/></Field></div><Field label="Skills"><input value={skills} onChange={e=>setSkills(e.target.value)} placeholder="React, TypeScript, AWS"/></Field>{error&&<div className="form-error">{error}</div>}<p className="muted">You can add an existing candidate from your candidate list or create a new talent pool member.</p></Modal>
}
function Team(){
  const {team,updateTeam,jobs,updateJobs}=useApp();
  const [invite,setInvite]=useState(false),[menu,setMenu]=useState(null),[assignId,setAssignId]=useState(null),[assignedSelection,setAssignedSelection]=useState([]),[email,setEmail]=useState(''),[filter,setFilter]=useState('All Members'),[statusFilter,setStatusFilter]=useState('All Status'),[deleteId,setDeleteId]=useState(null),[inviteError,setInviteError]=useState(''),[roleConfirm,setRoleConfirm]=useState(null),[inviteLink,setInviteLink]=useState('');
  const filtered=team.filter(m=>(filter==='All Members'||(filter==='Admins'&&m.role==='Admin')||(filter==='Recruiters'&&m.role==='Recruiter'))&&(statusFilter==='All Status'||m.status===statusFilter));
  const admins=team.filter(m=>m.role==='Admin').length,recruiters=team.filter(m=>m.role==='Recruiter'&&m.status==='Active').length;
  const sendInvite=()=>{if(!/^\S+@\S+\.\S+$/.test(email))return setInviteError('Enter a valid email address.');const normalized=email.trim().toLowerCase();if(team.some(x=>x.email.toLowerCase()===normalized))return setInviteError('This member is already on the team.');const invitedAt=new Date().toISOString();const expiresAt=new Date(Date.now()+72*60*60*1000).toISOString();const token=window.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;const member={id:Date.now(),name:email.split('@')[0].replace(/[._]/g,' '),email:normalized,role:'Recruiter',status:'Pending',assignedJobs:0,lastActive:'-',invitedAt,expiresAt,inviteToken:token};updateTeam([member,...team]);const accounts=JSON.parse(localStorage.getItem('hirely_recruiter_accounts')||'[]');localStorage.setItem('hirely_recruiter_accounts',JSON.stringify([...accounts,{...member,password:'',title:'Recruiter',company:'Hirely Tech Hub',invitedAt,expiresAt,inviteToken:token}]));setInviteError('');setInvite(false);setInviteLink(`${window.location.origin}/recruiter/setup?email=${encodeURIComponent(normalized)}&token=${encodeURIComponent(token)}`);setEmail('')};
  const changeRole=id=>{const member=team.find(x=>x.id===id);if(!member||member.status!=='Active')return;setRoleConfirm(member);setMenu(null)}; const confirmRoleChange=()=>{const member=roleConfirm;if(!member)return;const nextRole=member.role==='Recruiter'?'Admin':'Recruiter';updateTeam(team.map(x=>x.id===member.id?{...x,role:nextRole}:x));if(member.email){const accounts=JSON.parse(localStorage.getItem('hirely_recruiter_accounts')||'[]');const exists=accounts.some(a=>a.email?.toLowerCase()===member.email.toLowerCase());const nextAccounts=exists?accounts.map(a=>a.email?.toLowerCase()===member.email.toLowerCase()?{...a,role:nextRole,name:member.name,status:member.status}:a):[...accounts,{email:member.email,password:'password',role:nextRole,name:member.name,status:member.status,title:nextRole==='Admin'?'Company Admin':'Recruiter',company:'Hirely Tech Hub'}];localStorage.setItem('hirely_recruiter_accounts',JSON.stringify(nextAccounts));const session=JSON.parse(localStorage.getItem('hirely_recruiter_session')||'null');if(session?.email?.toLowerCase()===member.email.toLowerCase())localStorage.setItem('hirely_recruiter_session',JSON.stringify({...session,role:nextRole}));}setRoleConfirm(null)}; const resendInvite=id=>{const member=team.find(x=>x.id===id);if(!member||member.status!=='Pending')return;const invitedAt=new Date().toISOString();const expiresAt=new Date(Date.now()+72*60*60*1000).toISOString();const token=window.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;const updated={...member,invitedAt,expiresAt,inviteToken:token};updateTeam(team.map(x=>x.id===id?updated:x));const accounts=JSON.parse(localStorage.getItem('hirely_recruiter_accounts')||'[]');localStorage.setItem('hirely_recruiter_accounts',JSON.stringify(accounts.map(a=>a.email?.toLowerCase()===member.email.toLowerCase()?{...a,invitedAt,expiresAt,inviteToken:token,status:'Pending'}:a)));setInviteLink(`${window.location.origin}/recruiter/setup?email=${encodeURIComponent(member.email)}&token=${encodeURIComponent(token)}`);setMenu(null)}; const toggleMemberStatus=id=>{const member=team.find(x=>x.id===id);if(!member)return;if(member.status==='Pending'){resendInvite(id);return}const deactivating=member.status==='Active';if(!deactivating&&member.status!=='Deactivated')return;const nextStatus=deactivating?'Deactivated':'Active';if(deactivating){const reassigned=jobs.map(j=>(j.assignedTo===member.name||j.owner===member.name||j.createdBy===member.name)&&j.status==='Open'?{...j,assignedTo:'Company Admin',owner:'Company Admin',createdBy:'Company Admin'}:j);updateJobs(reassigned);updateTeam(team.map(x=>x.id===id?{...x,status:nextStatus,assignedJobs:0}:x));if(member.email){const accounts=JSON.parse(localStorage.getItem('hirely_recruiter_accounts')||'[]');localStorage.setItem('hirely_recruiter_accounts',JSON.stringify(accounts.map(a=>a.email?.toLowerCase()===member.email.toLowerCase()?{...a,status:'Deactivated'}:a)));}if(JSON.parse(localStorage.getItem('hirely_recruiter_session')||'null')?.email?.toLowerCase()===member.email.toLowerCase())localStorage.removeItem('hirely_recruiter_session');pushRoleNotification('company-admin',notificationEntry('Recruiter deactivated',`${member.name} was deactivated. Assigned open jobs were returned to Company Admin.`,'/team'));}else{updateTeam(team.map(x=>x.id===id?{...x,status:nextStatus}:x));if(member.email){const accounts=JSON.parse(localStorage.getItem('hirely_recruiter_accounts')||'[]');localStorage.setItem('hirely_recruiter_accounts',JSON.stringify(accounts.map(a=>a.email?.toLowerCase()===member.email.toLowerCase()?{...a,status:'Active'}:a)));}}setMenu(null)}; const openAssign=id=>{const member=team.find(x=>x.id===id);if(!member||member.status!=='Active'||member.role!=='Recruiter')return;setAssignId(id);setAssignedSelection(jobs.filter(j=>j.assignedTo===member.name).map(j=>String(j.id)));setMenu(null)}; const saveAssignments=()=>{const member=team.find(x=>x.id===assignId);if(!member)return;const nextJobs=jobs.map(j=>{const selected=assignedSelection.includes(String(j.id));const ownedByMember=j.assignedTo===member.name;return selected?{...j,assignedTo:member.name}:ownedByMember?{...j,assignedTo:'Company Admin'}:j});updateJobs(nextJobs);updateTeam(team.map(x=>x.role==='Recruiter'?{...x,assignedJobs:nextJobs.filter(j=>j.assignedTo===x.name).length}:x));pushRoleNotification('recruiter',notificationEntry('Jobs updated',`Your assigned jobs were updated by Company Admin.`,'/jobs'));setAssignId(null)};
  return <Page title="Team Management" subtitle="Manage recruiters, admins and their access levels." actions={<Button onClick={()=>setInvite(true)}><UserPlus size={15}/> Invite Member</Button>}>
    <div className="team-stats"><Stat title="Total members" value={team.length} change="+3 this month" icon={Users}/><Stat title="Admins" value={admins} change="Global Access" icon={ShieldCheck}/><Stat title="Active recruits" value={recruiters} change="Currently online" icon={UserRound}/><Stat title="Avg. response time" value="4.2h" change="-12% improved" icon={Clock3}/></div>
    <Card className="team-table-card"><div className="team-tabs"><div>{['All Members','Admins','Recruiters'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div><label className="team-filter-status"><SlidersHorizontal size={15}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All Status</option><option>Active</option><option>Pending</option><option>Deactivated</option></select></label></div><div className="table-wrap team-table-wrap"><table><thead><tr><th>Member</th><th>Role</th><th>Assigned Jobs</th><th>Last Active</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(m=><tr key={m.id}><td><div className="person"><span className="avatar">{m.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</span><div><b>{m.name}</b><small>{m.email}</small></div></div></td><td><Badge tone={m.role==='Admin'?'purple':'blue'}>{m.role}</Badge></td><td>{m.assignedJobs??0}</td><td>{m.lastActive||'Sep 2026'}</td><td><Badge tone={m.status==='Active'?'green':m.status==='Pending'?'amber':'red'}>{m.status}</Badge></td><td className="menu-cell"><button className="icon" onClick={()=>setMenu(menu===m.id?null:m.id)}><MoreHorizontal size={17}/></button>{menu===m.id&&<div className="menu team-menu">{m.status==='Active'&&<><button onClick={()=>changeRole(m.id)}>Change role to {m.role==='Recruiter'?'Admin':'Recruiter'}</button>{m.role==='Recruiter'&&<button onClick={()=>openAssign(m.id)}>Assign jobs</button>}</>}{m.status==='Pending'?<button onClick={()=>resendInvite(m.id)}>Resend invitation</button>:<button onClick={()=>toggleMemberStatus(m.id)}>{m.status==='Active'?'Deactivate account':'Reactivate account'}</button>}<button onClick={()=>{setDeleteId(m.id);setMenu(null)}}>Delete from team</button></div>}</td></tr>)}</tbody></table></div>{!filtered.length&&<div className="empty-state">No team members in this filter.</div>}</Card>
    <div className="permission-grid"><Card className="permission-card"><div className="permission-icon"><ShieldCheck size={20}/></div><div><h3>Admin Permissions</h3><p>Full access to billing, team management, company jobs, analytics, exports and the full talent pool.</p></div></Card><Card className="permission-card"><div className="permission-icon recruiter"><UserRound size={20}/></div><div><h3>Recruiter Permissions</h3><p>Manage assigned job postings, interact with candidates and update pipeline stages. Billing and company settings remain restricted.</p></div></Card></div>
    {invite&&<Modal title="Invite Member" onClose={()=>setInvite(false)} footer={<><Button variant="ghost" onClick={()=>setInvite(false)}>Cancel</Button><Button onClick={sendInvite}>Send invitation</Button></>}><Field label="Member email"><input type="email" value={email} onChange={e=>{setEmail(e.target.value);setInviteError('')}} placeholder="member@example.com"/></Field>{inviteError&&<div className="form-error">{inviteError}</div>}<p className="muted">The invitation link expires after 72 hours. The member will complete the recruiter account setup flow.</p></Modal>}
    {assignId&&<Modal title="Assign jobs" onClose={()=>setAssignId(null)} footer={<><Button variant="ghost" onClick={()=>setAssignId(null)}>Cancel</Button><Button onClick={saveAssignments}>Save assignments</Button></>}><p>Select the jobs assigned to this recruiter.</p><div className="assignment-list">{jobs.map(j=><label key={j.id} className="assignment-item"><input type="checkbox" checked={assignedSelection.includes(String(j.id))} onChange={e=>setAssignedSelection(x=>e.target.checked?[...x,String(j.id)]:x.filter(id=>id!==String(j.id)))}/><span><b>{j.title}</b><small>{j.department} · {j.status}</small></span></label>)}</div></Modal>}
    {deleteId&&<Modal title="Delete team member?" onClose={()=>setDeleteId(null)} footer={<><Button variant="ghost" onClick={()=>setDeleteId(null)}>Cancel</Button><Button variant="danger" onClick={()=>{
      const member=team.find(x=>x.id===deleteId);
      // Delete removes the recruiter's login record entirely — unlike
      // Deactivate, which keeps the record and only blocks access.
      if(member?.email){
        const accounts=JSON.parse(localStorage.getItem('hirely_recruiter_accounts')||'[]');
        localStorage.setItem('hirely_recruiter_accounts',JSON.stringify(accounts.filter(a=>a.email?.toLowerCase()!==member.email.toLowerCase())));
        if(JSON.parse(localStorage.getItem('hirely_recruiter_session')||'null')?.email?.toLowerCase()===member.email.toLowerCase())localStorage.removeItem('hirely_recruiter_session');
      }
      if(member)updateJobs(jobs.map(j=>(j.assignedTo===member.name||j.owner===member.name||j.createdBy===member.name)&&j.status==='Open'?{...j,assignedTo:'Company Admin',owner:'Company Admin',createdBy:'Company Admin'}:j));
      updateTeam(team.filter(x=>x.id!==deleteId));setDeleteId(null)
    }}>Delete member</Button></>}><p>This permanently removes the member's account and login access. Their open jobs are reassigned to the Company Admin.</p></Modal>}
    {roleConfirm&&<Modal title="Confirm role change" onClose={()=>setRoleConfirm(null)} footer={<><Button variant="ghost" onClick={()=>setRoleConfirm(null)}>Cancel</Button><Button onClick={confirmRoleChange}>Confirm change</Button></>}><p>Change <b>{roleConfirm.name}</b>'s role from <b>{roleConfirm.role}</b> to <b>{roleConfirm.role==='Recruiter'?'Admin':'Recruiter'}</b>?</p><p className="muted">The new role will be used on the member's next login.</p></Modal>}
    {inviteLink&&<InviteLinkModal link={inviteLink} onClose={()=>setInviteLink('')}/>}
  </Page>
}
function Profile(){
 const {profile,setProfile,company,setCompany}=useApp(); const recruiter=currentRole()==='recruiter'; const displayProfile=recruiter?(JSON.parse(localStorage.getItem('hirely_recruiter_profile')||'null')||recruiterSession()):profile; const [saved,setSaved]=useState(false); const [photoError,setPhotoError]=useState(''); const photoInputRef=React.useRef(null); const [notifs,setNotifs]=useState({applications:true,interviews:true,announcements:false}); const [currentPass,setCurrentPass]=useState(''); const [newPass,setNewPass]=useState(''); const [passwordMessage,setPasswordMessage]=useState('');
 const updateProfile=(patch)=>setProfile({...displayProfile,...patch});
 const handlePhotoChange=(e)=>{const file=e.target.files?.[0];if(!file)return;setPhotoError('');if(!file.type.startsWith('image/')){setPhotoError('Please choose an image file.');return}if(file.size>2*1024*1024){setPhotoError('Image must be 2 MB or smaller.');return}const reader=new FileReader();reader.onload=()=>updateProfile({photo:String(reader.result)});reader.readAsDataURL(file);e.target.value=''};
 const savePassword=()=>{if(!currentPass.trim()||!newPass.trim())return setPasswordMessage('Enter your current password and new password.');if(newPass.length<8)return setPasswordMessage('New password must contain at least 8 characters.');if(recruiter){const accounts=JSON.parse(localStorage.getItem('hirely_recruiter_accounts')||'[]');const account=accounts.find(x=>x.email===displayProfile.email)||({email:displayProfile.email,password:'password'});if(account.password&&currentPass!==account.password)return setPasswordMessage('Current password is incorrect.');localStorage.setItem('hirely_recruiter_accounts',JSON.stringify(accounts.some(x=>x.email===displayProfile.email)?accounts.map(x=>x.email===displayProfile.email?{...x,password:newPass}:x):[...accounts,{...displayProfile,password:newPass}]));}else{const account=JSON.parse(localStorage.getItem('hirely_account')||'null');if(account?.password&&currentPass!==account.password)return setPasswordMessage('Current password is incorrect.');if(account)localStorage.setItem('hirely_account',JSON.stringify({...account,password:newPass}));}setCurrentPass('');setNewPass('');setPasswordMessage('Password updated successfully.')};
 return <Page title={recruiter?'My Profile':'Profile Settings'} subtitle={recruiter?'Manage your recruiter profile and notification preferences.':'Manage your account and company preferences.'}>
  <Card className="profile-hero"><div className="profile-photo-wrap"><button type="button" className="avatar xl profile-photo profile-photo-button" onClick={()=>photoInputRef.current?.click()} aria-label="Change profile photo">{displayProfile.photo?<img src={displayProfile.photo} alt="Profile"/>:displayProfile.name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()}<span className="profile-camera" aria-hidden="true"><Camera size={16}/></span></button><input ref={photoInputRef} className="profile-photo-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange}/>{displayProfile.photo&&<button type="button" className="profile-photo-remove" onClick={()=>updateProfile({photo:null})}>Remove</button>}{photoError&&<small className="form-error profile-photo-error">{photoError}</small>}</div><div><h2>{displayProfile.name}</h2><p>{displayProfile.title} · {displayProfile.company}</p><small>{displayProfile.email}</small></div><Badge tone="green">Active</Badge></Card>
  <div className="grid two"><Card><h3>Personal information</h3><div className="form-grid"><Field label="Full name"><input value={displayProfile.name} onChange={e=>updateProfile({name:e.target.value})}/></Field><Field label="Email"><input value={displayProfile.email} disabled/></Field><Field label="Job title"><input value={displayProfile.title||''} onChange={e=>updateProfile({title:e.target.value})}/></Field><Field label="Phone"><input value={displayProfile.phone||''} onChange={e=>updateProfile({phone:e.target.value})}/></Field></div><Button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),1500)}}>Save changes</Button>{saved&&<span className="saved">Saved</span>}</Card>
  <Card><h3><Bell size={18}/> Notification settings</h3>{Object.entries(notifs).map(([k,v])=><div className="setting" key={k}><div><b>{k==='applications'?'New applications':k==='interviews'?'Interview updates':'Product announcements'}</b><small>Receive updates in your Hirely inbox.</small></div><button className={'toggle '+(v?'on':'')} onClick={()=>setNotifs({...notifs,[k]:!v})}><i/></button></div>)}</Card></div>
  {!recruiter&&<Card className="company-profile-card"><h3>Company profile</h3><p className="muted">Update the company information used across your workspace.</p><div className="form-grid"><Field label="Company name"><input value={company.name||''} onChange={e=>setCompany({...company,name:e.target.value})}/></Field><Field label="Industry"><select value={company.industry||'Technology'} onChange={e=>setCompany({...company,industry:e.target.value})}><option>Technology</option><option>Finance</option><option>Healthcare</option><option>Retail</option><option>Education</option></select></Field><Field label="Company size"><select value={company.size||'11-50'} onChange={e=>setCompany({...company,size:e.target.value})}><option>1-10</option><option>11-50</option><option>51-200</option><option>201-500</option><option>500+</option></select></Field><Field label="Website"><input value={company.website||''} onChange={e=>setCompany({...company,website:e.target.value})}/></Field></div><Button variant="secondary" onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),1500)}}>Save company profile</Button></Card>}
  <Card className="security-card"><div className="section-heading"><div><h3><LockKeyhole size={18}/> Security & Credentials</h3><p>Update your account password.</p></div><ShieldCheck size={20}/></div><div className="form-grid security-fields"><Field label="Current password"><input type="password" value={currentPass} onChange={e=>setCurrentPass(e.target.value)} placeholder="Enter current password"/></Field><Field label="New password"><input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="At least 8 characters"/></Field></div><div className="right"><Button onClick={savePassword}>Update password</Button></div>{passwordMessage&&<p className={passwordMessage.includes('successfully')?'success-text':'form-error'}>{passwordMessage}</p>}</Card>
 </Page>
}
function RecruiterSetup(){
 const {team,updateTeam}=useApp(); const [params]=useSearchParams(); const navg=useNavigate();
 const email=(params.get('email')||'').trim().toLowerCase(); const inviteToken=params.get('token')||''; const accountList=JSON.parse(localStorage.getItem('hirely_recruiter_accounts')||'[]'); const invited=accountList.find(x=>x.email?.toLowerCase()===email && (!x.inviteToken || x.inviteToken===inviteToken)); const invitationExpired=!!invited?.expiresAt && new Date(invited.expiresAt).getTime()<Date.now();
 const [name,setName]=useState(invited?.name||email.split('@')[0].replace(/[._-]/g,' ')); const [title,setTitle]=useState(invited?.title||'Recruiter'); const [phone,setPhone]=useState(invited?.phone||''); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [error,setError]=useState('');
 const setup=()=>{if(!email||!invited||invitationExpired)return setError('This invitation is invalid or has expired. Ask your Company Admin to send a new invitation.');if(!name.trim())return setError('Full name is required.');if(password.length<8)return setError('Password must contain at least 8 characters.');if(password!==confirm)return setError('Passwords do not match.');const nextAccount={...invited,name:name.trim(),title:title.trim()||'Recruiter',phone:phone.trim(),password,status:'Active',role:'Recruiter'};localStorage.setItem('hirely_recruiter_accounts',JSON.stringify(accountList.map(x=>x.email?.toLowerCase()===email?nextAccount:x)));localStorage.setItem('hirely_recruiter_profile',JSON.stringify({id:nextAccount.id,name:nextAccount.name,email:nextAccount.email,title:nextAccount.title,phone:nextAccount.phone,company:nextAccount.company||'Hirely Tech Hub'}));localStorage.setItem('hirely_recruiter_session',JSON.stringify(nextAccount));localStorage.setItem('hirely_role','recruiter');updateTeam(team.map(m=>m.email?.toLowerCase()===email?{...m,name:nextAccount.name,status:'Active'}:m));navg('/dashboard')};
 return <div className="auth recruiter-auth"><div className="auth-login-brand"><span className="auth-brand-mark">H</span><div><b>Hirely</b><small>Recruiter Portal</small></div></div><Card className="auth-card login-card recruiter-setup-card"><h1>Set up your recruiter account</h1><p>Complete your invitation and create your Recruiter Portal password.</p>{!invited||invitationExpired?<div className="form-error">This invitation is invalid or has expired. Ask your Company Admin to send a new invitation.</div>:<><Field label="Email address"><input value={email} disabled/></Field><div className="form-grid"><Field label="Full name"><input value={name} onChange={e=>setName(e.target.value)} /></Field><Field label="Job title"><input value={title} onChange={e=>setTitle(e.target.value)} /></Field></div><Field label="Phone"><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+20 ..."/></Field><div className="form-grid"><Field label="Password"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></Field><Field label="Confirm password"><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat password"/></Field></div>{error&&<div className="form-error">{error}</div>}<Button onClick={setup}>Set password and continue</Button></>}<button className="link forgot-back" type="button" onClick={()=>navg('/login')}>Back to login</button></Card></div>
}

function ForgotPassword({role,onBack}){
 const [email,setEmail]=useState('');const [sent,setSent]=useState(false);const [error,setError]=useState('');
 const send=e=>{e.preventDefault();if(!/^\S+@\S+\.\S+$/.test(email.trim()))return setError('Enter a valid email address.');setError('');setSent(true)};
 return <div className={'auth '+(role==='Recruiter'?'recruiter-auth':role==='Applicant'?'applicant-auth-theme':'admin-auth')}><div className="auth-login-brand"><span className="auth-brand-mark">H</span><div><b>Hirely</b><small>{role==='Recruiter'?'Recruiter Portal':role==='Applicant'?'Applicant Portal':'Company Admin Portal'}</small></div></div><Card className="auth-card forgot-page-card">
  {!sent?<><h1>Reset your password</h1><p>Enter your email address and we’ll send you a password reset link.</p><form onSubmit={send}><Field label="Email address"><input type="email" required value={email} onChange={e=>{setEmail(e.target.value);setError('')}} placeholder="Enter your email"/></Field>{error&&<div className="form-error">{error}</div>}<Button type="submit">Send reset link</Button></form><button className="link forgot-back" type="button" onClick={onBack}>Back to login</button></>:<><div className="forgot-success-icon"><CheckCircle2 size={34}/></div><h1>Check your email</h1><p>If an account exists for <b>{email}</b>, a password reset link has been sent.</p><Button onClick={onBack}>Back to login</Button></>}
 </Card></div>
}

function ForgotPasswordRoute(){
 const [params]=useSearchParams();
 const role=params.get('role')||'Company Admin';
 const navg=useNavigate();
 return <ForgotPassword role={role} onBack={()=>navg('/login')}/>;
}

function Landing(){
 const navg=useNavigate();
 // Every visual here reuses the app's OWN classes (.card, .btn, .score,
 // .dimension/.track, .activity, .table-wrap, .badge) rather than a
 // separate design — same purple, same shadows, same components the rest
 // of the product already uses. Only the .landing-* classes below are new,
 // and they're layout-only (grid/spacing), never color or type.
 return <div className="landing">
  <header className="landing-nav">
   <div className="wrap landing-nav-row">
    <div className="logo"><span className="logo-mark">H</span>Hirely</div>
    <nav className="landing-nav-links">
     <a href="#scoring">How scoring works</a>
     <a href="#companies">For hiring teams</a>
     <a href="#candidates">For candidates</a>
     <a href="#roles">The platform</a>
    </nav>
    <div className="landing-nav-cta">
     <button className="link" onClick={()=>navg('/login')}>Sign in</button>
     <Button onClick={()=>navg('/login')}>Get started</Button>
    </div>
   </div>
  </header>

  <section className="landing-hero">
   <div className="wrap landing-hero-grid">
    <div>
     <p className="landing-kicker">Recruitment software for the MENA market</p>
     <h1 className="landing-h1">Hiring decisions you can actually explain.</h1>
     <p className="landing-lede">Hirely scores every applicant on the same four dimensions, with the same formula, every time — so a Company Admin can defend a decision and a candidate can see exactly why they got it.</p>
     <div className="landing-cta-row">
      <Button onClick={()=>navg('/login')}>See how scoring works</Button>
      <button className="link" onClick={()=>navg('/applicant/auth')}>I'm looking for a job →</button>
     </div>
    </div>
    <div className="card" id="scoring">
     <div className="detail-score">
      <Score value={88} size="lg"/>
      <div><b>Sara Ahmed</b><div className="muted">Senior Frontend Developer</div></div>
     </div>
     <div className="dimension"><div><span>Skills match</span><span>92%</span></div><div className="track"><i style={{width:'92%'}}/></div></div>
     <div className="dimension"><div><span>Experience</span><span>100%</span></div><div className="track"><i style={{width:'100%'}}/></div></div>
     <div className="dimension"><div><span>Qualifications</span><span>85%</span></div><div className="track"><i style={{width:'85%'}}/></div></div>
     <div className="dimension"><div><span>Location match</span><span>80%</span></div><div className="track"><i style={{width:'80%'}}/></div></div>
     <p className="muted landing-scorecard-foot">Every candidate on every job gets this same breakdown — visible to the recruiter reviewing it and the applicant who submitted it.</p>
    </div>
   </div>
  </section>

  <div className="landing-strip">
   <div className="wrap stats">
    {[['4','scored dimensions per application'],['1','formula per job, set once by the hiring team'],['4','roles on one platform'],['0','hidden criteria in the score breakdown']].map(([n,l])=>
     <div className="stat" key={l}><small>{l}</small><strong>{n}</strong></div>)}
   </div>
  </div>

  <section className="landing-aud" id="companies">
   <div className="wrap landing-aud-grid">
    <div>
     <p className="landing-kicker">For hiring teams</p>
     <h2 className="landing-h2">Run the whole pipeline in one place.</h2>
     <p className="landing-body">Post a job, set what matters for it, and let Hirely rank who applies. Move candidates through the stages you define, schedule interviews, and leave feedback — without leaving the pipeline.</p>
     <ul className="landing-list">
      <li>Configurable scoring weights per job, not a fixed formula for every role</li>
      <li>Auto-advance and auto-reject rules with a full activity log</li>
      <li>Company-wide analytics for admins, scoped analytics for recruiters</li>
     </ul>
    </div>
    <div className="card">
     <div className="landing-pipeline-track">
      {['Applied','Screening','Shortlisted','Interview','Offer'].map((s,i)=>
       <div key={s} className={'landing-pl-stage'+(i<3?' on':'')}><span/><small>{s}</small></div>)}
     </div>
     <div className="candidate landing-pl-card">
      <div className="candidate-top"><b>Sara Ahmed</b><span className="badge green">92%</span></div>
      <small>Senior Frontend Developer</small>
     </div>
    </div>
   </div>
  </section>

  <section className="landing-aud reverse" id="candidates">
   <div className="wrap landing-aud-grid">
    <div className="card">
     <div className="activity"><span className="activity-dot"/><div><b>Application received</b><small>Senior Frontend Developer — submitted just now</small></div></div>
     <div className="activity"><span className="activity-dot"/><div><b>Score calculated — 92%</b><small>Full dimension breakdown available immediately</small></div></div>
     <div className="activity"><span className="activity-dot"/><div><b>Moved to Shortlisted</b><small>Your application is progressing — under review by the hiring team</small></div></div>
    </div>
    <div>
     <p className="landing-kicker">For candidates</p>
     <h2 className="landing-h2">Know exactly where you stand.</h2>
     <p className="landing-body">Build a profile once, apply to roles across the platform, and see your real fit score instead of guessing. If you're not moving forward, you'll know which skills would have changed the outcome.</p>
     <ul className="landing-list">
      <li>Match score shown before you apply, not after</li>
      <li>A status update for every stage change, with real feedback on rejection</li>
      <li>One profile, reused for every application — no re-entering your CV</li>
     </ul>
    </div>
   </div>
  </section>

  <section className="landing-roles" id="roles">
   <div className="wrap">
    <p className="landing-kicker">The platform</p>
    <h2 className="landing-h2">Four roles. One shared record of every hire.</h2>
    <div className="card table-wrap landing-roles-table">
     <table>
      <thead><tr><th>Role</th><th>What they do</th><th></th></tr></thead>
      <tbody>
       <tr><td><b>Super Admin</b></td><td>Manages every company on the platform — subscriptions, feature access, the shared skill library and scoring defaults.</td><td><span className="badge purple">platform-wide</span></td></tr>
       <tr><td><b>Company Admin</b></td><td>Owns the workspace — billing, the recruiter team, every job and every candidate across the company.</td><td><span className="badge blue">company-wide</span></td></tr>
       <tr><td><b>Recruiter</b></td><td>Runs their own jobs and pipeline — moves candidates, schedules interviews, sends feedback.</td><td><span className="badge amber">assigned jobs</span></td></tr>
       <tr><td><b>Applicant</b></td><td>Builds one profile, applies across companies, and tracks every application in one place.</td><td><span className="badge green">candidate-side</span></td></tr>
      </tbody>
     </table>
    </div>
   </div>
  </section>

  <section className="landing-closing">
   <div className="wrap">
    <h2 className="landing-h2">Start with one job posting.</h2>
    <p className="landing-lede">See the same score your first applicant will see.</p>
    <div className="landing-cta-row">
     <Button onClick={()=>navg('/login')}>Get started</Button>
     <button className="link" onClick={()=>navg('/applicant/auth')}>Browse as a candidate →</button>
    </div>
   </div>
  </section>

  <footer className="landing-footer">
   <div className="wrap landing-footer-row">
    <div className="logo" style={{fontSize:15}}><span className="logo-mark" style={{width:20,height:20,fontSize:11}}>H</span>Hirely</div>
    <div className="landing-nav-links">
     <a href="#companies">For hiring teams</a>
     <a href="#candidates">For candidates</a>
     <a href="#roles">The platform</a>
    </div>
    <small className="muted">© 2026 Hirely. A graduation project.</small>
   </div>
  </footer>
 </div>
}
function Login(){
 const navg=useNavigate();
 const [role,setRole]=useState('Company Admin');
 const [email,setEmail]=useState(()=>localStorage.getItem('hirely_account_email')||'omar.ashraf@hirely.io');
 const [password,setPassword]=useState('');
 const [error,setError]=useState('');
 const [deactivatedAttempt,setDeactivatedAttempt]=useState(false);
 if(role==='Applicant') return <ApplicantAuth/>;
 // DEP-05: a deactivated recruiter gets a dedicated screen on their next
 // login attempt instead of a generic "invalid credentials" error.
 if(deactivatedAttempt) return <RecruiterDeactivated/>;
 const submit=()=>{
   const account=JSON.parse(localStorage.getItem('hirely_account')||'null');
   if(role==='Super Admin'){
     // Platform operator account. In production this is a separate identity
     // provider realm, never a tenant user.
     const expected=JSON.parse(localStorage.getItem('hirely_super_admin')||'null')||{email:'nadia@hirely.com',password:'password'};
     if(email.trim().toLowerCase()!==expected.email.toLowerCase()||password!==expected.password){setError('Invalid super admin email or password.');return;}
     localStorage.setItem('hirely_role','super-admin');window.dispatchEvent(new Event('hirely-role-change'));
     logAudit('Super Admin logged in','Authentication');
     setError('');navg('/super-admin');return;
   }
   if(role==='Company Admin'){
     const normalizedEmail=email.trim().toLowerCase();
     const recruiterAccounts=JSON.parse(localStorage.getItem('hirely_recruiter_accounts')||'[]');
     const promoted=recruiterAccounts.find(x=>x.email?.toLowerCase()===normalizedEmail&&x.role==='Admin'&&x.status!=='Deactivated');
     const expectedEmail=account?.email||localStorage.getItem('hirely_account_email')||'heba.mohamed@hirely.io';
     const expectedPassword=account?.password||'password';
     const validPromoted=promoted&&password===promoted.password;
     const validAdmin=normalizedEmail===expectedEmail.toLowerCase()&&password===expectedPassword;
     if(!validAdmin&&!validPromoted){setError('Invalid company admin email or password.');return;}
     localStorage.setItem('hirely_role','company-admin');window.dispatchEvent(new Event('hirely-role-change'));localStorage.removeItem('hirely_recruiter_session');
     if(validPromoted){localStorage.setItem('hirely_profile',JSON.stringify({...promoted,title:promoted.title||'Company Admin'}));localStorage.setItem('hirely_account_email',promoted.email)}
     setError('');navg('/dashboard');return;
   }
   const recruiterAccounts=JSON.parse(localStorage.getItem('hirely_recruiter_accounts')||'[]');
   const demoRecruiter={id:'r1',name:'Omar Ashraf',email:'omar.ashraf@hirely.io',password:'password',role:'Recruiter',status:'Active',title:'Recruiter',company:'Hirely Tech Hub',phone:'+20 100 000 0000'};
   const normalizedEmail=email.trim().toLowerCase();
   const deactivated=recruiterAccounts.find(x=>x.email?.toLowerCase()===normalizedEmail&&x.status==='Deactivated'&&x.role!=='Admin');
   if(deactivated){setDeactivatedAttempt(true);return;}
   let recruiter=recruiterAccounts.find(x=>x.email?.toLowerCase()===normalizedEmail&&x.password===password&&x.status!=='Deactivated'&&x.role!=='Admin');
   if(!recruiter && normalizedEmail===demoRecruiter.email && password===demoRecruiter.password){
     recruiter=demoRecruiter;
     const existing=recruiterAccounts.findIndex(x=>x.email?.toLowerCase()===demoRecruiter.email);
     const nextAccounts=existing>=0?recruiterAccounts.map((x,i)=>i===existing?{...x,...demoRecruiter,status:'Active'}:x):[...recruiterAccounts,demoRecruiter];
     localStorage.setItem('hirely_recruiter_accounts',JSON.stringify(nextAccounts));
   }
   if(!recruiter){setError('Invalid Recruiter email or password.');return;}
   localStorage.setItem('hirely_role','recruiter');window.dispatchEvent(new Event('hirely-role-change'));localStorage.setItem('hirely_recruiter_session',JSON.stringify(recruiter));
   if(!localStorage.getItem('hirely_recruiter_profile')){const {password:_,...safeProfile}=recruiter;localStorage.setItem('hirely_recruiter_profile',JSON.stringify(safeProfile));}
   setError('');navg('/dashboard');
 };
 return <div className={'auth '+(role==='Recruiter'?'recruiter-auth':'admin-auth')}><div className="auth-login-brand"><span className="auth-brand-mark">H</span><div><b>Hirely</b><small>{role==='Recruiter'?'Recruiter Portal':'Company Admin Portal'}</small></div></div><Card className="auth-card login-card"><h1>Welcome back</h1><p>Please select your role and sign in</p>
   <div className="role-switch" role="tablist" aria-label="Account role">
     <button type="button" className={role==='Company Admin'?'role-btn active':'role-btn'} onClick={()=>{setRole('Company Admin');setEmail(localStorage.getItem('hirely_account_email')||'');setError('')}}><ShieldCheck size={16}/> Company Admin</button>
     <button type="button" className={role==='Recruiter'?'role-btn active':'role-btn'} onClick={()=>{setRole('Recruiter');setEmail('omar.ashraf@hirely.io');setError('')}}><UserRound size={16}/> Recruiter</button>
     <button type="button" className={role==='Super Admin'?'role-btn active':'role-btn'} onClick={()=>{setRole('Super Admin');setEmail('nadia@hirely.com');setError('')}}><Cpu size={16}/> Super Admin</button>
     <button type="button" className="role-btn" onClick={()=>setRole('Applicant')}><UserRound size={16}/> Applicant</button>
   </div>
   <Field label="Email address"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="e.g. name@company.com"/></Field>
   <Field label="Password"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" onKeyDown={e=>e.key==='Enter'&&submit()}/></Field>
   <div className="auth-row"><label><input type="checkbox"/> Remember me</label><button type="button" className="link" onClick={()=>navg(`/forgot-password?role=${encodeURIComponent(role)}`)}>Forgot?</button></div>
   {error&&<div className="form-error">{error}</div>}
   <Button onClick={submit}>Sign in as {role}</Button>
   {role==='Super Admin'&&<p className="muted">Demo operator: nadia@hirely.com / password</p>}
   {role==='Company Admin'&&<p>New company? <button type="button" className="link" onClick={()=>navg('/onboarding/company')}>Register here</button></p>}
   
 </Card></div>
}
function Onboarding(){
 const navg=useNavigate();
 const {setCompany,updateTeam,team}=useApp();
 const [step,setStep]=useState(1);
 const [company,setCompanyForm]=useState({name:'',industry:'Technology',size:'11-50',website:'',logo:null,adminEmail:'',adminPassword:''});
 const [plan,setPlan]=useState('Growth');
 const [checkout,setCheckout]=useState(false);
 const [payment,setPayment]=useState({name:'',number:'',expiry:'',cvv:'',country:'United Arab Emirates',street:'',city:'',zip:''});
 const [recruiters,setRecruiters]=useState([]);
 const [email,setEmail]=useState('');
 const [error,setError]=useState('');
 const update=(key,value)=>setCompanyForm(prev=>({...prev,[key]:value}));
 const uploadLogo=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>update('logo',reader.result);reader.readAsDataURL(file)};
 const continueCompany=()=>{
   if(!company.name.trim()) return setError('Company name is required.');
   if(!/^\S+@\S+\.\S+$/.test(company.adminEmail.trim())) return setError('Enter a valid admin email address.');
   if(company.adminPassword.length<8) return setError('Admin password must contain at least 8 characters.');
   localStorage.setItem('hirely_account',JSON.stringify({email:company.adminEmail.trim().toLowerCase(),password:company.adminPassword,role:'Company Admin'}));
   localStorage.setItem('hirely_account_email',company.adminEmail.trim().toLowerCase());
   setError('');setStep(2);
 };
 const choose=()=>{setCompany(prev=>({...prev,...company,name:company.name.trim(),plan}));setCheckout(true)};
 const pay=()=>{if(!payment.name.trim()||!payment.number.trim()||!payment.expiry.trim()||!payment.cvv.trim())return setError('Complete the payment details.');setError('');setCheckout(false);setStep(3)};
 const addRecruiter=()=>{
   if(!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
   if(recruiters.includes(email.trim().toLowerCase())) return setError('This email is already added.');
   setRecruiters([...recruiters,email.trim().toLowerCase()]);setEmail('');setError('');
 };
 const finish=()=>{
   setCompany(prev=>({...prev,...company,name:company.name.trim(),plan,setupComplete:true,status:'Active'}));
   if(recruiters.length){ const invited=recruiters.map((x,i)=>({id:Date.now()+i,name:x.split('@')[0].replace(/[._]/g,' '),email:x,role:'Recruiter',status:'Pending'})); updateTeam([...team,...invited]); localStorage.setItem('hirely_pending_recruiters',JSON.stringify(recruiters)); }
   setStep(4);
 };
 const goDashboard=()=>navg('/dashboard');
 const progress=step*25;
 if(checkout){return <div className="checkout-page">
   <div className="checkout-brand">Hirely</div><div className="checkout-title"><LockKeyhole size={18}/> Secure Checkout</div>
   <Card className="checkout-summary"><div><b>{plan} Plan</b><p>Monthly subscription for scaling teams</p></div><strong>{plan==='Growth'?'$129':'$49'}<small>/mo</small></strong><div className="checkout-features"><span>✓ Unlimited jobs</span><span>✓ Custom Workflows</span><span>✓ AI Score Rings</span><span>✓ API Access</span><span>✓ Priority Support</span><span>✓ Team Collaboration</span></div></Card>
   <Card className="checkout-card"><h3>Payment Details</h3><Field label="Cardholder Name"><input value={payment.name} onChange={e=>setPayment({...payment,name:e.target.value})} placeholder="John Doe"/></Field><Field label="Card Number"><input value={payment.number} onChange={e=>setPayment({...payment,number:e.target.value})} placeholder="0000 0000 0000 0000"/></Field><div className="form-grid setup-two"><Field label="Expiry Date"><input value={payment.expiry} onChange={e=>setPayment({...payment,expiry:e.target.value})} placeholder="MM / YY"/></Field><Field label="CVV"><input value={payment.cvv} onChange={e=>setPayment({...payment,cvv:e.target.value})} placeholder="123"/></Field></div><hr/><h4>Billing Address</h4><Field label="Country"><select value={payment.country} onChange={e=>setPayment({...payment,country:e.target.value})}><option>United Arab Emirates</option><option>Egypt</option><option>Saudi Arabia</option></select></Field><Field label="Street Address"><input value={payment.street} onChange={e=>setPayment({...payment,street:e.target.value})} placeholder="123 Business Bay"/></Field><div className="form-grid setup-two"><Field label="City"><input value={payment.city} onChange={e=>setPayment({...payment,city:e.target.value})} placeholder="Dubai"/></Field><Field label="Zip / Postal Code"><input value={payment.zip} onChange={e=>setPayment({...payment,zip:e.target.value})} placeholder="00000"/></Field></div>{error&&<div className="form-error">{error}</div>}<Button onClick={pay}>Pay and Activate Plan <ArrowRight size={17}/></Button><div className="secure-line">✓ SSL Secure &nbsp;&nbsp; ✓ PCI Compliant &nbsp;&nbsp; ✓ 256-bit Encryption</div></Card>
   <p className="checkout-legal">By confirming your subscription, you allow Hirely to charge your card for this and future payments in accordance with their terms.</p><div className="checkout-links">Privacy Policy &nbsp;&nbsp; Terms of Service</div>
 </div>}
 return <div className="onboard">
   <header className="onboard-top">
     <div className="onboard-brand">Hirely</div>
     <span className="step-label">Step {step} of 4</span>
     <div className="onboard-progress"><i style={{width:`${progress}%`}}/></div>
     <div className="onboard-nav"><button onClick={()=>step>1?setStep(step-1):navg('/login')}>Back</button><button onClick={goDashboard}>Skip for now</button></div>
   </header>
   <main className="onboard-main">
     {step===1&&<>
       <h1>Tell us about your company</h1>
       <p className="onboard-subtitle">Setting up your corporate recruitment portal takes less than a minute.</p>
       <Card className="setup-card">
         <label className="logo-picker">
           <span className="logo-circle">{company.logo?<img src={company.logo} alt="Company logo"/>:<Camera size={28}/>}</span>
           <b>{company.logo?'Change logo':'+ Add Logo'}</b>
           <input type="file" accept="image/*" onChange={uploadLogo}/>
         </label>
         <Field label="Company name"><input value={company.name} onChange={e=>update('name',e.target.value)} placeholder="e.g. Acme Corporation"/></Field>
         <div className="form-grid setup-two">
           <Field label="Industry"><select value={company.industry} onChange={e=>update('industry',e.target.value)}><option>Select industry</option><option>Technology</option><option>Finance</option><option>Healthcare</option><option>Retail</option><option>Education</option></select></Field>
           <Field label="Company size"><select value={company.size} onChange={e=>update('size',e.target.value)}><option>Select size</option><option>1-10</option><option>11-50</option><option>51-200</option><option>201-500</option><option>500+</option></select></Field>
         </div>
         <Field label="Website"><input value={company.website} onChange={e=>update('website',e.target.value)} placeholder="https://www.company.com"/></Field>
         <div className="setup-account"><div className="setup-account-title"><LockKeyhole size={16}/><div><b>Admin account</b><small>Use these credentials to sign in as Company Admin.</small></div></div><Field label="Admin email"><input type="email" value={company.adminEmail} onChange={e=>update('adminEmail',e.target.value)} placeholder="name@company.com"/></Field><Field label="Admin password"><input type="password" value={company.adminPassword} onChange={e=>update('adminPassword',e.target.value)} placeholder="At least 8 characters"/></Field></div>
         {error&&<div className="form-error">{error}</div>}
         <Button onClick={continueCompany}>Continue <ArrowRight size={17}/></Button>
         
       </Card>
       <div className="setup-features"><span><ShieldCheck size={15}/> Secure Access</span><span><Sparkles size={15}/> Fast Setup</span><span><Clock3 size={15}/> 24/7 Support</span></div>
     </>}
     {step===2&&<>
       <h1>Select a plan for your team</h1>
       <p className="onboard-subtitle">Choose the perfect scale for your recruitment needs. You can upgrade at any time.</p>
       <div className="design-plans">
         {[
           ['Starter','$49',['Up to 5 active jobs','Basic AI screening','Email support','Candidate messaging']],
           ['Growth','$129',['Unlimited active jobs','Advanced AI Score Rings','Priority 24/7 support','Talent pipeline automation','Custom interview kits']],
           ['Enterprise','Custom',['Everything in Growth','Dedicated account manager','SSO & Advanced Security','Custom API integrations']]
         ].map(([name,price,features])=><Card key={name} className={`design-plan ${plan===name?'selected':''}`}>
           {name==='Growth'&&<span className="popular">POPULAR</span>}
           <small className="plan-name">{name.toUpperCase()}</small><h2>{price}<span>{price!=='Custom'&&'/month'}</span></h2>
           {features.map(f=><p key={f}><CheckCircle2 size={16}/>{f}</p>)}
           <Button variant={plan===name?'primary':'secondary'} onClick={()=>{setPlan(name);if(name==='Enterprise'){setError('Enterprise plans require a sales contact.');return}setError('');setCompany(prev=>({...prev,...company,name:company.name.trim(),plan:name}));setCheckout(true)}}>{name==='Enterprise'?'Contact Sales':'Choose Plan'}</Button>
         </Card>)}
       </div>
       {error&&<div className="form-error plan-error">{error}</div>}
       <Card className="trust-banner"><ShieldCheck size={34}/><div><b>Trust & Security</b><p>All plans include GDPR compliance, data encryption at rest, and 99.9% uptime SLA to ensure your recruitment data remains secure and accessible.</p></div><strong>500+<small>COMPANIES HIRED</small></strong></Card>
     </>}
     {step===3&&<>
       <h1>Invite your recruitment team</h1>
       <p className="onboard-subtitle">Add the colleagues who will help you manage candidates and streamline your hiring process.</p>
       <Card className="invite-card">
         <div className="invite-banner"><div><UserPlus size={22}/><b>Collaborative Workspace</b></div></div>
         <Field label="Team member email"><div className="invite-input"><Mail size={18}/><input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addRecruiter()} placeholder="colleague@company.com"/><span>Recruiter</span><Button onClick={addRecruiter}>Add <Plus size={15}/></Button></div></Field>
         {error&&<div className="form-error">{error}</div>}
         <div className="added-head"><b>Added Invites</b><span>{recruiters.length} members ready</span></div>
         <div className="invite-tags">{recruiters.map((x,i)=><span className="invite-tag" key={x}><span>{x.slice(0,2).toUpperCase()}</span>{x}<button onClick={()=>setRecruiters(recruiters.filter((_,n)=>n!==i))}>×</button></span>)}</div>
         <Button className="send-invites" onClick={finish}>Send Invitations</Button>
         <button className="text-btn center" onClick={finish}>Skip for now</button>
       </Card>
       <div className="setup-features"><span><ShieldCheck size={15}/> Secure Access</span><span><LockKeyhole size={15}/> Role-based Controls</span></div>
     </>}
     {step===4&&<div className="complete-layout">
       <Card className="complete-message"><CheckCircle2 size={54}/><h1>Company setup complete!</h1><p>Your recruitment portal is ready for action. Let's find your next great hire.</p></Card>
       <div className="complete-side"><div className="complete-image"><div className="fake-monitor"><div/><div/><div/><div/></div><span><ShieldCheck size={18}/> PROFILE 100% VERIFIED</span></div><div className="complete-actions"><Button onClick={()=>navg('/jobs/new')}>Post your first job <ArrowRight size={17}/></Button><Button variant="secondary" onClick={goDashboard}>Go to Dashboard</Button></div></div>
       <div className="complete-ai"><Sparkles size={19}/> AI matching engine is now primed and ready to screen incoming applications.</div>
     </div>}
   </main>
   {step===3&&<button className="hidden" onClick={()=>{}}/>}
 </div>
}


// Applicant job board and applications now come from the shared store
// (hirely_jobs / hirely_candidates) via services/hirelyBridge.js.
function getApplicantProfile(){return JSON.parse(localStorage.getItem('hirely_applicant_profile')||'null')||{name:'Sara Ahmed',email:'sara.ahmed@example.com',phone:'+971 50 123 4567',location:'Dubai, UAE',headline:'Senior Full-stack Developer',bio:'Passionate about building human-centric digital experiences in the MENA region.',photo:null,skills:{expert:['Node.js','React','AWS Architecture'],intermediate:['Python','UI Design','PostgreSQL'],beginner:['Docker','GoLang']},experience:[{title:'Senior Product Engineer',company:'TechFlow Solutions',period:'Jan 2021 — Present',description:'Leading the development of cross-platform applications using React Native and Node.js.'},{title:'Software Developer',company:'NextScale Interactive',period:'Mar 2018 — Dec 2020',description:'Worked on high-traffic e-commerce platforms, focusing on front-end performance and SEO optimization.'}],education:[{degree:'Bachelor of Computer Science',school:'American University of Sharjah',period:'Graduated 2017'}],cv:'Sara_Ahmed_CV.pdf'}}
function ApplicantLogo(){return <div className="applicant-logo">hirely</div>}
function ApplicantShell({children}){
 const loc=useLocation(),navg=useNavigate(); const [notif,setNotif]=useState(false); const [profile,setProfile]=useState(getApplicantProfile); const [notifVersion,setNotifVersion]=useState(0); const apps=myApplications(); const unread=Number(localStorage.getItem('hirely_applicant_unread')||0); const liveNotifications=JSON.parse(localStorage.getItem('hirely_applicant_notifications')||'null')||[]; useEffect(()=>{const sync=()=>setNotifVersion(v=>v+1);window.addEventListener('applicant-notifications-change',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('applicant-notifications-change',sync);window.removeEventListener('storage',sync)}},[]);
 useEffect(()=>{const sync=()=>setProfile(getApplicantProfile());window.addEventListener('applicant-profile-change',sync);return()=>window.removeEventListener('applicant-profile-change',sync)},[]);
 const notifications=JSON.parse(localStorage.getItem('hirely_applicant_notifications')||'null')||[{id:'app-1',title:'Application status update for Senior Backend Developer',time:'2h ago',kind:'Applications'},{id:'int-1',title:'Interview scheduled with TechCorp',time:'5h ago',kind:'Interviews'},{id:'score-1',title:'Score calculated for DigitalCo position',time:'Yesterday',kind:'Applications'},{id:'rej-1',title:'Application not selected for Creative Agency',time:'2 days ago',kind:'Applications'},{id:'match-1',title:'New job match at StartupX matches your profile',time:'3 days ago',kind:'System'}];
 const signOut=()=>{localStorage.removeItem('hirely_role');navg('/login')};
 return <div className="applicant-shell"><header className="applicant-topbar"><ApplicantLogo/><nav>{[['/applicant/browse','Browse Jobs'],['/applicant/applications','My Applications'],['/applicant/profile','My Profile']].map(([path,label])=><button key={path} className={loc.pathname.startsWith(path)?'active':''} onClick={()=>navg(path)}>{label}</button>)}</nav><div className="applicant-actions"><div className="applicant-notif-wrap"><button className="applicant-icon-btn" onClick={()=>setNotif(v=>!v)} aria-label="Notifications"><Bell size={21}/>{unread>0&&<span className="applicant-notif-dot"/>}</button>{notif&&<div className="applicant-notif-pop"><div className="applicant-notif-head"><b>Notifications</b><button onClick={()=>{const list=JSON.parse(localStorage.getItem('hirely_applicant_notifications')||'[]').map(n=>({...n,read:true}));localStorage.setItem('hirely_applicant_notifications',JSON.stringify(list));localStorage.setItem('hirely_applicant_unread','0');window.dispatchEvent(new Event('applicant-notifications-change'));setNotif(false)}}>Mark all as read</button></div>{liveNotifications.map(n=><button key={n.id} className="applicant-notif-item" onClick={()=>{setNotif(false);navg('/applicant/notifications')}}><span className="applicant-notif-symbol">{n.kind==='Interviews'?<CalendarDays size={15}/>:n.kind==='System'?<Sparkles size={15}/>:<BriefcaseBusiness size={15}/>}</span><span><b>{n.title}</b><small>{n.time}</small></span></button>)}</div>}</div><button className="applicant-avatar-btn" onClick={()=>navg('/applicant/profile')}><span className="applicant-avatar">{profile.photo?<img src={profile.photo} alt="Profile"/>:profile.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</span></button></div></header>{children}</div>
}
function ApplicantAuth(){
 const navg=useNavigate(); const [tab,setTab]=useState('create'); const [form,setForm]=useState({name:'Khalid Mansour',email:'khalid@company.com',password:'',confirm:''}); const [error,setError]=useState('');
 const submit=()=>{if(tab==='create'){if(!form.name.trim()||!/^\S+@\S+\.\S+$/.test(form.email)||form.password.length<8||form.password!==form.confirm)return setError('Complete the required fields and make sure passwords match.');localStorage.setItem('hirely_applicant_account',JSON.stringify({name:form.name,email:form.email,password:form.password}));localStorage.setItem('hirely_applicant_profile',JSON.stringify({...getApplicantProfile(),name:form.name,email:form.email}));}else{const a=JSON.parse(localStorage.getItem('hirely_applicant_account')||'null');if(!a||form.email.toLowerCase()!==a.email.toLowerCase()||form.password!==a.password)return setError('Invalid applicant email or password.');}localStorage.setItem('hirely_role','applicant');setError('');navg(tab==='create'?'/applicant/profile/setup':'/applicant/browse')};
 // Same shell as the Company Admin / Recruiter / Super Admin login card
 // (auth-login-brand + auth-card.login-card + role-switch tabs), recolored
 // to the applicant's green brand via the applicant-auth-theme class.
 return <div className="auth applicant-auth-theme"><div className="auth-login-brand"><span className="auth-brand-mark">H</span><div><b>Hirely</b><small>Applicant Portal</small></div></div><Card className="auth-card login-card">
   <h1>{tab==='create'?'Create your account':'Welcome back'}</h1>
   <p>{tab==='create'?'Build your profile and start applying in minutes.':'Sign in to track your applications.'}</p>
   <div className="role-switch" role="tablist" aria-label="Account mode">
     <button type="button" className={tab==='create'?'role-btn active':'role-btn'} onClick={()=>{setTab('create');setError('')}}>Create account</button>
     <button type="button" className={tab==='signin'?'role-btn active':'role-btn'} onClick={()=>{setTab('signin');setError('')}}>Sign in</button>
   </div>
   {tab==='create'?<>
     <Field label="Full Name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
     <Field label="Work Email"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
     <div className="form-grid"><Field label="Password"><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></Field><Field label="Confirm password"><input type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})}/></Field></div>
     {error&&<div className="form-error">{error}</div>}
     <Button onClick={submit}>Create Your Account</Button>
   </>:<>
     <Field label="Email address"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
     <Field label="Password"><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} onKeyDown={e=>e.key==='Enter'&&submit()}/></Field>
     <div className="auth-row"><span/><button type="button" className="link" onClick={()=>navg('/forgot-password?role=Applicant')}>Forgot?</button></div>
     {error&&<div className="form-error">{error}</div>}
     <Button onClick={submit}>Sign in</Button>
   </>}
   <p>Not applying as a candidate? <button type="button" className="link" onClick={()=>navg('/login')}>Back to role selection</button></p>
 </Card></div>
}
function applicantSalaryLabel(salary){return String(salary??'').replace(/\s*(?:\/\s*month)+\s*$/i,'').trim()||'Salary not specified'}
function ApplicantBrowse(){
 const navg=useNavigate();
 // DEP-01: a suspended tenant's jobs are not discoverable at all.
 const boardUnavailable=isLocalTenantSuspended();
 // Live board: only jobs published by Company Admin / Recruiter.
 const [board,setBoard]=useState(()=>listPublicJobs());
 useEffect(()=>{const sync=()=>setBoard(listPublicJobs());window.addEventListener('hirely-jobs-change',sync);window.addEventListener('applicant-profile-change',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('hirely-jobs-change',sync);window.removeEventListener('applicant-profile-change',sync);window.removeEventListener('storage',sync)}},[]);
 const applicantJobs=board;
 const [q,setQ]=useState('');
 const [loc,setLoc]=useState('');
 const [searchQ,setSearchQ]=useState('');
 const [searchLoc,setSearchLoc]=useState('');
 const [type,setType]=useState('All');
 const [exp,setExp]=useState([]);
 const [salary,setSalary]=useState('');
 const [postedWithin,setPostedWithin]=useState('Any time');
 const [sort,setSort]=useState('Most Relevant');
 const [saved,setSaved]=useState(()=>JSON.parse(localStorage.getItem('hirely_applicant_saved_jobs')||'[]'));
 const [showSaved,setShowSaved]=useState(false);
 const getExperience=j=>/senior|lead|principal/i.test(j.title)?'Senior Level':/junior|entry|intern/i.test(j.title)?'Entry Level':'Mid-Level';
 const getSalaryRange=j=>{const nums=(j.salary.match(/\$?([\d,.]+)\s*k?/gi)||[]).map(x=>parseFloat(x.replace(/[^\d.]/g,''))).map(n=>n<100?n*1000:n);return {min:nums[0]||0,max:nums[1]||nums[0]||0}};
 const filtered=applicantJobs.filter(j=>{
   const text=`${j.title} ${j.company} ${j.location} ${j.tags.join(' ')}`.toLowerCase();
   const textMatch=!searchQ||text.includes(searchQ.toLowerCase());
   const locationMatch=!searchLoc||j.location.toLowerCase().includes(searchLoc.toLowerCase());
   const typeMatch=type==='All'||j.type===type;
   const expMatch=!exp.length||exp.includes(getExperience(j));
   const salaryRange=getSalaryRange(j);
   const salaryMatch=!salary||salary==='Any'||(salary==='$3k - $5k'?salaryRange.max>=3000&&salaryRange.min<=5000:salary==='$5k - $8k'?salaryRange.max>=5000&&salaryRange.min<=8000:salary==='$8k+'?salaryRange.max>=8000:true);
   const postText=String(j.posted||'').toLowerCase();
   const dateMatch=postedWithin==='Any time'||(postedWithin==='Past 24 hours'?/h ago|hour|today|just now/.test(postText):postedWithin==='Past week'?/h ago|hour|day|today|yesterday/.test(postText):true);
   const savedMatch=!showSaved||saved.includes(j.id);
   return textMatch&&locationMatch&&typeMatch&&expMatch&&salaryMatch&&dateMatch&&savedMatch;
 });
 const sorted=[...filtered].sort((a,b)=>sort==='Newest'?Number.parseInt(a.posted)-Number.parseInt(b.posted):sort==='Highest Match'?b.match-a.match: b.match-a.match);
 const toggleSave=id=>{const next=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];setSaved(next);localStorage.setItem('hirely_applicant_saved_jobs',JSON.stringify(next))};
 const toggleExp=value=>setExp(prev=>prev.includes(value)?prev.filter(x=>x!==value):[...prev,value]);
 const runSearch=()=>{setSearchQ(q.trim());setSearchLoc(loc.trim())};
 useEffect(()=>{if(!q.trim()&&!loc.trim()){setSearchQ('');setSearchLoc('')}},[q,loc]);
 return <main className="applicant-page"><section className="applicant-search-hero"><h1>Find your next opportunity</h1><div className="applicant-search-box"><div><BriefcaseBusiness size={20}/><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')runSearch()}} placeholder="Job title or skill"/></div><div><span className="applicant-location-icon">⌖</span><input value={loc} onChange={e=>setLoc(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')runSearch()}} placeholder="Location"/></div><button onClick={runSearch}>Search</button></div><div className="applicant-type-pills">{['All','Full-time','Remote','Contract','Internship'].map(x=><button key={x} className={type===x?'active':''} onClick={()=>setType(x)}>{x}</button>)}</div></section><section className="applicant-jobs-section"><div className="applicant-results-head"><h2>{filtered.length} {filtered.length===1?'job':'jobs'} {showSaved?'saved':'match your profile'}</h2><div className="applicant-results-actions"><button className={showSaved?'active':''} onClick={()=>setShowSaved(v=>!v)}>Saved jobs{saved.length?` (${saved.length})`:''}</button><label>Sort by: <select value={sort} onChange={e=>setSort(e.target.value)}><option>Most Relevant</option><option>Newest</option><option>Highest Match</option></select></label></div></div><div className="applicant-jobs-layout"><aside><div className="applicant-filter-card"><h3>Filters</h3><b>Experience Level</b>{['Entry Level','Mid-Level','Senior Level'].map(x=><label key={x}><input type="checkbox" checked={exp.includes(x)} onChange={()=>toggleExp(x)}/>{x}</label>)}<hr/><b>Date Posted</b><select value={postedWithin} onChange={e=>setPostedWithin(e.target.value)}><option>Any time</option><option>Past 24 hours</option><option>Past week</option></select><hr/><b>Salary Range (Monthly)</b>{['$3k - $5k','$5k - $8k','$8k+'].map(x=><label key={x}><input type="radio" name="salary" checked={salary===x} onChange={()=>setSalary(x)}/>{x}</label>)}{salary&&<button className="applicant-clear-filter" onClick={()=>setSalary('')}>Clear salary</button>}</div><div className="applicant-ai-card"><Sparkles size={25}/><h3>AI Resume Match</h3><p>Keep your profile updated for better job recommendations.</p><button onClick={()=>navg('/applicant/profile')}>Update Profile</button></div></aside>
<div className="applicant-job-list">{sorted.length?sorted.map(j=><article className="applicant-job-card" key={j.id}><div className="applicant-job-top"><span className={'applicant-status-badge '+(j.status==='Paused'?'paused':j.status==='Closed'?'closed':'')}>{j.status||'Open'}</span><div className="applicant-job-title"><h3 onClick={()=>navg(`/applicant/jobs/${j.id}`)}>{j.title}</h3><p>{j.company} <span>•</span> {j.location} <span>•</span> {j.posted}</p></div><button className="applicant-bookmark" onClick={()=>toggleSave(j.id)} aria-label="Save job">{saved.includes(j.id)?<Bookmark size={21} fill="currentColor"/>:<Bookmark size={21}/>}</button></div><div className="applicant-tags">{j.tags.map(t=><span key={t}>{t}</span>)}</div><div className="applicant-job-bottom"><div><strong>{applicantSalaryLabel(j.salary)}</strong> <small>/month</small><span className={`applicant-match ${j.match<50?'low':j.match<70?'mid':''}`}>● &nbsp;{j.match}% match</span></div><button onClick={()=>navg(`/applicant/jobs/${j.id}`)}>Apply now</button></div></article>):<div className="applicant-empty-state"><h3>{boardUnavailable?'No jobs available':'No jobs found'}</h3><p>{boardUnavailable?'There are no published jobs on the platform right now.':'Try changing your search or filters.'}</p><button onClick={()=>{setQ('');setLoc('');setSearchQ('');setSearchLoc('');setType('All');setExp([]);setSalary('');setPostedWithin('Any time');setSort('Most Relevant');setShowSaved(false)}}>Clear all filters</button></div>}</div></div></section></main>
}
function ApplicantJobDetail({jobId}){
 const navg=useNavigate();
 const job=getPublicJob(jobId);
 const [tab,setTab]=useState('Requirements');
 const [saved,setSaved]=useState(()=>JSON.parse(localStorage.getItem('hirely_applicant_saved_jobs')||'[]').includes(job?.id));
 const applied=job?hasApplied(job.id):false;
 if(!job)return <main className="applicant-page"><div className="applicant-empty-state"><h3>Job not available</h3><p>This posting was removed or is no longer published.</p><button onClick={()=>navg('/applicant/browse')}>Back to jobs</button></div></main>;
 const breakdown=job.scoreBreakdown?.dimensions||{};
 const dimensions=[['Skills',breakdown.skills??0,'Your profile skills compared with the required skills for this role.'],['Experience',breakdown.experience??0,'How closely your relevant experience matches the role requirements.'],['Location Match',breakdown.location??0,'How well your current location matches the job location.'],['Education',breakdown.education??0,'How closely your education and certifications match the configured criteria.']];
 const toggleSave=()=>{const current=JSON.parse(localStorage.getItem('hirely_applicant_saved_jobs')||'[]');const next=current.includes(job.id)?current.filter(x=>x!==job.id):[...current,job.id];localStorage.setItem('hirely_applicant_saved_jobs',JSON.stringify(next));setSaved(next.includes(job.id));};
 return <main className="applicant-page applicant-detail-page"><div className="applicant-detail-grid"><div>
   <div className="applicant-job-header-card"><div className="applicant-detail-logo" aria-hidden="true"/><div><h1>{job.title}</h1><p>{job.company} • {job.location}</p><div className="applicant-detail-chips"><span>{applicantSalaryLabel(job.salary)} /month</span><span>Hybrid</span><span>50-200 employees</span></div></div><span className="applicant-fulltime">{job.type}</span><small>Posted {job.posted}</small></div>
   <div className="applicant-tab-card"><nav>{['Description','Requirements','About company'].map(t=><button className={tab===t?'active':''} key={t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
     {tab==='Description'&&<div className="applicant-tab-content"><h3>Description</h3><p>{job.description}</p></div>}
     {tab==='Requirements'&&<div className="applicant-tab-content"><div className="applicant-skills-match"><h3>Skills Match</h3><span>{(()=>{const profile=getApplicantProfile();const mine=Object.values(profile.skills||{}).flat().map(x=>String(x).toLowerCase().trim());const req=job.requirements||[];return `You match ${req.filter(r=>mine.includes(String(r).toLowerCase().trim())).length} of ${req.length} required skills`})()}</span></div><div className="applicant-required-grid">{job.requirements.map((r,i)=>{const mine=Object.values(getApplicantProfile().skills||{}).flat().map(x=>String(x).toLowerCase().trim());const matched=mine.includes(String(r).toLowerCase().trim());return <div key={r} className={matched?'matched':''}>{r}<span>{matched?'Matched':'Required'}</span></div>})}</div><h3>Core Requirements</h3>{job.requirements.slice(0,3).map(r=><p className="applicant-requirement-line" key={r}>Minimum requirement involving {r} and relevant professional experience.</p>)}</div>}
     {tab==='About company'&&<div className="applicant-tab-content"><h3>About {job.company}</h3><p>{job.about}</p></div>}
   </div></div>
   <aside className="applicant-score-side"><div className="applicant-score-head"><h3>Match Score</h3><button className={`applicant-save-job ${saved?'saved':''}`} onClick={toggleSave}>{saved?'Saved':'Save job'}</button></div><div className="applicant-score-ring">{job.match}<small>%</small></div><p className="applicant-score-intro">Your current match score for this job.</p>{dimensions.map(([n,v,explanation])=><div className="applicant-score-dim" key={n}><div><span>{n}</span><b>{v}%</b></div><i><em style={{width:`${v}%`}}/></i><small>{explanation}</small></div>)}<button className="applicant-apply-main" disabled={applied||!job.acceptingApplications} onClick={()=>navg(`/applicant/apply/${job.id}`)}>{applied?'Applied':job.acceptingApplications?'Apply now':'Not accepting applications'}</button><p>{job.deadline?`Apply before ${job.deadline}`:'No application deadline set'}</p></aside>
   <div className="applicant-status-card">{applied?<><span className="applicant-status-pill">Applied</span><span className="applicant-stage-pill">{myApplications().find(a=>String(a.jobId)===String(job.id))?.stage||'Applied'}</span><p>Your application was submitted. We'll notify you of any updates.</p><button onClick={()=>navg('/applicant/applications')}>View status</button></>:<><span className="applicant-status-pill">Not applied</span><p>See your personalised match score before applying.</p></>}</div>
 </div></main>
}
function ApplicantApply({jobId}){
 const navg=useNavigate();
 const job=getPublicJob(jobId);
 const [step,setStep]=useState(1);
 const [answers,setAnswers]=useState(['','']);
 const profile=getApplicantProfile();
 const [cv,setCv]=useState('');
 const [applyError,setApplyError]=useState('');
 const [submitted,setSubmitted]=useState(false);
 const saveCv=(file)=>{
   if(!file)return;
   setCv(file.name);
   const next={...getApplicantProfile(),cv:file.name};
   localStorage.setItem('hirely_applicant_profile',JSON.stringify(next));
   window.dispatchEvent(new Event('applicant-profile-change'));
 };
 // One call creates the applicant's application AND the recruiter's candidate
 // record — both sides of the platform stay in sync from here.
 const submit=()=>{
   const result=submitApplication({jobId:job.id,answers,cv:cv||profile.cv});
   if(result.error){setApplyError(result.error);return}
   setApplyError('');
   setSubmitted(true);
 };
 if(!job)return <main className="applicant-page"><div className="applicant-empty-state"><h3>Job not available</h3><p>This posting is no longer published.</p><button onClick={()=>navg('/applicant/browse')}>Back to jobs</button></div></main>;
 return <div className="applicant-modal-bg"><div className="applicant-apply-modal">
   <button className="applicant-close" onClick={()=>navg(`/applicant/jobs/${job.id}`)}>×</button>
   <h1>Finish Application</h1><p>Step {step} of 3</p>
   <div className="applicant-stepper">{['Review profile','Questions','Submit'].map((x,i)=><div key={x} className={step===i+1?'active':step>i+1?'done':''}><span>{i+1}</span><b>{x}</b></div>)}</div>
   {submitted?<div className="applicant-apply-success"><div className="applicant-success-mark">✓</div><h2>Application submitted</h2><p>Your application for <b>{job.title}</b> was submitted successfully.</p><p>You can track its status and score breakdown from My Applications.</p><button className="applicant-submit" onClick={()=>navg('/applicant/applications')}>View my applications</button></div>:
   <>
   {step===1&&<div className="applicant-apply-body"><div className="applicant-apply-job"><div className="applicant-job-placeholder" aria-hidden="true"/><span><h3>{job.title}</h3><p>{job.company} • {job.location}</p></span><div className="applicant-mini-score">{job.match}%<small>Match Score</small></div></div><h3>Application Checklist</h3>
     <div className={`applicant-check-item ${cv?'complete':''}`}><span className="applicant-check-mark">{cv?'✓':'1'}</span><span><b>Curriculum Vitae</b><small>{cv||'CV is required before continuing'}</small></span></div>
     <div className="applicant-check-item complete"><span className="applicant-check-mark">2</span><span><b>Public Profile</b><small>Standard profile visibility active</small></span></div>
     <label className="applicant-upload-cv"><span>{cv?'Replace CV':'Upload CV'}</span><input type="file" accept=".pdf,.doc,.docx" onChange={e=>saveCv(e.target.files?.[0])}/></label>
     <div className="applicant-privacy"><div><b>Your privacy is our priority</b><p>Only the hiring company receives the application information shown above.</p></div></div>
   </div>}
   {step===2&&<div className="applicant-apply-body"><h3>Screening questions</h3><Field label="How many years of relevant experience do you have?"><input value={answers[0]} onChange={e=>setAnswers([e.target.value, answers[1]])}/></Field><Field label="Why are you a strong fit for this role?"><textarea value={answers[1]} onChange={e=>setAnswers([answers[0],e.target.value])}/></Field><p className="muted">All screening questions must be answered before submission.</p></div>}
   {step===3&&<div className="applicant-apply-body"><div className="applicant-apply-job"><div className="applicant-job-placeholder" aria-hidden="true"/><span><h3>{job.title}</h3><p>{job.company} • {job.location}</p></span><div className="applicant-mini-score">{job.match}%<small>Match Score</small></div></div><h3>Everything is ready</h3><div className="applicant-check-item complete"><span className="applicant-check-mark">✓</span><span><b>Curriculum Vitae</b><small>{cv}</small></span></div><div className="applicant-check-item complete"><span className="applicant-check-mark">✓</span><span><b>Questionnaire</b><small>2 questions answered</small></span></div><div className="applicant-check-item complete"><span className="applicant-check-mark">✓</span><span><b>Public Profile</b><small>Standard profile visibility active</small></span></div></div>}
   {applyError&&<div className="applicant-apply-error">{applyError}</div>}
   <div className="applicant-apply-footer">{step>1&&<button onClick={()=>{setApplyError('');setStep(step-1)}}>Back</button>}{step<3?<button className="applicant-continue" onClick={()=>{if(step===1&&!cv.trim()){setApplyError('Please upload your CV before continuing.');return}if(step===2&&answers.some(a=>!a.trim())){setApplyError('Please answer all screening questions before continuing.');return}setApplyError('');setStep(step+1)}}>Continue</button>:<><button className="applicant-submit" onClick={submit}>Submit application</button><button className="applicant-save-draft" onClick={()=>navg(`/applicant/jobs/${job.id}`)}>Save as draft</button></>}</div>
   </>}
 </div></div>
}
function ApplicantApplications(){
 const navg=useNavigate(); const [filter,setFilter]=useState('All'); const [apps,setApps]=useState(()=>myApplications()); useEffect(()=>{const sync=()=>setApps(myApplications());window.addEventListener('applicant-applications-change',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('applicant-applications-change',sync);window.removeEventListener('storage',sync)}},[]); const filtered=apps.filter(a=>filter==='All'||(filter==='Active'?['Applied','Screening'].includes(a.stage):filter==='Interviews'?a.stage==='Interview':filter==='Rejected'?a.stage==='Rejected':filter==='Hired'?a.stage==='Hired'||a.stage==='Offer':filter==='Withdrawn'?a.stage==='Withdrawn':true));
 return <main className="applicant-page applicant-applications-page"><h1>My Applications</h1><p className="applicant-app-count">{apps.length} total applications</p><div className="applicant-app-tabs">{['All','Active','Interviews','Rejected','Hired','Withdrawn'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div><div className="applicant-application-list">{filtered.map(a=><article key={a.id} className={`applicant-application-card ${a.stage==='Rejected'?'rejected':''}`} onClick={()=>navg(`/applicant/applications/${a.id}`)}><div className="applicant-app-main"><small>{a.company.toUpperCase()}</small><h2>{a.title}</h2>{a.stage==='Interview'&&a.interview&&<div className="applicant-interview-box"><CalendarDays/><div><b>{a.interview.format||'Interview'}</b><p>{a.interview.date} • {a.interview.time}{a.interview.duration?` • ${a.interview.duration}`:''}</p><a onClick={e=>e.stopPropagation()}>{a.interviewResponse?`Response: ${a.interviewResponse}`:'Respond to invitation ↗'}</a></div></div>}{a.stage==='Rejected'&&<p className="applicant-rejection-text">{a.rejection}</p>}{a.offer&&<div className="applicant-offer-actions"><button onClick={e=>{e.stopPropagation();navg(`/applicant/applications/${a.id}`)}}>View Offer</button><button onClick={e=>e.stopPropagation()}>Message Hiring Manager</button></div>}{a.stage!=='Interview'&&a.stage!=='Rejected'&&!a.offer&&<div className="applicant-mini-progress"><span/><span/><span/><span/><b>{a.stage} stage</b></div>}</div><div className="applicant-app-right"><span className={`applicant-applied-pill ${a.stage==='Rejected'?'red':''}`}>{a.offer?'Offer Received':a.stage==='Rejected'?'Rejected':`Applied ${a.applied}`}</span><div className="applicant-score-small">{a.score}</div><small>Match Score</small></div></article>)}</div></main>
}
function ApplicantApplicationDetail({appId}){
 const navg=useNavigate(); const [withdrawReason,setWithdrawReason]=useState(''); const [apps,setApps]=useState(()=>myApplications()); useEffect(()=>{const sync=()=>setApps(myApplications());window.addEventListener('applicant-applications-change',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('applicant-applications-change',sync);window.removeEventListener('storage',sync)}},[]); const app=apps.find(a=>String(a.id)===String(appId))||apps[0]; const [message,setMessage]=useState(''); const [withdraw,setWithdraw]=useState(false); const stageIndex=['Applied','Screening','Shortlisted','Interview','Assessment','Offer'].indexOf(app.stage); const dims=[['Skills match',app.skills||85],['Professional Experience',app.experience||68],['Qualifications & Certs',app.education||85],['Cultural Fit & Soft Skills',74]];
 const doWithdraw=()=>{bridgeWithdraw(app.id,withdrawReason.trim());setWithdraw(false);navg('/applicant/applications')}; const respondInterview=action=>{if(app.interviewResponse)return;respondToInterview(app.id,action);setApps(myApplications())};

 return <main className="applicant-page applicant-application-detail"><div className="applicant-breadcrumb">My Applications &nbsp;›&nbsp; {app.title}</div><div className="applicant-detail-application-header"><div className="applicant-detail-logo" aria-hidden="true"/><div><h1>{app.title}</h1><p>{app.company} &nbsp;•&nbsp; Applied on {app.applied}</p></div><span className="applicant-stage-badge">{app.stage}</span><button onClick={()=>navg(`/applicant/jobs/${app.jobId}`)}>View Job Post</button></div><div className="applicant-pipeline"><div className="applicant-pipeline-line" style={{width:`${Math.max(0,stageIndex)*20}%`}}/>{['Applied','Screening','Shortlisted','Interview','Assessment','Offer'].map((s,i)=><div className={i<=stageIndex?'done':''} key={s}><span>{i<stageIndex?'Completed':i===stageIndex?'Current':''}</span><b>{s}</b></div>)}</div><div className="applicant-application-grid"><section className="applicant-evaluation"><div className="applicant-section-title"><h2>Your Evaluation</h2><div className="applicant-score-ring large">{app.score}<small>SCORE</small></div></div>{dims.map(([n,v])=><div className="applicant-eval-bar" key={n}><div><b>{n}</b><strong>{v}%</strong></div><i><em style={{width:`${v}%`}}/></i></div>)}<details open><summary>Experience Breakdown</summary><p>Relevant experience contributes to your overall match score.</p></details><details><summary>Education & Certifications</summary><p>Your education and certifications are considered using the job's configured criteria.</p></details>{app.rejection&&<div className="applicant-improvement reject"><h3>Feedback from the hiring team</h3><p>{app.rejection}</p></div>}<div className="applicant-score-explanation"><h3>How your score is calculated</h3><p>Each dimension contributes to your overall match score based on the job's configured criteria.</p>{dims.map(([n,v])=><div key={n}><b>{n}</b><span>{v}%</span><small>{n==='Skills match'?'How closely your listed skills match the required skills.':n==='Professional Experience'?'How relevant your experience is to the role.':n==='Qualifications & Certs'?'How your education and certifications align with the requirements.':'How well your profile aligns with the role context and soft-skill criteria.'}</small></div>)}</div><div className="applicant-improvement"><h3>Areas for improvement</h3><p>To increase your score for this role, consider highlighting or acquiring the following:</p>{(app.improvements||['Redis Caching','Kubernetes','System Design']).map(x=><span key={x}>{x}</span>)}</div></section><aside className="applicant-updates"><h2>Application Updates</h2>{(app.updates||[]).map((u,i)=><div className="applicant-update" key={i}><span className={`applicant-update-dot ${u.kind||''}`}/><div><b>{u.title}</b><small> • {u.time}</small>{u.kind==='interview'&&<div className="applicant-interview-detail"><p>{u.body}</p><p>{u.date}</p><p>{u.slot}</p><a>{u.link}</a><div><button disabled={!!app.interviewResponse} onClick={()=>respondInterview('confirm')}>Confirm Invitation</button><button disabled={!!app.interviewResponse} onClick={()=>respondInterview('reschedule')}>Request Reschedule</button><button disabled={!!app.interviewResponse} className="applicant-decline-invitation" onClick={()=>respondInterview('decline')}>Decline Invitation</button></div></div>}{u.kind!=='interview'&&<p>{u.body}</p>}</div></div>)}<div className="applicant-message-box"><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Send a message to the hiring manager"/><button onClick={()=>setMessage('')}>Send</button></div></aside></div><div className="applicant-detail-actions">{app.stage!=='Rejected'&&app.stage!=='Withdrawn'&&<button className="applicant-withdraw" onClick={()=>setWithdraw(true)}>Withdraw application</button>}</div>{withdraw&&<div className="applicant-mini-modal"><div><h3>Withdraw application?</h3><p>This will move the application to Withdrawn. You cannot re-apply to the same posting.</p><select value={withdrawReason} onChange={e=>setWithdrawReason(e.target.value)}><option value="">Optional reason</option><option>Accepted another offer</option><option>Position no longer fits</option><option>Personal reasons</option><option>Other</option></select><button onClick={doWithdraw}>Confirm withdrawal</button><button onClick={()=>setWithdraw(false)}>Cancel</button></div></div>}</main>
}
function ApplicantProfile({setup=false}){
 const navg=useNavigate(); const [profile,setProfile]=useState(getApplicantProfile); const [edit,setEdit]=useState(false); const [step,setStep]=useState(1); const update=(k,v)=>setProfile(p=>({...p,[k]:v})); const save=()=>{localStorage.setItem('hirely_applicant_profile',JSON.stringify(profile));window.dispatchEvent(new Event('applicant-profile-change'));syncProfileToCandidates(profile);setEdit(false)}; const upload=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>update('photo',r.result);r.readAsDataURL(f)}; const completeness=(()=>{const checks=[!!profile.name?.trim(),!!profile.phone?.trim(),!!profile.location?.trim(),!!profile.headline?.trim(),!!profile.bio?.trim(),Object.values(profile.skills||{}).some(a=>Array.isArray(a)&&a.some(x=>String(x).trim())),(profile.experience||[]).some(x=>x.title?.trim()&&x.company?.trim()),(profile.education||[]).some(x=>x.degree?.trim()&&x.school?.trim()),!!profile.cv];return Math.round(checks.filter(Boolean).length/checks.length*100)})(); const [setupError,setSetupError]=useState(''); const continueSetup=()=>{if(step===1&&(!profile.name?.trim()||!profile.phone?.trim()||!profile.location?.trim()||!profile.headline?.trim()))return setSetupError('Please complete name, phone, location, and professional headline.');if(step===2&&!Object.values(profile.skills||{}).some(a=>Array.isArray(a)&&a.some(x=>String(x).trim())))return setSetupError('Add at least one skill to continue.');if(step===3&&(profile.experience||[]).some(x=>!x.title?.trim()||!x.company?.trim()))return setSetupError('Complete or remove each experience entry.');setSetupError('');setStep(step+1)};
 if(setup)return <main className="applicant-page applicant-profile-setup"><div className="applicant-setup-top"><b>Profile {completeness}% complete</b><span>Step {step} of 4</span><div><i style={{width:`${completeness}%`}}/></div><nav>{['Personal','Skills','Experience','Education'].map((x,i)=><button key={x} className={step===i+1?'active':''} onClick={()=>setStep(i+1)}><span>{i+1}</span>{x}</button>)}</nav></div><div className="applicant-setup-card"><h1>{step===1?'Personal Information':step===2?'Skills':step===3?'Experience':'Education'}</h1><p>{step===1?"Let's start with the basics. This information helps employers understand who you are and how to reach you.":'Keep your structured profile up to date for better matching.'}</p>{step===1&&<><label className="applicant-photo-upload"><span>{profile.photo?<img src={profile.photo} alt="Profile"/>:<Camera size={30}/>}<i>+</i></span><b>Upload Photo</b><input type="file" accept="image/*" onChange={upload}/></label><Field label="Full name"><input value={profile.name} onChange={e=>update('name',e.target.value)}/></Field><div className="applicant-form-two"><Field label="Phone number"><input value={profile.phone} onChange={e=>update('phone',e.target.value)}/></Field><Field label="Location"><input value={profile.location} onChange={e=>update('location',e.target.value)}/></Field></div><Field label="Professional headline"><input value={profile.headline} onChange={e=>update('headline',e.target.value)}/></Field><Field label="Short bio"><textarea maxLength="500" value={profile.bio} onChange={e=>update('bio',e.target.value)}/></Field></>}{step===2&&<div className="applicant-setup-list"><datalist id="hirely-skill-library-applicant">{listSkills().map(x=><option key={x} value={x}/>)}</datalist>{['expert','intermediate','beginner'].map(level=><section key={level}><h3>{level[0].toUpperCase()+level.slice(1)}</h3>{(profile.skills?.[level]||[]).map((x,i)=><div className="applicant-skill-edit-row" key={`${level}-${i}`}><input list="hirely-skill-library-applicant" aria-label={`${level} skill ${i+1}`} value={x} onChange={e=>{const a=[...(profile.skills?.[level]||[])];a[i]=e.target.value;update('skills',{...profile.skills,[level]:a})}}/><button type="button" onClick={()=>update('skills',{...profile.skills,[level]:(profile.skills?.[level]||[]).filter((_,n)=>n!==i)})}>Remove</button></div>)}<button type="button" onClick={()=>update('skills',{...profile.skills,[level]:[...(profile.skills?.[level]||[]),'']})}>Add {level} skill</button></section>)}</div>}{step===3&&<div className="applicant-setup-list">{(profile.experience||[]).map((x,i)=><Card key={i}><Field label="Job title"><input value={x.title||''} onChange={e=>{const a=[...profile.experience];a[i]={...a[i],title:e.target.value};update('experience',a)}}/></Field><Field label="Company"><input value={x.company||''} onChange={e=>{const a=[...profile.experience];a[i]={...a[i],company:e.target.value};update('experience',a)}}/></Field><Field label="Dates"><input value={x.period||''} onChange={e=>{const a=[...profile.experience];a[i]={...a[i],period:e.target.value};update('experience',a)}}/></Field><Field label="Description"><textarea value={x.description||''} onChange={e=>{const a=[...profile.experience];a[i]={...a[i],description:e.target.value};update('experience',a)}}/></Field><button type="button" onClick={()=>update('experience',profile.experience.filter((_,n)=>n!==i))} className="applicant-setup-entry-remove">Remove experience</button></Card>)}<button type="button" onClick={()=>update('experience',[...(profile.experience||[]),{title:'',company:'',period:'',description:''}])}>Add experience</button></div>}{step===4&&<div className="applicant-setup-list">{(profile.education||[]).map((x,i)=><Card key={i}><Field label="Degree"><input value={x.degree||''} onChange={e=>{const a=[...profile.education];a[i]={...a[i],degree:e.target.value};update('education',a)}}/></Field><Field label="Institution"><input value={x.school||''} onChange={e=>{const a=[...profile.education];a[i]={...a[i],school:e.target.value};update('education',a)}}/></Field><Field label="Dates"><input value={x.period||''} onChange={e=>{const a=[...profile.education];a[i]={...a[i],period:e.target.value};update('education',a)}}/></Field><button type="button" onClick={()=>update('education',profile.education.filter((_,n)=>n!==i))} className="applicant-setup-entry-remove">Remove education</button></Card>)}<button type="button" onClick={()=>update('education',[...(profile.education||[]),{degree:'',school:'',period:''}])}>Add education</button><section><h3>CV / Resume</h3><p>{profile.cv||'No CV uploaded yet'}</p><input type="file" accept=".pdf,.doc,.docx" onChange={e=>{const f=e.target.files?.[0];if(f)update('cv',f.name)}}/></section></div>}<div className="applicant-setup-footer">{step>1&&<button onClick={()=>setStep(step-1)}>Back</button>}{step<4?<button onClick={continueSetup}>Continue</button>:<button onClick={()=>{if(!(profile.education||[]).some(x=>x.degree?.trim()&&x.school?.trim()))return setSetupError('Add at least one completed education entry.');save();navg('/applicant/profile')}}>Finish</button>}</div>{setupError&&<p className="form-error" role="alert">{setupError}</p>}</div><div className="applicant-tip">♧ &nbsp; <b>Concierge Tip:</b> Profiles with a professional photo and a clear headline receive more attention from recruiters in the MENA region.</div></main>
 return <main className="applicant-page applicant-profile-page"><div className="applicant-profile-title"><h1>My Profile</h1><button onClick={()=>setEdit(true)}>✎ Edit profile</button></div><div className="applicant-strength"><div className="applicant-strength-ring">{completeness}%</div><div><h3>Profile Strength</h3><p>Complete your profile to unlock better matches.</p></div></div><div className="applicant-profile-card"><label className="applicant-profile-avatar applicant-avatar-upload" title="Change profile photo">{profile.photo?<img src={profile.photo} alt="Profile"/>:profile.name.split(' ').map(x=>x[0]).join('').slice(0,2)}<span className="applicant-avatar-camera"><Camera size={15}/></span><input type="file" accept="image/*" onChange={upload}/></label><div><h2>{profile.name}</h2><b>{profile.headline}</b><p>{profile.bio}</p><div className="applicant-contact-row">✉ {profile.email} &nbsp;&nbsp;⌖ {profile.location} &nbsp;&nbsp;↗ portfolio.me/sara</div></div></div><div className="applicant-cv-card"><div className="applicant-cv-file-info"><b>{profile.cv||'Upload your CV'}</b><small>Uploaded Dec 12, 2023</small></div><label className="applicant-cv-upload-btn">Upload<input type="file" accept=".pdf,.doc,.docx" onChange={e=>{const f=e.target.files?.[0];if(f){const next={...profile,cv:f.name};setProfile(next);localStorage.setItem('hirely_applicant_profile',JSON.stringify(next));window.dispatchEvent(new Event('applicant-profile-change'))}}}/></label></div><div className="applicant-ai-note">✣ &nbsp; Our AI concierge has parsed your CV to highlight relevant skills. Keep it updated for better job matching!</div><section className="applicant-profile-section"><h2>Skills &amp; Expertise</h2>{[['EXPERT',profile.skills.expert],['INTERMEDIATE',profile.skills.intermediate],['BEGINNER',profile.skills.beginner]].map(([level,arr])=><div key={level}><small>{level}</small><div className="applicant-skill-chips">{arr.map(x=><span key={x}>{x}</span>)}</div></div>)}</section><section className="applicant-profile-section"><h2>Experience</h2>{profile.experience.map((x,i)=><div className="applicant-experience" key={i}><div><b>{x.title}</b><p>{x.company} • {x.period}</p><p>{x.description}</p></div></div>)}</section><section className="applicant-profile-section"><h2>Education</h2>{profile.education.map((x,i)=><div className="applicant-education" key={i}><div><b>{x.degree}</b><p>{x.school}</p><small>{x.period}</small></div></div>)}</section>{edit&&<div className="applicant-edit-modal"><div><button className="applicant-close" onClick={()=>setEdit(false)}>×</button><h2>Edit profile</h2><label className="applicant-photo-edit"><span>{profile.photo?<img src={profile.photo} alt="Profile"/>:<Camera size={28}/>}<i><Camera size={13}/></i><input type="file" accept="image/*" onChange={upload}/></span></label><Field label="Full name"><input value={profile.name} onChange={e=>update('name',e.target.value)}/></Field><Field label="Professional headline"><input value={profile.headline} onChange={e=>update('headline',e.target.value)}/></Field><Field label="Location"><input value={profile.location} onChange={e=>update('location',e.target.value)}/></Field><Field label="Short bio"><textarea value={profile.bio} onChange={e=>update('bio',e.target.value)}/></Field><h3>Skills &amp; Expertise</h3><datalist id="hirely-skill-library-applicant">{listSkills().map(x=><option key={x} value={x}/>)}</datalist>{['expert','intermediate','beginner'].map(level=><section className="applicant-edit-list applicant-skill-edit-group" key={level}><b>{level[0].toUpperCase()+level.slice(1)}</b>{(profile.skills?.[level]||[]).map((skill,i)=><div className="applicant-skill-edit-row" key={level+i}><input list="hirely-skill-library-applicant" value={skill} onChange={e=>{const a=[...(profile.skills?.[level]||[])];a[i]=e.target.value;update('skills',{...profile.skills,[level]:a})}}/><button type="button" aria-label="Remove skill" onClick={()=>update('skills',{...profile.skills,[level]:(profile.skills?.[level]||[]).filter((_,n)=>n!==i)})}>×</button></div>)}<button type="button" onClick={()=>update('skills',{...profile.skills,[level]:[...(profile.skills?.[level]||[]),'']})}>+ Add skill</button></section>)}<h3>Experience</h3>{(profile.experience||[]).map((x,i)=><section className="applicant-edit-list" key={'exp'+i}><Field label="Job title"><input value={x.title||''} onChange={e=>{const a=[...profile.experience];a[i]={...a[i],title:e.target.value};update('experience',a)}}/></Field><Field label="Company"><input value={x.company||''} onChange={e=>{const a=[...profile.experience];a[i]={...a[i],company:e.target.value};update('experience',a)}}/></Field><Field label="Period"><input value={x.period||''} onChange={e=>{const a=[...profile.experience];a[i]={...a[i],period:e.target.value};update('experience',a)}}/></Field><Field label="Description"><textarea value={x.description||''} onChange={e=>{const a=[...profile.experience];a[i]={...a[i],description:e.target.value};update('experience',a)}}/></Field><button type="button" onClick={()=>update('experience',profile.experience.filter((_,n)=>n!==i))} className="applicant-setup-entry-remove">Remove experience</button></section>)}<button type="button" onClick={()=>update('experience',[...(profile.experience||[]),{title:'',company:'',period:'',description:''}])}>+ Add experience</button><h3>Education</h3>{(profile.education||[]).map((x,i)=><section className="applicant-edit-list" key={'edu'+i}><Field label="Degree"><input value={x.degree||''} onChange={e=>{const a=[...profile.education];a[i]={...a[i],degree:e.target.value};update('education',a)}}/></Field><Field label="Institution"><input value={x.school||''} onChange={e=>{const a=[...profile.education];a[i]={...a[i],school:e.target.value};update('education',a)}}/></Field><Field label="Period"><input value={x.period||''} onChange={e=>{const a=[...profile.education];a[i]={...a[i],period:e.target.value};update('education',a)}}/></Field><button type="button" onClick={()=>update('education',profile.education.filter((_,n)=>n!==i))} className="applicant-setup-entry-remove">Remove education</button></section>)}<button type="button" onClick={()=>update('education',[...(profile.education||[]),{degree:'',school:'',period:''}])}>+ Add education</button><button className="applicant-save-profile" onClick={save}>Save changes</button></div></div>}</main>
}
function ApplicantNotifications(){
 const [tab,setTab]=useState('All');
 const defaults=[
  {id:'app-1',kind:'Applications',title:'Application status update for Senior Backend Developer',time:'2h ago',read:false,route:'/applicant/applications'},
  {id:'int-1',kind:'Interviews',title:'Interview scheduled with TechCorp',time:'5h ago',read:false,route:'/applicant/applications'},
  {id:'score-1',kind:'Applications',title:'Score calculated for DigitalCo position',time:'Yesterday',read:true,route:'/applicant/applications'},
  {id:'rej-1',kind:'Applications',title:'Application not selected for Creative Agency',time:'2 days ago',read:true,route:'/applicant/applications'},
  {id:'match-1',kind:'System',title:'New job match at StartupX matches your profile',time:'3 days ago',read:true,route:'/applicant/browse'}
 ];
 const [items,setItems]=useState(()=>JSON.parse(localStorage.getItem('hirely_applicant_notifications')||'null')||defaults);
 const navg=useNavigate();
 const save=next=>{setItems(next);localStorage.setItem('hirely_applicant_notifications',JSON.stringify(next));localStorage.setItem('hirely_applicant_unread',String(next.filter(n=>!n.read).length));window.dispatchEvent(new Event('applicant-notifications-change'))};
 const visible=items.filter(n=>tab==='All'||n.kind===tab);
 return <main className="applicant-page applicant-notifications-page"><div className="applicant-notif-page-head"><h1>Notifications</h1><button disabled={!items.some(n=>!n.read)} onClick={()=>save(items.map(n=>({...n,read:true})))}>Mark all as read</button></div><div className="applicant-notif-tabs">{['All','Applications','Interviews','System'].map(x=><button className={tab===x?'active':''} key={x} onClick={()=>setTab(x)}>{x}</button>)}</div><div className="applicant-notif-list">{visible.length?visible.map(n=><button type="button" className={'applicant-page-notif '+(!n.read?'unread':'')} key={n.id} onClick={()=>{if(!n.read)save(items.map(x=>x.id===n.id?{...x,read:true}:x));navg(n.route||'/applicant/applications')}}><span>{!n.read?'•':''}</span><div><b>{n.title}</b><small>{n.time}</small></div></button>):<p>No notifications in this category.</p>}</div></main>
}

function ApplicantJobDetailRoute(){const loc=useLocation();return <ApplicantJobDetail jobId={loc.pathname.split('/').pop()}/>}
function ApplicantApplyRoute(){const loc=useLocation();return <ApplicantApply jobId={loc.pathname.split('/').pop()}/>}
function ApplicantApplicationDetailRoute(){const loc=useLocation();return <ApplicantApplicationDetail appId={loc.pathname.split('/').pop()}/>}

function Guard({children}){return children}
function SuperAdminRoute(){
 const navg=useNavigate();
 // The Super Admin portal is platform-level: it is not scoped to a company
 // tenant, so it lives outside the company Shell and the applicant Shell.
 if(currentRole()!=='super-admin')return <Navigate to="/login" replace/>;
 const signOut=()=>{logAudit('Super Admin logged out','Authentication');localStorage.removeItem('hirely_role');window.dispatchEvent(new Event('hirely-role-change'));navg('/login')};
 return <SuperAdminApp onLogout={signOut}/>;
}
export default function App(){const [activeRole,setActiveRole]=useState(()=>localStorage.getItem('hirely_role')||'company-admin');useEffect(()=>{const syncRole=()=>setActiveRole(localStorage.getItem('hirely_role')||'company-admin');window.addEventListener('hirely-role-change',syncRole);window.addEventListener('storage',syncRole);return()=>{window.removeEventListener('hirely-role-change',syncRole);window.removeEventListener('storage',syncRole)}},[]);return <Provider><BrowserRouter><Routes><Route path="/login" element={<Login/>}/><Route path="/forgot-password" element={<ForgotPasswordRoute/>}/><Route path="/recruiter/setup" element={<RecruiterSetup/>}/><Route path="/onboarding/company" element={<Onboarding/>}/><Route path="/applicant/auth" element={<ApplicantAuth/>}/><Route path="/super-admin/*" element={<SuperAdminRoute/>}/><Route path="/applicant/*" element={<ApplicantShell><Routes><Route path="browse" element={<ApplicantBrowse/>}/><Route path="jobs/:id" element={<ApplicantJobDetailRoute/>}/><Route path="apply/:id" element={<ApplicantApplyRoute/>}/><Route path="applications" element={<ApplicantApplications/>}/><Route path="applications/:id" element={<ApplicantApplicationDetailRoute/>}/><Route path="profile" element={<ApplicantProfile/>}/><Route path="profile/setup" element={<ApplicantProfile setup/>}/><Route path="notifications" element={<ApplicantNotifications/>}/><Route path="*" element={<Navigate to="/applicant/browse" replace/>}/></Routes></ApplicantShell>}/><Route path="/" element={<Landing/>}/><Route path="*" element={<Shell><Routes><Route path="/dashboard" element={<Dashboard/>}/><Route path="/jobs" element={<Jobs/>}/><Route path="/jobs/new" element={<JobForm/>}/><Route path="/jobs/:id/edit" element={<JobForm/>}/><Route path="/jobs/:id" element={<JobDetails/>}/><Route path="/pipeline" element={<Pipeline/>}/><Route path="/candidates" element={<Candidates/>}/><Route path="/analytics" element={activeRole==='recruiter'?<RecruiterAnalytics/>:<Analytics/>}/><Route path="/talent-pool" element={<TalentPool/>}/><Route path="/team" element={<Team/>}/><Route path="/profile" element={<Profile/>}/><Route path="/billing" element={<Billing/>}/><Route path="/announcements" element={<Announcements/>}/><Route path="/support/report" element={<ReportProblem/>}/><Route path="/support/reports" element={<MyReports/>}/><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes></Shell>}/></Routes></BrowserRouter></Provider>}
