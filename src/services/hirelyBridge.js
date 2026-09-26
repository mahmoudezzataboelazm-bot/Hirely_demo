/*
 * hirelyBridge.js
 * ----------------------------------------------------------------------------
 * Single source of truth that links the Company Admin / Recruiter workspace
 * with the Applicant portal.
 *
 * Every function here is the FRONTEND stand-in for one backend endpoint.
 * The mapping is documented in BACKEND-INTEGRATION.md. When the API is ready,
 * replace the body of each function with an HTTP call and keep the same
 * signature + return shape — no UI component needs to change.
 *
 * Shared storage keys (demo persistence layer):
 *   hirely_jobs                     -> jobs published by Company Admin / Recruiter
 *   hirely_candidates               -> ATS candidate records (recruiter view)
 *   hirely_applicant_applications   -> applicant view of the same records
 *   hirely_applicant_profile        -> applicant profile / CV
 *   hirely_notifications            -> Company Admin notifications
 *   hirely_recruiter_notifications  -> Recruiter notifications
 *   hirely_applicant_notifications  -> Applicant notifications
 *
 * An application and its candidate record are the SAME entity seen from two
 * sides. They are joined by:  candidate.applicationId === application.id
 *                             application.candidateId === candidate.id
 */

/* ------------------------------------------------------------------ storage */
const read = (key, fallback = null) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const KEYS = {
  jobs: 'hirely_jobs',
  candidates: 'hirely_candidates',
  applications: 'hirely_applicant_applications',
  applicantProfile: 'hirely_applicant_profile',
  applicantAccount: 'hirely_applicant_account',
  applicantNotifications: 'hirely_applicant_notifications',
  applicantUnread: 'hirely_applicant_unread',
  adminNotifications: 'hirely_notifications',
  recruiterNotifications: 'hirely_recruiter_notifications',
  company: 'hirely_company',
};

export const EVENTS = {
  jobs: 'hirely-jobs-change',
  candidates: 'hirely-candidates-change',
  applications: 'applicant-applications-change',
  applicantNotifications: 'applicant-notifications-change',
};

const emit = name => window.dispatchEvent(new Event(name));

export const getJobs = () => read(KEYS.jobs, []) || [];
export const getCandidates = () => read(KEYS.candidates, []) || [];
export const getApplications = () => read(KEYS.applications, []) || [];
export const getApplicantProfile = () => read(KEYS.applicantProfile, {}) || {};
export const getCompany = () => read(KEYS.company, {}) || {};

export const saveCandidates = list => { write(KEYS.candidates, list); emit(EVENTS.candidates); };
export const saveApplications = list => { write(KEYS.applications, list); emit(EVENTS.applications); };
export const saveJobs = list => { write(KEYS.jobs, list); emit(EVENTS.jobs); };

const nowISO = () => new Date().toISOString();
const today = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const newId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------ notifications */
function pushNotification(target, entry) {
  const key = target === 'recruiter' ? KEYS.recruiterNotifications
    : target === 'applicant' ? KEYS.applicantNotifications
      : KEYS.adminNotifications;
  const current = read(key, []) || [];
  const next = [{ id: newId('n'), time: 'Just now', read: false, ...entry }, ...current].slice(0, 40);
  write(key, next);
  if (target === 'applicant') {
    localStorage.setItem(KEYS.applicantUnread, String(next.filter(n => !n.read).length));
    emit(EVENTS.applicantNotifications);
  }
}
export { pushNotification };

/* ------------------------------------------------------------------ scoring */
/*
 * DFS (Dynamic Fit Score).
 * Four dimensions weighted by the weights configured on the job by the
 * Company Admin / Recruiter in the Job Form. The backend must reproduce this
 * exact formula (see BACKEND-INTEGRATION.md -> Scoring contract).
 */
const norm = v => String(v || '').toLowerCase().trim();
const SKILL_LEVEL_VALUE = { expert: 100, intermediate: 80, beginner: 60 };

function flatSkills(profile) {
  const out = [];
  const skills = profile?.skills || {};
  if (Array.isArray(skills)) skills.forEach(s => out.push({ name: norm(s), value: 80 }));
  else Object.entries(skills).forEach(([level, arr]) =>
    (arr || []).filter(Boolean).forEach(s => out.push({ name: norm(s), value: SKILL_LEVEL_VALUE[level] ?? 70 })));
  return out;
}

function skillsDimension(job, profile) {
  const required = (job?.requirements || job?.skills || []).map(norm).filter(Boolean);
  const mine = flatSkills(profile);
  if (!required.length) return { value: 70, matched: [], missing: [] };
  const matched = [], missing = [];
  let total = 0;
  required.forEach(req => {
    const hit = mine.find(s => s.name === req || s.name.includes(req) || req.includes(s.name));
    if (hit) { matched.push(req); total += hit.value; } else { missing.push(req); }
  });
  return { value: Math.round(total / required.length), matched, missing };
}

function yearsOfExperience(profile) {
  const entries = profile?.experience || [];
  let years = 0;
  entries.forEach(e => {
    const period = String(e?.period || '');
    const found = period.match(/(19|20)\d{2}/g) || [];
    const start = found[0] ? Number(found[0]) : null;
    const end = /present|current/i.test(period) ? new Date().getFullYear() : (found[1] ? Number(found[1]) : null);
    if (start && end && end >= start) years += Math.max(1, end - start);
    else if (e?.title) years += 1;
  });
  return years;
}

function requiredYears(job) {
  if (Number.isFinite(Number(job?.minExperience))) return Number(job.minExperience);
  const t = norm(job?.title);
  if (/principal|head|director/.test(t)) return 8;
  if (/senior|sr\.|lead/.test(t)) return 5;
  if (/junior|intern|entry|graduate/.test(t)) return 0;
  return 3;
}

function experienceDimension(job, profile) {
  const need = requiredYears(job);
  const have = yearsOfExperience(profile);
  if (!need) return { value: 100, have, need };
  return { value: Math.max(20, Math.min(100, Math.round((have / need) * 100))), have, need };
}

function educationDimension(job, profile) {
  const entries = profile?.education || [];
  if (!entries.some(e => e?.degree)) return { value: 40 };
  const best = entries.map(e => norm(e.degree)).join(' ');
  if (/phd|doctor/.test(best)) return { value: 100 };
  if (/master|msc|mba/.test(best)) return { value: 95 };
  if (/bachelor|bsc|licence|b\.s/.test(best)) return { value: 85 };
  return { value: 70 };
}

function locationDimension(job, profile) {
  const jobLoc = norm(job?.location);
  const mine = norm(profile?.location);
  if (!jobLoc || /remote|anywhere/.test(jobLoc)) return { value: 100 };
  if (!mine) return { value: 60 };
  const city = part => part.split(',')[0].trim();
  const country = part => (part.split(',')[1] || part).trim();
  if (city(jobLoc) && city(jobLoc) === city(mine)) return { value: 100 };
  if (country(jobLoc) && country(jobLoc) === country(mine)) return { value: 80 };
  return { value: 50 };
}

export function calculateMatchScore(job, profile = getApplicantProfile()) {
  const weights = { ...getDFSDefaults(), ...(job?.weights || {}) };
  const skills = skillsDimension(job, profile);
  const experience = experienceDimension(job, profile);
  const education = educationDimension(job, profile);
  const location = locationDimension(job, profile);
  const totalWeight = ['skills', 'experience', 'education', 'location']
    .reduce((sum, k) => sum + Number(weights[k] || 0), 0) || 100;
  const total = Math.round((
    skills.value * Number(weights.skills || 0) +
    experience.value * Number(weights.experience || 0) +
    education.value * Number(weights.education || 0) +
    location.value * Number(weights.location || 0)
  ) / totalWeight);
  return {
    total: Math.max(0, Math.min(100, total)),
    dimensions: { skills: skills.value, experience: experience.value, education: education.value, location: location.value },
    matchedSkills: skills.matched,
    missingSkills: skills.missing,
    weights,
  };
}

/* ------------------------------------------------------- jobs for applicants */
const OPEN_STATUSES = ['Open', 'Screening', 'Interview', 'Assessment'];
export const isJobPublic = job => OPEN_STATUSES.includes(job?.status);
export const isJobAcceptingApplications = job => job?.status === 'Open';

function relativePosted(job) {
  const raw = job?.created;
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return raw || 'Recently';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week(s) ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* Maps an internal job record to the public shape the Applicant portal renders. */
export function toPublicJob(job, profile = getApplicantProfile()) {
  const company = getCompany();
  const score = calculateMatchScore(job, profile);
  return {
    id: job.id,
    title: job.title,
    company: company?.name || job.company || 'Hirely Tech Hub',
    location: job.location || 'Remote',
    type: job.type || 'Full-time',
    salary: job.salary || '',
    posted: relativePosted(job),
    status: job.status,
    deadline: job.deadline || '',
    match: score.total,
    scoreBreakdown: score,
    tags: (job.requirements || []).filter(Boolean).slice(0, 4),
    requirements: (job.requirements || []).filter(Boolean),
    description: job.description || '',
    about: `${company?.name || 'Hirely Tech Hub'} is hiring through the Hirely platform.`,
    weights: job.weights,
    department: job.department,
    acceptingApplications: isJobAcceptingApplications(job),
  };
}

/* GET /api/jobs  (public job board) */
export function listPublicJobs(profile = getApplicantProfile()) {
  // DEP-01: a suspended or deleted tenant's jobs disappear from Browse Jobs.
  if (isLocalTenantSuspended()) return [];
  return getJobs().filter(isJobPublic).map(job => toPublicJob(job, profile));
}

/* GET /api/jobs/:id */
export function getPublicJob(jobId, profile = getApplicantProfile()) {
  if (isLocalTenantSuspended()) return null;
  const job = getJobs().find(j => String(j.id) === String(jobId));
  return job ? toPublicJob(job, profile) : null;
}

/* ------------------------------------------------- applicant -> ATS: apply */
// DEP-10: the applicant is never told they were auto-advanced — only that
// their application is moving forward. The internal wording stays in the
// recruiter's activity log.
// DEP-11: an auto-rejected applicant still receives an honest, structured
// explanation built from their lowest-scoring dimensions.
function autoRejectFeedback(score) {
  const labels = { skills: 'Skills match', experience: 'Experience', education: 'Qualifications', location: 'Location match' };
  const lowest = Object.entries(score.dimensions)
    .sort((a, b) => a[1] - b[1]).slice(0, 2)
    .map(([k, v]) => `${labels[k]} ${v}%`).join(', ');
  const missing = score.missingSkills.slice(0, 3).join(', ');
  return `Your application did not meet the score threshold for this role. Lowest dimensions: ${lowest}.`
    + (missing ? ` Adding these skills would improve future scores: ${missing}.` : '');
}

const APPLICANT_PROGRESS = 'Your application is progressing — it is now under review by the hiring team.';

function applyAutomation(job, stage, score) {
  const rule = job?.stageAutomation?.[stage];
  const autoReject = Number(job?.autoReject ?? rule?.threshold ?? 40);
  const autoAdvance = Number(job?.autoAdvance ?? 80);
  if (rule?.action === 'Auto-reject' && score <= Number(rule.threshold ?? autoReject))
    return { stage: 'Rejected', internal: `Automatically rejected by job rule at ${rule.threshold ?? autoReject}% threshold`, applicant: null };
  if (rule?.action === 'Auto-advance' && score >= Number(rule.threshold ?? autoAdvance)) {
    const pipeline = job?.pipeline?.length ? job.pipeline : ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Assessment', 'Offer'];
    const next = pipeline[pipeline.indexOf(stage) + 1];
    if (next) return { stage: next, internal: `Automatically advanced to ${next} by job rule at ${rule.threshold ?? autoAdvance}% threshold`, applicant: APPLICANT_PROGRESS };
  }
  if (score < autoReject) return { stage: 'Rejected', internal: `Auto-rejected by system — score ${score}/100 below threshold ${autoReject}`, applicant: null };
  if (score > autoAdvance) return { stage: 'Shortlisted', internal: `Auto-advanced by system — score ${score}/100`, applicant: APPLICANT_PROGRESS };
  return { stage, internal: null, applicant: null };
}

/*
 * POST /api/applications
 * Creates ONE record that both sides read:
 *  - the Applicant sees it in My Applications
 *  - the Recruiter / Company Admin see it in Candidates + Pipeline
 */
export function submitApplication({ jobId, answers = [], cv = '', profile = getApplicantProfile() }) {
  const jobs = getJobs();
  const job = jobs.find(j => String(j.id) === String(jobId));
  if (!job) return { error: 'This job posting no longer exists.' };
  if (!isJobAcceptingApplications(job)) return { error: 'This job is not accepting applications right now.' };

  const applications = getApplications();
  if (applications.some(a => String(a.jobId) === String(job.id) && a.applicantEmail === profile.email))
    return { error: 'You already applied to this job posting. You cannot apply again.' };

  const score = calculateMatchScore(job, profile);
  const applicationId = newId('app');
  const candidateId = newId('cnd');
  const auto = applyAutomation(job, 'Applied', score.total);
  recordAiCall('cv-parse');
  recordAiCall('dfs-score');
  const at = nowISO();
  const company = getCompany();
  const owner = job.assignedTo || job.owner || job.createdBy || 'Heba Mohamed';

  /* ---- ATS side (Recruiter / Company Admin) ---- */
  const candidate = {
    id: candidateId,
    applicationId,
    applicantEmail: profile.email,
    name: profile.name || 'Applicant',
    email: profile.email || '',
    phone: profile.phone || '',
    locationName: profile.location || '',
    headline: profile.headline || '',
    job: job.title,
    jobId: job.id,
    stage: auto.stage,
    applicationStage: auto.stage,
    score: score.total,
    originalScore: score.total,
    skills: score.dimensions.skills,
    experience: score.dimensions.experience,
    education: score.dimensions.education,
    location: score.dimensions.location,
    yearsExperience: yearsOfExperience(profile),
    educationLabel: profile.education?.[0]?.degree || '',
    primarySkills: (job.requirements || []).filter(Boolean).slice(0, 4),
    matchedSkills: score.matchedSkills,
    missingSkills: score.missingSkills,
    owner,
    source: 'Applicant portal',
    applied: today(),
    appliedAt: at,
    answers,
    cv: cv || profile.cv || '',
    feedback: '',
    notes: [],
    tags: [],
    activity: [
      ...(auto.internal ? [auto.internal] : []),
      `Application submitted by ${profile.name || 'Applicant'} — ${today()}`,
    ],
  };
  saveCandidates([candidate, ...getCandidates()]);

  /* ---- Applicant side ---- */
  const application = {
    id: applicationId,
    candidateId,
    jobId: job.id,
    applicantEmail: profile.email,
    title: job.title,
    company: company?.name || 'Hirely Tech Hub',
    applied: today(),
    appliedAt: at,
    stage: auto.stage,
    status: auto.stage === 'Rejected' ? 'Rejected' : 'Active',
    score: score.total,
    skills: score.dimensions.skills,
    experience: score.dimensions.experience,
    education: score.dimensions.education,
    location: score.dimensions.location,
    improvements: score.missingSkills.slice(0, 5),
    answers,
    cv: cv || profile.cv || '',
    ...(auto.stage === 'Rejected' ? { rejection: autoRejectFeedback(score) } : {}),
    updates: [
      ...(auto.stage === 'Rejected'
        ? [{ title: 'Application Not Selected', time: 'Just now', body: autoRejectFeedback(score), kind: 'rejected', at }]
        : auto.applicant
          ? [{ title: 'Application Progressed', time: 'Just now', body: auto.applicant, kind: 'progress', at }]
          : []),
      { title: 'Application Received', time: 'Just now', body: 'Your application was submitted successfully.', kind: 'received', at },
    ],
  };
  saveApplications([application, ...applications]);

  /* ---- job counter ---- */
  saveJobs(jobs.map(j => String(j.id) === String(job.id)
    ? { ...j, applicants: Number(j.applicants || 0) + 1 }
    : j));

  /* ---- notifications for both workspaces ---- */
  pushNotification('company-admin', { title: 'New candidate applied', body: `${candidate.name} applied for ${job.title}.`, route: '/candidates' });
  pushNotification('recruiter', { title: 'New candidate on your job', body: `${candidate.name} applied for ${job.title} (score ${score.total}%).`, route: '/candidates' });
  pushNotification('applicant', { kind: 'Applications', title: `Application received for ${job.title}`, route: '/applicant/applications' });

  return { application, candidate };
}

/* ------------------------------------------- ATS -> applicant: live mirror */
const STAGE_MESSAGE = {
  Screening: 'Your application has moved to the screening stage.',
  Shortlisted: 'Great news — your application has been shortlisted.',
  Interview: 'Your application has moved to the interview stage.',
  Assessment: 'You have been moved to the assessment stage.',
  Offer: 'Your application has progressed to the offer stage.',
  Hired: 'Congratulations — you have been marked as hired for this role.',
  Rejected: 'Thank you for your interest. We decided not to move forward with your application at this time.',
  Archived: 'This application is no longer active.',
  Closed: 'The job posting for this application was closed.',
};

/*
 * Called after ANY recruiter / company-admin write on candidates.
 * Mirrors stage, score, feedback, interview and status updates into the
 * applicant's application timeline and pushes applicant notifications.
 * Backend equivalent: a domain event per candidate mutation.
 */
export function syncApplicantFromCandidates(candidates = getCandidates()) {
  const applications = getApplications();
  if (!applications.length) return applications;
  let changed = false;

  const next = applications.map(app => {
    const candidate = candidates.find(c =>
      String(c.applicationId) === String(app.id) || String(c.id) === String(app.candidateId));
    if (!candidate) return app;

    let updated = { ...app };
    const updates = [...(app.updates || [])];
    const at = nowISO();

    /* stage change */
    if (candidate.stage && candidate.stage !== app.stage) {
      changed = true;
      updated.stage = candidate.stage;
      updated.status = candidate.stage === 'Rejected' ? 'Rejected'
        : candidate.stage === 'Withdrawn' ? 'Withdrawn'
          : candidate.stage === 'Offer' ? 'Offer Received'
            : candidate.stage === 'Hired' ? 'Hired' : 'Active';
      updated.offer = candidate.stage === 'Offer';
      const body = candidate.feedback?.trim() || STAGE_MESSAGE[candidate.stage] || `Your application moved to ${candidate.stage}.`;
      updates.unshift({
        title: candidate.stage === 'Rejected' ? 'Application Not Selected' : `Moved to ${candidate.stage}`,
        time: 'Just now', body, kind: candidate.stage === 'Rejected' ? 'rejected' : candidate.stage === 'Offer' ? 'offer' : 'progress', at,
      });
      if (candidate.stage === 'Rejected') {
        updated.rejection = candidate.feedback?.trim() || candidate.rejectionReason || STAGE_MESSAGE.Rejected;
        updated.improvements = candidate.missingSkills?.length ? candidate.missingSkills.slice(0, 5) : app.improvements;
      }
      pushNotification('applicant', {
        kind: 'Applications',
        title: `${candidate.stage === 'Rejected' ? 'Application not selected' : 'Status update'} — ${app.title}`,
        route: `/applicant/applications/${app.id}`,
      });
    }

    /* score override by Company Admin */
    if (Number.isFinite(Number(candidate.score)) && Number(candidate.score) !== Number(app.score)) {
      changed = true;
      updated.score = Number(candidate.score);
      updated.scoreOverridden = !!candidate.scoreOverride;
      // DEP-14: the applicant sees that the score was reviewed, never the reason.
      updates.unshift({
        title: 'Score reviewed', time: 'Just now',
        body: candidate.scoreOverride
          ? 'Your score was reviewed by the hiring team. Your original dimension breakdown is still shown below.'
          : `Your match score for this role is now ${candidate.score}%.`,
        kind: 'progress', at,
      });
      pushNotification('applicant', { kind: 'Applications', title: `Score reviewed for ${app.title}`, route: `/applicant/applications/${app.id}` });
    }

    /* interview invitation */
    const invitedAt = candidate.interview?.at;
    if (invitedAt && invitedAt !== app.interviewInvitedAt) {
      changed = true;
      updated.interviewInvitedAt = invitedAt;
      updated.interview = candidate.interview;
      updated.interviewResponse = null;
      updates.unshift({
        title: 'Interview Scheduled', time: 'Just now',
        body: candidate.interview.notes || `${candidate.interview.format || 'Interview'} invitation from the hiring team.`,
        date: candidate.interview.date, slot: `${candidate.interview.time}${candidate.interview.duration ? ` · ${candidate.interview.duration}` : ''}`,
        link: candidate.interview.format === 'Video' ? 'Join via video link' : candidate.interview.format || '',
        kind: 'interview', at,
      });
      pushNotification('applicant', { kind: 'Interviews', title: `Interview scheduled for ${app.title}`, route: `/applicant/applications/${app.id}` });
    }

    /* free-text status update prepared by the recruiter */
    const statusAt = candidate.statusUpdate?.at;
    if (statusAt && statusAt !== app.lastStatusUpdateAt) {
      changed = true;
      updated.lastStatusUpdateAt = statusAt;
      updates.unshift({ title: `Message from the hiring team`, time: 'Just now', body: candidate.statusUpdate.message, kind: 'progress', at });
      pushNotification('applicant', { kind: 'Applications', title: `New message about ${app.title}`, route: `/applicant/applications/${app.id}` });
    }

    updated.updates = updates;
    return updated;
  });

  if (changed) saveApplications(next);
  return next;
}

/* When a job is closed / deleted, close its live applications. */
export function syncApplicationsWithJobs(jobs = getJobs()) {
  const closedIds = new Set(jobs.filter(j => j.status === 'Closed').map(j => String(j.id)));
  if (!closedIds.size) return;
  const applications = getApplications();
  let changed = false;
  const next = applications.map(app => {
    if (!closedIds.has(String(app.jobId))) return app;
    if (['Closed', 'Rejected', 'Withdrawn', 'Hired'].includes(app.status)) return app;
    changed = true;
    pushNotification('applicant', { kind: 'Applications', title: `The posting for ${app.title} was closed`, route: `/applicant/applications/${app.id}` });
    return {
      ...app, status: 'Closed', stage: 'Closed',
      updates: [{ title: 'Posting Closed', time: 'Just now', body: STAGE_MESSAGE.Closed, kind: 'rejected', at: nowISO() }, ...(app.updates || [])],
    };
  });
  if (changed) saveApplications(next);
}

/* ------------------------------------------- applicant -> ATS: reactions */
/* PATCH /api/applications/:id/withdraw */
export function withdrawApplication(applicationId, reason = '') {
  const at = nowISO();
  const applications = getApplications();
  const app = applications.find(a => String(a.id) === String(applicationId));
  if (!app) return false;

  saveApplications(applications.map(a => String(a.id) === String(applicationId)
    ? {
      ...a, stage: 'Withdrawn', status: 'Withdrawn', withdrawnAt: at, withdrawReason: reason,
      updates: [{ title: 'Application Withdrawn', time: 'Just now', body: reason ? `You withdrew this application — ${reason}.` : 'You withdrew this application.', kind: 'rejected', at }, ...(a.updates || [])],
    }
    : a));

  saveCandidates(getCandidates().map(c => String(c.id) === String(app.candidateId) || String(c.applicationId) === String(app.id)
    ? {
      ...c, stage: 'Withdrawn', applicationStage: 'Withdrawn', updatedAt: at, withdrawReason: reason,
      activity: [`Application withdrawn by the applicant${reason ? ` — ${reason}` : ''}`, ...(c.activity || [])],
    }
    : c));

  pushNotification('recruiter', { title: 'Application withdrawn', body: `A candidate withdrew from ${app.title}.`, route: '/pipeline' });
  pushNotification('company-admin', { title: 'Application withdrawn', body: `A candidate withdrew from ${app.title}.`, route: '/candidates' });
  return true;
}

/* PATCH /api/applications/:id/interview-response */
export function respondToInterview(applicationId, action) {
  const at = nowISO();
  const applications = getApplications();
  const app = applications.find(a => String(a.id) === String(applicationId));
  if (!app) return false;
  const label = action === 'confirm' ? 'Confirmed interview invitation'
    : action === 'reschedule' ? 'Requested interview reschedule' : 'Declined interview invitation';
  const body = action === 'confirm' ? 'You confirmed the interview invitation.'
    : action === 'reschedule' ? 'You requested a different interview time.' : 'You declined the interview invitation.';
  const status = action === 'confirm' ? 'Confirmed' : action === 'reschedule' ? 'Reschedule Requested' : 'Declined';

  saveApplications(applications.map(a => String(a.id) === String(applicationId)
    ? { ...a, interviewResponse: action, interview: { ...(a.interview || {}), status }, updates: [{ title: label, time: 'Just now', body, kind: 'response', at }, ...(a.updates || [])] }
    : a));

  saveCandidates(getCandidates().map(c => String(c.id) === String(app.candidateId) || String(c.applicationId) === String(app.id)
    ? { ...c, interview: { ...(c.interview || {}), status, respondedAt: at }, activity: [`${label} by the applicant`, ...(c.activity || [])] }
    : c));

  pushNotification('recruiter', { title: 'Interview response', body: `${label} for ${app.title}.`, route: '/pipeline' });
  pushNotification('company-admin', { title: 'Interview response', body: `${label} for ${app.title}.`, route: '/pipeline' });
  return true;
}

/* PUT /api/applicant/profile — recruiters see the refreshed profile data */
export function syncProfileToCandidates(profile = getApplicantProfile()) {
  const candidates = getCandidates();
  if (!candidates.length) return;
  const jobs = getJobs();
  let changed = false;
  const next = candidates.map(c => {
    if (!c.applicationId || (c.applicantEmail && c.applicantEmail !== profile.email)) return c;
    const job = jobs.find(j => String(j.id) === String(c.jobId));
    if (!job) return c;
    changed = true;
    const score = c.scoreOverride ? null : calculateMatchScore(job, profile);
    return {
      ...c,
      name: profile.name || c.name,
      phone: profile.phone || c.phone,
      locationName: profile.location || c.locationName,
      headline: profile.headline || c.headline,
      cv: profile.cv || c.cv,
      yearsExperience: yearsOfExperience(profile),
      ...(score ? {
        score: score.total, skills: score.dimensions.skills, experience: score.dimensions.experience,
        education: score.dimensions.education, location: score.dimensions.location,
        matchedSkills: score.matchedSkills, missingSkills: score.missingSkills,
      } : {}),
    };
  });
  if (changed) saveCandidates(next);
}

/* Applications belonging to the signed-in applicant. */
export function myApplications(profile = getApplicantProfile()) {
  const all = getApplications();
  return all.filter(a => !a.applicantEmail || a.applicantEmail === profile.email);
}

export function hasApplied(jobId, profile = getApplicantProfile()) {
  return myApplications(profile).some(a => String(a.jobId) === String(jobId));
}

export { yearsOfExperience };

/* ===========================================================================
 * PLATFORM LAYER — Super Admin
 * ---------------------------------------------------------------------------
 * The Super Admin portal is a platform-level view over the same store. In the
 * demo there is exactly one real tenant (the workspace in this browser) plus a
 * few seeded tenants so the tables are not empty. Every function here maps to
 * a platform endpoint in BACKEND-INTEGRATION.md §7.9.
 * ======================================================================== */

export const PLATFORM_KEYS = {
  tenants: 'hirely_platform_tenants',
  skillLibrary: 'hirely_skill_library',
  dfsConfig: 'hirely_dfs_config',
  featureFlags: 'hirely_feature_flags',
  platformAnnouncements: 'hirely_platform_announcements',
  auditLog: 'hirely_audit_log',
  aiUsage: 'hirely_ai_usage',
  announcements: 'hirely_announcements',
  team: 'hirely_team',
  reportedIssues: 'hirely_reported_issues',
  recruiterIssues: 'hirely_recruiter_reported_issues',
  applicantAccount: 'hirely_applicant_account',
  platformTeam: 'hirely_platform_team',
  planCatalog: 'hirely_plan_catalog',
};

export const LOCAL_TENANT_ID = 'tenant-local';
const PLANS = ['Starter', 'Growth', 'Enterprise'];

/* ---- tenants ---- */
const SEED_TENANTS = [
  { id: 'tenant-nexatech', name: 'NexaTech Solutions', industry: 'Fintech', email: 'admin@nexatech.com', website: 'www.nexatech.com', size: '201-500', plan: 'Enterprise', seatLimit: 500, seatsUsed: 482, joined: 'Oct 12, 2023', status: 'Active', jobs: 34, applications: 1820, users: 482, mrr: 999 },
  { id: 'tenant-aiglobal', name: 'AI Global Corp', industry: 'Artificial Intelligence', email: 'admin@aiglobal.com', website: 'www.aiglobal.com', size: '51-200', plan: 'Growth', seatLimit: 50, seatsUsed: 24, joined: 'Jan 05, 2024', status: 'Trial', jobs: 12, applications: 430, users: 24, mrr: 129 },
  { id: 'tenant-zylker', name: 'Zylker Media Group', industry: 'Media', email: 'admin@zylkermedia.com', website: 'www.zylkermedia.com', size: '11-50', plan: 'Starter', seatLimit: 10, seatsUsed: 10, joined: 'Nov 22, 2022', status: 'Suspended', jobs: 3, applications: 96, users: 10, mrr: 49 },
  { id: 'tenant-ecolife', name: 'EcoLife Retailers', industry: 'Retail', email: 'admin@ecolife.com', website: 'www.ecolife.com', size: '51-200', plan: 'Enterprise', seatLimit: 250, seatsUsed: 72, joined: 'Mar 15, 2024', status: 'Expired', jobs: 8, applications: 214, users: 72, mrr: 0 },
];

/* ---- plan catalog (Subscriptions page "tier" cards) ----
   Price here is the single source of truth for tenant MRR — editing a
   tier's price on the Subscriptions page changes what every tenant on that
   tier is billed, the same way editing a Feature Flags row changes what
   every tenant on that tier can access. */
const DEFAULT_PLAN_CATALOG = [
  { name: 'Starter', desc: 'Best for early-stage startups', price: '$49', period: '/month', features: ['Up to 10 active jobs', 'Standard AI screening', 'Email support'] },
  { name: 'Growth', desc: 'Optimized for growing MENA agencies', price: '$129', period: '/month', popular: true, features: ['Unlimited active jobs', 'Advanced AI matching score', 'Priority 24/7 support', 'Custom branding'] },
  { name: 'Enterprise', desc: 'Customized for global corporations', price: 'Custom', period: '/annual', features: ['Dedicated instance', 'SLA guarantees', 'White-label portal', 'SSO integration'] },
];
export function getPlanCatalog() {
  const stored = read(PLATFORM_KEYS.planCatalog, null);
  if (stored) return stored;
  write(PLATFORM_KEYS.planCatalog, DEFAULT_PLAN_CATALOG);
  return DEFAULT_PLAN_CATALOG;
}
export function savePlanCatalog(tiers) {
  write(PLATFORM_KEYS.planCatalog, tiers);
  emit('hirely-plans-change');
  logAudit('Plan catalog updated', 'Billing');
}
/* Numeric MRR derived from a tier's display price ("$129" -> 129,
   "Custom" -> 0 unless the tier itself stores a numeric override). */
export function planPrice(name) {
  const tier = getPlanCatalog().find(t => t.name === name);
  const n = parseFloat(String(tier?.price ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
const PLAN_SEATS = { Starter: 5, Growth: 15, Enterprise: 999 };

/* ---- internal Hirely staff (Platform Team page) ----
   Previously local-only component state — a reload or navigating away and
   back reset every edit. Persisting it here is the actual fix: there is no
   other page that reads platform-staff data, so nothing else changes. */
const DEFAULT_PLATFORM_TEAM = [
  { email: 'sarah.f@hirely.com', name: 'Sarah Al-Farsi', role: 'Super Admin', tone: 'indigo', active: '2 mins ago', status: 'Active' },
  { email: 'okhalid@hirely.com', name: 'Omar Khalid', role: 'Super Admin', tone: 'indigo', active: '4 hours ago', status: 'Active' },
  { email: 'l.mansour@hirely.com', name: 'Leila Mansour', role: 'Super Admin', tone: 'indigo', active: '3 days ago', status: 'Inactive' },
  { email: 'h.zaid@hirely.com', name: 'Hassan Zaid', role: 'Super Admin', tone: 'indigo', active: '12 mins ago', status: 'Active' },
];
export function getPlatformTeam() {
  const stored = read(PLATFORM_KEYS.platformTeam, null);
  if (stored) return stored;
  write(PLATFORM_KEYS.platformTeam, DEFAULT_PLATFORM_TEAM);
  return DEFAULT_PLATFORM_TEAM;
}
export function savePlatformTeam(rows) {
  write(PLATFORM_KEYS.platformTeam, rows);
  emit('hirely-platform-team-change');
}

/* The tenant that this browser session actually belongs to, built live from
   the shared store so Super Admin numbers always match the workspace. */
function localTenant() {
  const company = getCompany();
  const jobs = getJobs();
  const applications = getApplications();
  const team = read(PLATFORM_KEYS.team, []) || [];
  const plan = company.plan || 'Growth';
  const seatsUsed = team.filter(m => m.status === 'Active').length || 1;
  const seatLimit = PLAN_SEATS[plan] ?? 15;
  return {
    id: LOCAL_TENANT_ID,
    name: company.name || 'Hirely Tech Hub',
    industry: company.industry || 'Technology',
    email: company.email || localStorage.getItem('hirely_account_email') || 'admin@hirely.io',
    website: company.website || 'www.hirely.io',
    size: company.size || '11-50',
    plan,
    seatLimit,
    seatsUsed,
    joined: company.createdAt || 'This workspace',
    status: company.status || 'Active',
    jobs: jobs.filter(j => !j.deletedAt).length,
    applications: applications.length,
    users: seatsUsed,
    mrr: planPrice(plan),
    isLocal: true,
  };
}

export function getTenants() {
  const stored = read(PLATFORM_KEYS.tenants, null);
  const others = stored || SEED_TENANTS;
  if (!stored) write(PLATFORM_KEYS.tenants, SEED_TENANTS);
  return [localTenant(), ...others.filter(t => t.id !== LOCAL_TENANT_ID)];
}

function saveOtherTenants(list) {
  write(PLATFORM_KEYS.tenants, list.filter(t => t.id !== LOCAL_TENANT_ID));
}

/* PATCH /platform/tenants/:id/status — DEP-01 */
export function setTenantStatus(id, status, reason = '') {
  if (id === LOCAL_TENANT_ID) {
    const company = { ...getCompany(), status, statusReason: reason, statusChangedAt: nowISO() };
    write(KEYS.company, company);
    emit('hirely-company-change');
    pushNotification('company-admin', {
      title: status === 'Suspended' ? 'Account suspended' : 'Account reinstated',
      body: status === 'Suspended'
        ? 'Your company account has been suspended by the platform. Contact support.'
        : 'Your company account has been reinstated. Full access is restored.',
      route: '/dashboard',
    });
    pushNotification('recruiter', {
      title: status === 'Suspended' ? 'Workspace suspended' : 'Workspace reinstated',
      body: status === 'Suspended' ? 'This company workspace is suspended.' : 'Workspace access is restored.',
      route: '/dashboard',
    });
    emit(EVENTS.jobs); // applicants must re-read the board (suspended jobs are hidden)
  } else {
    saveOtherTenants(getTenants().map(t => t.id === id ? { ...t, status } : t));
  }
  logAudit(`Tenant ${id} status set to ${status}${reason ? ` — ${reason}` : ''}`, 'Tenant');
  return true;
}

/* DELETE /platform/tenants/:id — DEP-01 (delete branch) */
export function deleteTenant(id) {
  if (id === LOCAL_TENANT_ID) {
    // Archive everything rather than wiping it: the doc requires data to be
    // preserved for audit while access is removed.
    const at = nowISO();
    saveJobs(getJobs().map(j => ({ ...j, status: 'Closed', archived: true, deletedAt: at })));
    syncApplicationsWithJobs(getJobs());
    write(KEYS.company, { ...getCompany(), status: 'Deleted', deletedAt: at });
    emit('hirely-company-change');
    logAudit('Local tenant archived and deleted', 'Tenant');
    return true;
  }
  saveOtherTenants(getTenants().filter(t => t.id !== id));
  logAudit(`Tenant ${id} deleted`, 'Tenant');
  return true;
}

/* PATCH /platform/tenants/:id/subscription — DEP-02 */
export function overrideTenantPlan(id, plan, reason = '') {
  if (!PLANS.includes(plan)) return false;
  if (id === LOCAL_TENANT_ID) {
    write(KEYS.company, { ...getCompany(), plan, planOverride: { plan, reason, at: nowISO() } });
    emit('hirely-company-change');
    pushNotification('company-admin', {
      title: 'Subscription updated',
      body: `Your subscription has been updated to ${plan}${reason ? ` — ${reason}` : ''}.`,
      route: '/billing',
    });
  } else {
    saveOtherTenants(getTenants().map(t => t.id === id
      ? { ...t, plan, seatLimit: PLAN_SEATS[plan] ?? t.seatLimit, mrr: planPrice(plan) }
      : t));
  }
  logAudit(`Tenant ${id} plan overridden to ${plan}${reason ? ` — ${reason}` : ''}`, 'Billing');
  return true;
}

export function isLocalTenantSuspended() {
  return ['Suspended', 'Deleted'].includes(getCompany()?.status);
}

/* ---- platform users (GET /platform/users) ---- */
export function getPlatformUsers() {
  const company = getCompany();
  const companyName = company.name || 'Hirely Tech Hub';
  const team = (read(PLATFORM_KEYS.team, []) || []).map(m => ({
    id: `u-${m.id}`,
    name: m.name,
    email: m.email,
    role: m.role === 'Admin' ? 'Company Admin' : 'Recruiter',
    company: companyName,
    status: m.status === 'Deactivated' ? 'Inactive' : m.status === 'Pending' ? 'Pending' : 'Active',
    lastActive: m.lastActive || '—',
    tenantId: LOCAL_TENANT_ID,
  }));
  const applicantAccount = read(PLATFORM_KEYS.applicantAccount, null);
  const applicantProfile = getApplicantProfile();
  const applicants = [];
  if (applicantAccount?.email || applicantProfile?.email) {
    applicants.push({
      id: 'u-applicant',
      name: applicantAccount?.name || applicantProfile.name || 'Applicant',
      email: applicantAccount?.email || applicantProfile.email,
      role: 'Applicant',
      company: '—',
      status: 'Active',
      lastActive: 'This session',
      tenantId: null,
    });
  }
  const deactivated = read('hirely_platform_user_status', {}) || {};
  return [...team, ...applicants].map(u => ({ ...u, status: deactivated[u.id] || u.status }));
}

/* PATCH /platform/users/:id/status */
export function setPlatformUserStatus(userId, status) {
  const map = read('hirely_platform_user_status', {}) || {};
  map[userId] = status;
  write('hirely_platform_user_status', map);
  // Mirror back into the company team list so the Company Admin sees it too.
  const team = read(PLATFORM_KEYS.team, []) || [];
  const localId = String(userId).replace(/^u-/, '');
  const next = team.map(m => String(m.id) === localId
    ? { ...m, status: status === 'Inactive' ? 'Deactivated' : 'Active' }
    : m);
  write(PLATFORM_KEYS.team, next);
  emit('hirely-team-change');
  logAudit(`User ${userId} set to ${status}`, 'User');
  return true;
}

/* ---- platform statistics (GET /platform/stats) ---- */
export function getPlatformStats() {
  const tenants = getTenants();
  const jobs = getJobs();
  const applications = getApplications();
  const localUsers = getPlatformUsers().length;
  const sum = (key) => tenants.filter(t => !t.isLocal).reduce((n, t) => n + Number(t[key] || 0), 0);
  const hires = applications.filter(a => a.status === 'Hired' || a.stage === 'Hired').length;
  return {
    tenants: tenants.length,
    activeTenants: tenants.filter(t => t.status === 'Active' || t.status === 'Trial').length,
    suspendedTenants: tenants.filter(t => t.status === 'Suspended').length,
    users: localUsers + sum('users'),
    jobs: jobs.filter(j => !j.deletedAt).length + sum('jobs'),
    openJobs: jobs.filter(j => j.status === 'Open').length,
    applications: applications.length + sum('applications'),
    localApplications: applications.length,
    hires,
    mrr: tenants.reduce((n, t) => n + Number(t.mrr || 0), 0),
    planSplit: PLANS.map(p => ({ plan: p, count: tenants.filter(t => t.plan === p).length })),
  };
}

/* ---- skill library (GET/PUT /platform/skills) — feeds Job Form + applicant profile ---- */
const DEFAULT_SKILLS = [
  { name: 'Technology & Engineering', skills: ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'REST APIs', 'SQL', 'PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 'Git'] },
  { name: 'Business & Finance', skills: ['Financial Modeling', 'Strategic Planning', 'Budgeting', 'Risk Management'] },
  { name: 'Design', skills: ['Figma', 'UI/UX Design', 'Design Systems', 'User Research', 'Prototyping'] },
  { name: 'Soft Skills', skills: ['Leadership', 'Communication', 'Conflict Resolution', 'Teamwork'] },
];

export function getSkillLibrary() {
  const stored = read(PLATFORM_KEYS.skillLibrary, null);
  if (stored) return stored;
  write(PLATFORM_KEYS.skillLibrary, DEFAULT_SKILLS);
  return DEFAULT_SKILLS;
}
export function saveSkillLibrary(categories) {
  write(PLATFORM_KEYS.skillLibrary, categories);
  emit('hirely-skills-change');
  logAudit('Global skill library updated', 'Configuration');
}
/* Flat list used by the job form and the applicant profile as suggestions. */
export function listSkills() {
  return [...new Set(getSkillLibrary().flatMap(c => c.skills))];
}

/* ---- DFS defaults (GET/PUT /platform/dfs-config) ---- */
export const FACTORY_DFS = { skills: 40, experience: 30, education: 15, location: 15 };
export function getDFSDefaults() {
  const stored = read(PLATFORM_KEYS.dfsConfig, null);
  return stored?.weights ? stored.weights : FACTORY_DFS;
}
export function saveDFSDefaults(weights) {
  const total = Object.values(weights).reduce((a, b) => a + Number(b || 0), 0);
  if (total !== 100) return { error: 'Weights must total exactly 100%.' };
  write(PLATFORM_KEYS.dfsConfig, { weights, updatedAt: nowISO() });
  emit('hirely-dfs-config-change');
  logAudit('Default DFS weights updated', 'Configuration');
  return { weights };
}

/* ---- feature flags per plan (GET/PUT /platform/feature-flags) ---- */
export const FEATURES = [
  { id: 'ai-summary', label: 'AI candidate summary' },
  { id: 'analytics-export', label: 'Analytics export' },
  { id: 'talent-pool', label: 'Talent pool & CRM' },
  { id: 'company-analytics', label: 'Company-wide analytics' },
  { id: 'automation', label: 'Pipeline automation rules' },
];
const DEFAULT_FLAGS = {
  Starter: { 'ai-summary': false, 'analytics-export': false, 'talent-pool': true, 'company-analytics': true, automation: false },
  Growth: { 'ai-summary': true, 'analytics-export': true, 'talent-pool': true, 'company-analytics': true, automation: true },
  Enterprise: { 'ai-summary': true, 'analytics-export': true, 'talent-pool': true, 'company-analytics': true, automation: true },
};
export function getFeatureFlags() {
  const stored = read(PLATFORM_KEYS.featureFlags, null);
  if (stored) return stored;
  write(PLATFORM_KEYS.featureFlags, DEFAULT_FLAGS);
  return DEFAULT_FLAGS;
}
export function saveFeatureFlags(flags) {
  write(PLATFORM_KEYS.featureFlags, flags);
  emit('hirely-flags-change');
  logAudit('Feature flags updated', 'Configuration');
}
/* Used by the company workspace to hide features the current plan does not include. */
export function isFeatureEnabled(featureId) {
  const plan = getCompany().plan || 'Growth';
  const flags = getFeatureFlags();
  return flags?.[plan]?.[featureId] !== false;
}

/* ---- platform announcements (POST /platform/announcements) ---- */
export function publishPlatformAnnouncement({ title, body, target = 'All companies', scheduledFor = '' }) {
  if (!title?.trim() || !body?.trim()) return { error: 'Title and message are required.' };
  const entry = {
    id: newId('ann'),
    title: title.trim(),
    body: body.trim(),
    target,
    scheduledFor,
    date: today(),
    source: 'Super Admin',
    createdAt: nowISO(),
  };
  write(PLATFORM_KEYS.platformAnnouncements, [entry, ...(read(PLATFORM_KEYS.platformAnnouncements, []) || [])]);
  // Company Admin reads this list on the Announcements page.
  write(PLATFORM_KEYS.announcements, [entry, ...(read(PLATFORM_KEYS.announcements, []) || [])]);
  emit('hirely-announcements-change');
  pushNotification('company-admin', { title: 'Platform announcement', body: entry.title, route: '/announcements' });
  logAudit(`Announcement published — ${entry.title}`, 'Communication');
  return { announcement: entry };
}
export function getPlatformAnnouncements() {
  return read(PLATFORM_KEYS.platformAnnouncements, []) || [];
}

/* ---- support tickets (GET/PATCH /platform/support-tickets) ---- */
export function getSupportTickets() {
  const admin = (read(PLATFORM_KEYS.reportedIssues, []) || []).map(t => ({ ...t, reporterRole: 'Company Admin' }));
  const recruiter = (read(PLATFORM_KEYS.recruiterIssues, []) || []).map(t => ({ ...t, reporterRole: 'Recruiter' }));
  return [...admin, ...recruiter].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
export function updateSupportTicket(id, patch) {
  let found = false;
  [PLATFORM_KEYS.reportedIssues, PLATFORM_KEYS.recruiterIssues].forEach(key => {
    const list = read(key, []) || [];
    if (!list.some(t => t.id === id)) return;
    found = true;
    write(key, list.map(t => t.id === id ? { ...t, ...patch, updatedAt: nowISO() } : t));
    const target = key === PLATFORM_KEYS.reportedIssues ? 'company-admin' : 'recruiter';
    pushNotification(target, { title: `Report ${id} updated`, body: `Status: ${patch.status || 'updated'}.`, route: '/support/reports' });
  });
  if (found) logAudit(`Support ticket ${id} updated`, 'Support');
  return found;
}

/* ---- audit log (GET /platform/audit-log) ---- */
export function logAudit(action, type = 'Action') {
  const list = read(PLATFORM_KEYS.auditLog, []) || [];
  write(PLATFORM_KEYS.auditLog, [{
    id: newId('log'), action, type, actor: 'Super Admin',
    time: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    at: nowISO(),
  }, ...list].slice(0, 200));
}
export function getAuditLog() {
  return read(PLATFORM_KEYS.auditLog, []) || [];
}

/* ---- AI / DFS usage (GET /platform/ai-usage) ---- */
export function recordAiCall(kind = 'dfs-score') {
  const usage = read(PLATFORM_KEYS.aiUsage, { calls: 0, byKind: {}, history: [] }) || {};
  const byKind = { ...(usage.byKind || {}) };
  byKind[kind] = (byKind[kind] || 0) + 1;
  write(PLATFORM_KEYS.aiUsage, {
    calls: Number(usage.calls || 0) + 1,
    byKind,
    history: [{ kind, at: nowISO() }, ...(usage.history || [])].slice(0, 200),
  });
}
export function getAiUsage() {
  const usage = read(PLATFORM_KEYS.aiUsage, { calls: 0, byKind: {}, history: [] }) || {};
  const monthlyLimit = 5000;
  const costPerCall = 0.0021;
  return {
    ...usage,
    calls: Number(usage.calls || 0),
    monthlyLimit,
    cost: Number((Number(usage.calls || 0) * costPerCall).toFixed(2)),
    usagePercent: Math.min(100, Math.round((Number(usage.calls || 0) / monthlyLimit) * 100)),
  };
}
