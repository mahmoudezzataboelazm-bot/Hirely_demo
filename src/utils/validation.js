export const VALIDATION_RULES = {
  job: {
    dfsTotal: 100,
    autoRejectMustBeBelowAutoAdvance: true,
    requiredFields: ["title", "description", "skills"],
  },
  recruiterInvite: {
    emailRequired: true,
    tokenExpiryHours: 72,
    setupPasswordMinLength: 8,
    standardRegistrationAllowed: false,
  },
  scoreOverride: {
    min: 0,
    max: 100,
    reasonRequired: true,
    companyAdminOnly: true,
  },
  talentPool: {
    saveAllowed: ["company-admin", "recruiter"],
    deleteAllowed: ["company-admin"],
  },
  application: {
    oneApplicationPerJobPosting: true,
    screeningAnswersAffectDFS: false,
    withdrawalCanReapplyToSamePosting: false,
  },
};

export const isValidEmail = value => /^\S+@\S+\.\S+$/.test(value || "");
export const isValidScore = value => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
export const weightsTotal = weights => Object.values(weights || {}).reduce((sum, value) => sum + Number(value || 0), 0);
export const can = (role, action) => ({
  "company-admin": ["job:publish", "job:delete", "score:override", "team:manage", "talent:delete", "analytics:all"],
  recruiter: ["job:publish", "candidate:manage", "talent:save", "analytics:own"],
  applicant: ["job:browse", "application:submit", "profile:update"],
  "super-admin": ["tenant:manage", "analytics:platform", "ai:monitor"],
}[role] || []).includes(action);


// Applicant-side validation helpers (front-end demo; backend must enforce these too).
export const applicantProfileCompleteness = profile => {
  const checks = [
    !!profile?.name?.trim(), !!profile?.phone?.trim(), !!profile?.location?.trim(),
    !!profile?.headline?.trim(), !!profile?.bio?.trim(),
    Object.values(profile?.skills || {}).some(items => Array.isArray(items) && items.some(x => String(x).trim())),
    (profile?.experience || []).some(x => x?.title?.trim() && x?.company?.trim()),
    (profile?.education || []).some(x => x?.degree?.trim() && x?.school?.trim()),
    !!profile?.cv,
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
};

export const validateApplicantProfileStep = (profile, step) => {
  if (step === 1) return !!(profile?.name?.trim() && profile?.phone?.trim() && profile?.location?.trim() && profile?.headline?.trim());
  if (step === 2) return Object.values(profile?.skills || {}).some(items => Array.isArray(items) && items.some(x => String(x).trim()));
  if (step === 3) return !(profile?.experience || []).some(x => !x?.title?.trim() || !x?.company?.trim());
  if (step === 4) return (profile?.education || []).some(x => x?.degree?.trim() && x?.school?.trim());
  return false;
};

export const canWithdrawApplication = application => !!application && !['Rejected', 'Withdrawn', 'Hired', 'Offer'].includes(application.stage);
export const hasAppliedToPosting = (applications, jobId) => (applications || []).some(a => String(a.jobId) === String(jobId));
