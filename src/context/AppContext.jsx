import React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { seedData, stages } from "../data/mockData";

const AppContext = createContext(null);
const clone = value => JSON.parse(JSON.stringify(value));
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;

function load() {
  try {
    const saved = localStorage.getItem("hirely-state");
    return saved ? JSON.parse(saved) : clone(seedData);
  } catch {
    return clone(seedData);
  }
}

export const ROLE_LABELS = {
  "super-admin": "Super Admin",
  "company-admin": "Company Admin",
  recruiter: "Recruiter",
  applicant: "Applicant",
};


export function calculateMatchScore(job, profile = {}) {
  const weights = job?.weights || { skills: 40, experience: 30, qualifications: 20, custom: 10 };
  const required = (job?.skills || []).map(x => String(x).toLowerCase());
  const have = (profile?.skills || []).map(x => String(x).toLowerCase());
  const skillScore = required.length ? required.filter(x => have.some(y => y === x || y.includes(x) || x.includes(y))).length / required.length * 100 : Number(job?.aiMatch || 70);
  const expRequired = Number(job?.experience || 0);
  const expScore = expRequired ? Math.min(100, Number(profile?.experience || 0) / expRequired * 100) : 100;
  const educationScore = !job?.education || job.education === "Any" || job.education === profile?.education ? 100 : profile?.education === "PhD" || (profile?.education === "Master's Degree" && job.education === "Bachelor's Degree") ? 100 : 60;
  const custom = Number(job?.aiMatch || 70);
  const totalWeight = Object.values(weights).reduce((a,b)=>a+Number(b||0),0) || 100;
  return Math.round((skillScore*Number(weights.skills||0)+expScore*Number(weights.experience||0)+educationScore*Number(weights.qualifications||0)+custom*Number(weights.custom||0))/totalWeight);
}

export const permissions = {
  "super-admin": ["platform:manage", "platform:analytics"],
  "company-admin": ["company:manage", "jobs:write", "jobs:delete", "candidates:write", "score:override", "talent:delete", "team:manage", "billing:manage", "analytics:all"],
  recruiter: ["jobs:write", "candidates:write", "talent:save", "analytics:own"],
  applicant: ["jobs:browse", "applications:write", "profile:write"],
};

function appendActivity(candidate, text) {
  return { ...candidate, activity: [{ id: uid("act"), text, at: new Date().toISOString() }, ...(candidate.activity || [])] };
}

export function AppProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => localStorage.setItem("hirely-state", JSON.stringify(state)), [state]);

  const patchState = updater => setState(s => updater(s));
  const update = (key, value) => patchState(s => ({ ...s, [key]: typeof value === "function" ? value(s[key]) : value }));

  const actions = useMemo(() => ({
    setUser(user) { update("user", user); },
    resetDemo() { setState(clone(seedData)); },
    hasPermission(permission) { return (permissions[state.user?.role] || []).includes(permission); },

    completeCompanySetup(companyPatch) {
      update("company", c => ({ ...c, ...companyPatch, setupComplete: true }));
    },

    choosePlan(plan) {
      const plans = { Starter: 49, Growth: 129, Enterprise: 0 };
      update("company", c => ({ ...c, plan, monthly: plans[plan] ?? c.monthly }));
    },

    addJob(job) {
      const id = uid("job");
      update("jobs", jobs => [...jobs, {
        ...job,
        id,
        applicants: 0,
        daysOpen: 0,
        aiMatch: 82,
        createdBy: state.user?.id,
        assignedTo: job.assignedTo || state.user?.name,
        archived: false,
      }]);
      return id;
    },
    updateJob(id, patch) { update("jobs", jobs => jobs.map(j => j.id === id ? { ...j, ...patch } : j)); },
    deleteJob(id) {
      if (!permissions[state.user?.role]?.includes("jobs:delete")) return false;
      patchState(s => ({
        ...s,
        jobs: s.jobs.map(j => j.id === id ? { ...j, status: "Closed", archived: true, deletedAt: new Date().toISOString() } : j),
        applications: s.applications.map(a => a.jobId === id ? { ...a, status: "Closed", stage: "Closed", closedAt: new Date().toISOString() } : a),
        candidates: s.candidates.map(c => c.jobId === id && !["Hired", "Rejected", "Withdrawn"].includes(c.stage) ? { ...c, stage: "Closed" } : c),
      }));
      return true;
    },
    toggleJob(id) { update("jobs", jobs => jobs.map(j => String(j.id) === String(id) ? { ...j, status: j.status === "Paused" ? "Open" : "Paused" } : j)); },
    closeJob(id) { update("jobs", jobs => jobs.map(j => String(j.id) === String(id) ? { ...j, status: "Closed", archived: false } : j)); },

    addCandidate(candidate) {
      const c = { ...candidate, id: uid("candidate"), activity: [{ id: uid("act"), text: "Candidate added", at: new Date().toISOString() }] };
      update("candidates", list => [...list, c]);
      return c;
    },

    updateCandidate(id, patch) {
      patchState(s => ({
        ...s,
        candidates: s.candidates.map(c => c.id === id ? appendActivity({ ...c, ...patch, updatedAt: new Date().toISOString() }, "Candidate profile updated") : c),
      }));
      return true;
    },

    archiveCandidate(id, reason = "Archived") {
      if (!permissions[state.user?.role]?.includes("candidates:write")) return false;
      patchState(s => {
        const candidate = s.candidates.find(c => c.id === id);
        if (!candidate) return s;
        const next = appendActivity({ ...candidate, stage: "Archived", archived: true, archivedAt: new Date().toISOString() }, reason);
        return {
          ...s,
          candidates: s.candidates.map(c => c.id === id ? next : c),
          applications: s.applications.map(a => a.id === candidate.applicationId || a.candidateId === id ? { ...a, status: "Archived", stage: "Archived", archivedAt: new Date().toISOString() } : a),
        };
      });
      return true;
    },

    moveCandidate(id, stage) {
      if (!stages.includes(stage)) return false;
      patchState(s => {
        const candidate = s.candidates.find(c => c.id === id);
        if (!candidate) return s;
        let next = appendActivity({ ...candidate, stage, updatedAt: new Date().toISOString() }, `Moved to ${stage} by ${s.user?.name || "Recruiter"}`);
        const applications = s.applications.map(a => a.id === candidate.applicationId ? { ...a, stage, status: stage === "Rejected" ? "Rejected" : a.status } : a);
        return { ...s, candidates: s.candidates.map(c => c.id === id ? next : c), applications };
      });
      return true;
    },

    rejectCandidate(id, reason = "", feedback = "", automatic = false) {
      patchState(s => {
        const candidate = s.candidates.find(c => c.id === id);
        if (!candidate) return s;
        const text = automatic ? `Auto-rejected by system — score ${candidate.score}/100 below threshold` : `Rejected by ${s.user?.name || "Recruiter"} — ${reason || "No reason selected"}`;
        const next = appendActivity({ ...candidate, stage: "Rejected", rejectionReason: reason, feedback, updatedAt: new Date().toISOString() }, text);
        return {
          ...s,
          candidates: s.candidates.map(c => c.id === id ? next : c),
          applications: s.applications.map(a => a.id === candidate.applicationId ? { ...a, stage: "Rejected", status: "Rejected", feedback, rejectionReason: reason } : a),
        };
      });
    },

    overrideScore(id, score, reason) {
      if (!permissions[state.user?.role]?.includes("score:override")) return false;
      const numeric = Number(score);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100 || !reason?.trim()) return false;
      patchState(s => {
        const candidate = s.candidates.find(c => c.id === id);
        if (!candidate) return s;
        let next = appendActivity({
          ...candidate,
          originalScore: candidate.originalScore ?? candidate.score,
          score: numeric,
          scoreOverride: { score: numeric, reason: reason.trim(), by: s.user?.name, at: new Date().toISOString() },
        }, `Score overridden from ${candidate.score} to ${numeric} by ${s.user?.name}`);
        let applications = s.applications.map(a => a.id === candidate.applicationId ? { ...a, score: numeric } : a);
        if (numeric > (candidate.autoAdvanceThreshold ?? 80) && candidate.stage === "Applied") {
          next.stage = "Shortlisted";
          next = appendActivity(next, `Auto-advanced by system — score ${numeric}/100`);
          applications = applications.map(a => a.id === candidate.applicationId ? { ...a, stage: "Shortlisted" } : a);
        }
        return { ...s, candidates: s.candidates.map(c => c.id === id ? next : c), applications };
      });
      return true;
    },

    saveToTalentPool(candidate, tags = []) {
      patchState(s => ({ ...s, talentPool: [...s.talentPool.filter(x => x.candidateId !== candidate.id || x.ownerId !== s.user?.id), { id: uid("talent"), candidateId: candidate.id, name: candidate.name, tags, owner: s.user?.name, ownerId: s.user?.id, createdAt: new Date().toISOString() }] }));
    },
    deleteTalent(id) {
      if (!permissions[state.user?.role]?.includes("talent:delete")) return false;
      update("talentPool", p => p.filter(x => x.id !== id));
      return true;
    },

    invite(email) {
      if (!permissions[state.user?.role]?.includes("team:manage") || !/^\S+@\S+\.\S+$/.test(email)) return false;
      update("team", t => [...t, { id: uid("invite"), name: email.split("@")[0], email, role: "Recruiter", status: "Pending", invitedAt: new Date().toISOString(), token: uid("token"), expiresHours: 72 }]);
      return true;
    },
    resendInvite(id) { update("team", t => t.map(x => x.id === id ? { ...x, invitedAt: new Date().toISOString(), status: "Pending", token: uid("token") } : x)); },
    acceptInvite(id, name, password) {
      if (!name?.trim() || password?.length < 8) return false;
      patchState(s => {
        const member = s.team.find(x => x.id === id);
        if (!member) return s;
        return { ...s, team: s.team.map(x => x.id === id ? { ...x, name, status: "Active", acceptedAt: new Date().toISOString() } : x), user: { id: member.id, name, email: member.email, role: "recruiter", title: "Recruiter", company: s.company.name, location: s.company.location } };
      });
      return true;
    },
    deactivateMember(id) { update("team", t => t.map(x => x.id === id ? { ...x, status: "Deactivated" } : x)); },
    reactivateMember(id) { update("team", t => t.map(x => x.id === id ? { ...x, status: "Active" } : x)); },
    changeRole(id, role) { update("team", t => t.map(x => x.id === id ? { ...x, role } : x)); },

    addAnnouncement(a) { update("announcements", arr => [{ ...a, id: uid("announcement"), date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }, ...arr]); },
    updateAnnouncement(id, patch) { update("announcements", arr => arr.map(a => a.id === id ? { ...a, ...patch } : a)); },
    deleteAnnouncement(id) { update("announcements", arr => arr.filter(a => a.id !== id)); },

    createApplication({ job, answers = [], profile = state.user }) {
      const previous = state.applications?.find(a => a.jobId === job.id && a.applicantId === state.user?.id);
      if (previous) return { error: "You already applied to this job posting. A new posting is required before you can apply again." };
      if (job.status !== "Open" && job.status !== "Screening" && job.status !== "Interview" && job.status !== "Assessment") return { error: "This job is not accepting applications." };
      const score = calculateMatchScore(job, profile);
      const autoAdvance = Number(job.autoAdvance ?? 80);
      const autoReject = Number(job.autoReject ?? 40);
      const stage = score > autoAdvance ? "Shortlisted" : score < autoReject ? "Rejected" : "Applied";
      const status = stage === "Rejected" ? "Rejected" : "Under Review";
      const appId = uid("application");
      const candidateId = uid("candidate");
      const app = { id: appId, applicantId: state.user?.id, candidateId, jobId: job.id, jobTitle: job.title, company: state.company.name, stage, score, status, answers, submittedAt: new Date().toISOString(), originalScore: score, feedback: stage === "Rejected" ? "Your profile does not meet the current score threshold. Review the score breakdown and improve the listed skills." : "" };
      const candidate = { id: candidateId, applicationId: appId, applicantId: state.user?.id, name: profile.name || "Sara Ahmed", jobId: job.id, stage, score, skills: profile.skills || ["React.js", "JavaScript"], email: profile.email, experience: profile.experience || 3, education: profile.education || "Bachelor's Degree", autoAdvanceThreshold: autoAdvance, autoRejectThreshold: autoReject, activity: [{ id: uid("act"), text: stage === "Shortlisted" ? `Auto-advanced by system — score ${score}/100` : stage === "Rejected" ? `Auto-rejected by system — score ${score}/100 below threshold ${autoReject}` : "Application submitted", at: new Date().toISOString() }] };
      patchState(s => ({ ...s, applications: [...s.applications, app], candidates: [...s.candidates, candidate], jobs: s.jobs.map(j => j.id === job.id ? { ...j, applicants: Number(j.applicants || 0) + 1 } : j) }));
      return { application: app };
    },

    withdrawApplication(id, reason = "") {
      patchState(s => {
        const app = s.applications.find(a => a.id === id);
        if (!app || app.applicantId !== s.user?.id || ["Withdrawn", "Closed"].includes(app.status)) return s;
        return { ...s, applications: s.applications.map(a => a.id === id ? { ...a, stage: "Withdrawn", status: "Withdrawn", reason, withdrawnAt: new Date().toISOString() } : a), candidates: s.candidates.map(c => c.applicationId === id ? appendActivity({ ...c, stage: "Withdrawn" }, "Application withdrawn by applicant") : c) };
      });
    },
    scheduleInterview(applicationId, interview) { patchState(s => { const candidate = s.candidates.find(c => c.id === applicationId); const actualId = candidate?.applicationId || applicationId; return { ...s, applications: s.applications.map(a => a.id === actualId ? { ...a, interview: { ...interview, status: "Pending" } } : a), candidates: candidate ? s.candidates.map(c => c.id === applicationId ? appendActivity(c, `Interview scheduled for ${interview.date} at ${interview.time}`) : c) : s.candidates }; }); },
    confirmInterview(applicationId) { update("applications", apps => apps.map(a => a.id === applicationId ? { ...a, interview: { ...a.interview, status: "Confirmed" }, updates: [{ id: uid("update"), text: "Interview invitation confirmed", at: new Date().toISOString() }, ...(a.updates || [])] } : a)); },
    requestReschedule(applicationId, message) { update("applications", apps => apps.map(a => a.id === applicationId ? { ...a, interview: { ...a.interview, status: "Reschedule Requested", message }, updates: [{ id: uid("update"), text: `Interview reschedule requested: ${message}`, at: new Date().toISOString() }, ...(a.updates || [])] } : a)); },
    declineInterview(applicationId) { update("applications", apps => apps.map(a => a.id === applicationId ? { ...a, interview: { ...a.interview, status: "Declined" }, updates: [{ id: uid("update"), text: "Interview invitation declined", at: new Date().toISOString() }, ...(a.updates || [])] } : a)); },
    updateProfile(patch) { update("user", u => ({ ...u, ...patch })); },
    updateCompany(patch) { update("company", c => ({ ...c, ...patch })); },
  }), [state.user, state.candidates, state.applications, state.company]);

  const value = { ...state, ...actions, roleLabel: ROLE_LABELS[state.user?.role] || state.user?.role };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
