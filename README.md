# Hirely Frontend

This project contains the Company Admin and Recruiter experiences in the same Hirely frontend project.

## Run

```bash
npm install
npm run dev
```

## Login

The login screen uses one shared sign-in page with a demo role selector.

Recruiter demo credentials:
- Email: `omar.ashraf@hirely.io`
- Password: `password`

Company Admin credentials are the ones created during Company Setup, or the existing demo account stored by the frontend.

## Recruiter scope

The Recruiter role is intentionally limited to recruiter responsibilities:

- Dashboard for assigned jobs and candidates
- My Jobs
- Create, edit, duplicate, publish, pause, resume and close assigned jobs
- DFS weights and pipeline automation settings
- Candidate list and candidate comparison
- Pipeline for assigned jobs only
- Move stage, bulk move, bulk reject and archive/remove
- Candidate DFS breakdown
- Internal notes and tags
- Shortlist, move stage, reject, schedule interview and mark hired
- No DFS score override
- Personal Talent Pool with search, filters, tags and Add to Pipeline
- No Talent Pool delete action
- Recruiter-only analytics for assigned jobs
- No company-wide analytics, employer brand metrics or analytics export
- Recruiter profile with editable name, phone and job title
- Recruiter email remains read-only
- Notification preferences
- No Team, Billing, Company Settings or Company Admin-only navigation

## Shared architecture

Company Admin and Recruiter use the same frontend project, routes, components and local demo state.

The login selects the demo role and routes both roles into the same workspace. Recruiter data is scoped by assigned/owned jobs. Company Admin keeps company-wide access.

In the real backend integration, the role should come from authentication rather than a manually selected role.

## AI

No new AI implementation was added to the Recruiter role. The AI integration can be connected later by the AI teammate without changing the Recruiter role structure.

## Frontend demo behavior

The current project uses local React state and localStorage for the demo. Backend/API persistence can be connected later to the existing UI actions.

## Recruiter validation pass

The Recruiter flow was reviewed against the supplied ATS use cases and role-dependency documents. The current frontend supports scoped jobs, scoped pipeline, candidate evaluation, shortlist, rejection with reason and optional feedback, interview scheduling, status updates, candidate notes/tags, CV preview placeholder, recruiter-only analytics, personal talent pool, and recruiter role restrictions. DFS override remains Company Admin only.

The Talent Pool Add to Pipeline flow is restricted to active jobs in the current role scope. Pipeline candidate movement records the acting role in the activity log.

AI Summary and CV/backend file services remain integration placeholders for the backend/AI teammates.

## Final UI fixes

- Recruiter and Company Admin notifications use separate localStorage data.
- Recruiter My Jobs scope banner is visually separated from the admin UI.
- Candidate Stage filtering includes every stage configured in the selected jobs' pipelines.
- Recruiter Talent Pool Add to Pipeline is scoped to active recruiter jobs. Company Admin keeps the original Sourced and Future / other role flow.
- Recruiter sidebar uses Report a Problem instead of a duplicate My Profile entry. Profile settings remains in the bottom utility area.
- Login and Forgot Password branding switches between Company Admin purple and Recruiter blue.
- Candidate detail Profile, CV, Notes and Activity tabs now have consistent styling for both roles.
- Company Admin Analytics was restored to the original Company Analytics layout.
- Shortlist action is available to Recruiters and is hidden from Company Admin candidate actions.


## v7 fixes
- Recruiter My Reports is no longer redirected to Dashboard and uses recruiter-specific report storage.
- Company Admin Pipeline supports All Jobs Kanban view.
- Recruiter Talent Pool Add to Pipeline closes correctly after adding and is scoped to active assigned jobs.


## v8 updates
- Company Admin sidebar keeps Profile settings only and removes duplicate My Profile.
- Company Analytics uses the Company Admin analytics layout.
- Talent Pool prevents duplicate saves and duplicate pipeline entries.
- Candidates and Candidate Details support Save to talent pool for both roles.

Validation review update v11
- Recruiter Analytics now includes reporting-period control, recruiter-scoped applicants, conversion rate, average DFS, hiring funnel, score distribution, time-to-hire trend, stage drop-off, and assigned-job performance.
- Company Admin Analytics keeps the existing Company Admin visual layout and adds functional job scope and reporting-period controls.
- Talent Pool duplicate protection remains role-safe for Company Admin and Recruiter.
- Demo candidate and talent-pool storage is reset once under the v11 clean-data marker.
- AI remains a frontend integration placeholder only.

## v12 — Applicant linked to Company Admin & Recruiter

The Applicant portal is no longer a standalone demo. All three roles now share one dataset
through `src/services/hirelyBridge.js`:

- Applicants browse the real job board published by Company Admin / Recruiter (`Open`,
  `Screening`, `Interview`, `Assessment`). Drafts, paused and closed jobs are hidden, and
  only `Open` jobs accept applications.
- The match score shown to the applicant is the job's own DFS weights applied to the
  applicant profile — the same number and the same four dimensions the recruiter sees.
- Submitting an application creates the candidate record in Candidates + Pipeline, increments
  the job's applicant counter, runs the job's auto-advance / auto-reject rules, and notifies
  both the Company Admin and the job's recruiter.
- Recruiter and Company Admin actions (stage move, rejection with reason and feedback,
  interview scheduling, status update, DFS override) appear in the applicant's timeline and
  notifications.
- Applicant actions (withdraw, confirm / reschedule / decline an interview) update the
  candidate record and notify the workspace.
- Updating the applicant profile or CV recalculates the score on live applications unless a
  Company Admin override exists. Closing a job closes its live applications.

Demo path: sign in as Applicant → apply to a job → sign in as Recruiter → the candidate is in
Candidates and Pipeline → move the stage or schedule an interview → sign back in as Applicant
and the update is in My Applications.

`BACKEND-INTEGRATION.md` holds the full data model, permission matrix, scoring formula, event
map and API contract for the backend team.

## v13 — Super Admin merged in: all four roles linked

The Super Admin portal (previously a separate CRA project) now lives in this same
frontend under `src/superadmin/` and shares the store with the other three roles.

Sign in at `/login` — the role selector has four options:

| Role | Demo credentials |
|---|---|
| Super Admin | `nadia@hirely.com` / `password` |
| Company Admin | the account created in Company Setup, or the stored demo admin |
| Recruiter | `omar.ashraf@hirely.io` / `password` |
| Applicant | create an account from the Applicant tab |

What the Super Admin now actually controls:

- **Companies** — live tenant list with real job, application and seat counts.
  Suspending locks the Company Admin and Recruiter out and hides that company's
  jobs from Browse Jobs; deleting archives jobs and applications and notifies
  applicants in active stages.
- **Subscriptions** — a plan override updates the company's Billing page, its seat
  limit and its feature flags, and notifies the admin.
- **Feature Flags** — the five flags are enforced: AI summary, analytics export,
  talent pool, company analytics and pipeline automation appear or disappear in
  the company workspace according to the tenant's tier.
- **DFS Configuration** — the saved weight template becomes the default every new
  job starts from, and the table lists the real per-job weights in use.
- **Skill Library** — the global list job requirements and applicant profile skills
  autocomplete from.
- **Announcements** — publishing delivers to the Company Admin Announcements page
  with a notification.
- **Reported Issues** — the real tickets submitted from "Report a Problem"; a status
  change notifies the reporter and shows on their My Reports page.
- **Dashboard / Analytics / AI Monitor / Users / Audit Log** — all derived from the
  shared data. The AI Monitor counter increments on every CV parse and DFS run.

### Styling note

The Super Admin pages use Tailwind utilities plus their own stylesheet. Tailwind is
installed locally (no CDN) and configured in `tailwind.config.js` with
`preflight: false` and `important: '.superadmin-root'`, and the portal's own CSS is
scoped under the same class — so none of it can leak into the Company Admin,
Recruiter or Applicant portals.

### Validation pass

Checked against the Role Dependency Map (DEP-01 … DEP-20), the ATS use cases and the
features/user-flows document. The behaviour corrections that came out of that pass
are listed in `BACKEND-INTEGRATION.md` §12.
