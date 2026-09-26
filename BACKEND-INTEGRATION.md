# Hirely — Backend Integration Contract

**Version:** 2.1 · **Audience:** backend team · **Frontend:** all four roles linked (`hirely_linked_roles_v1`)

Validated against *Hirely Role Dependency Map* (DEP-01 … DEP-20), *ATS System Use Cases*, *Hirely Features & User Flows* and *SYSTEM FEATURES*. Where a document and the previous build disagreed, the document wins; the corrections are listed in §12.

*v2.1 note: the frontend since v2.0 added a marketing landing page (`/`, static, no data), fixed a runtime crash on the Pipeline board, restyled several auth screens, and made the Subscriptions tier editor and Platform Team page write to real, persisted data instead of local-only mock state. None of that changed the data model except one addition: `platform_staff` in §2.8, which wasn't previously documented.*

This document is the single reference the backend needs to start. It describes the data
model, the API surface, the scoring formula and the events that the frontend already
implements against a local demo store. Every frontend call goes through one module:

```
src/services/hirelyBridge.js
```

Each exported function in that file is a **stand-in for exactly one endpoint**. To go live,
replace the body of each function with an HTTP call and keep the same signature and return
shape — no UI component changes.

---

## 1. Architecture

Four role experiences, one dataset:

| Portal | Roles | Routes |
|---|---|---|
| Platform | `super-admin` | `/super-admin` (Companies, Users, Subscriptions, Analytics, AI Monitor, Feature Flags, DFS Config, Skill Library, Announcements, Reported Issues, Audit Log) |
| Workspace | `company-admin`, `recruiter` | `/dashboard`, `/jobs`, `/pipeline`, `/candidates`, `/analytics`, `/talent-pool`, `/team`, `/billing` |
| Applicant portal | `applicant` | `/applicant/browse`, `/applicant/jobs/:id`, `/applicant/apply/:id`, `/applicant/applications`, `/applicant/profile` |

The platform layer sits **above** tenancy: the Super Admin is not a member of any
tenant and must never be scoped by `company_id`. Everything else is tenant-scoped
and must be filtered by `company_id` on every single query.

The key design rule: **an application and a candidate are the same row seen from two sides.**

```
Job (created by company-admin / recruiter)
 └── Application (created by applicant)
      ├── applicant view  → stage, score breakdown, timeline, interview invitation
      └── recruiter view  → candidate card, pipeline stage, notes, tags, DFS override
```

Join keys: `application.id === candidate.application_id`, `application.candidate_id === candidate.id`.
In the database these should be **one table** (`applications`) with two read projections.

---

## 2. Entities

### 2.1 `companies`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| industry | text | |
| size | text | `1-10`, `11-50`, `51-200`, `200+` |
| logo_url | text | nullable |
| plan | enum | `Starter`, `Growth`, `Enterprise` |
| created_at | timestamptz | |

### 2.2 `users`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | null for applicants |
| name, email, phone | text | email unique |
| password_hash | text | |
| role | enum | `super-admin`, `company-admin`, `recruiter`, `applicant` |
| title | text | job title inside the company |
| status | enum | `Active`, `Pending`, `Deactivated` |
| invited_at, accepted_at, last_active_at | timestamptz | |

> The frontend currently derives the role from `localStorage.hirely_role`.
> **In production the role must come from the JWT only.** Remove the client role switch.

### 2.3 `jobs`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| created_by, assigned_to | uuid FK users | recruiter scoping depends on these |
| title, department, location, type | text | type: `Full-time`, `Part-time`, `Contract`, `Internship` |
| salary_range | text | free text in the current UI |
| description | text | |
| requirements | text[] | required skills, drives the DFS skills dimension |
| status | enum | `Draft`, `Open`, `Paused`, `Closed` |
| deadline | date | nullable |
| weights | jsonb | `{skills, experience, education, location}` — **must total 100** |
| pipeline | text[] | ordered stage names, configurable per job |
| stage_automation | jsonb | `{ "<stage>": { action: "None"\|"Auto-advance"\|"Auto-reject", threshold: 0-100 } }` |
| auto_advance, auto_reject | int | global thresholds; `auto_reject < auto_advance` enforced |
| auto_notify | bool | send status emails to the applicant |
| applicants_count | int | denormalised counter |
| created_at, deleted_at | timestamptz | soft delete |

**Validation on publish** (already enforced in the UI, must be re-enforced server side):
title, description, ≥1 requirement, weights total exactly 100, `auto_reject < auto_advance`.

### 2.4 `applicant_profiles`
| Field | Type | Notes |
|---|---|---|
| user_id | uuid PK FK | |
| headline, bio, location, phone, photo_url | text | |
| skills | jsonb | `{expert:[], intermediate:[], beginner:[]}` — levels affect scoring |
| experience | jsonb[] | `{title, company, period, description}` |
| education | jsonb[] | `{degree, school, period}` |
| cv_file_id | uuid FK files | |
| completeness | int | computed 0-100 |

### 2.5 `applications` (the linked entity)
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| job_id, applicant_id | uuid FK | unique together — one application per applicant per posting |
| stage | text | must exist in `jobs.pipeline` or be a terminal stage |
| status | enum | `Active`, `Rejected`, `Withdrawn`, `Offer Received`, `Hired`, `Closed`, `Archived` |
| score | int 0-100 | current DFS |
| original_score | int | pre-override value |
| score_override | jsonb | `{score, reason, by_user_id, at}` — company-admin only |
| dim_skills, dim_experience, dim_education, dim_location | int 0-100 | breakdown, shown to both sides |
| matched_skills, missing_skills | text[] | missing skills power "Areas for improvement" |
| answers | jsonb | screening question answers |
| cv_file_id | uuid FK | snapshot of the CV at submission time |
| feedback, rejection_reason | text | shown to the applicant when rejected |
| owner_id | uuid FK | recruiter who owns the candidate |
| source | text | `Applicant portal`, `Talent pool`, `Manual` |
| submitted_at, updated_at, withdrawn_at, archived_at | timestamptz | |

### 2.6 `application_events` (timeline / activity log)
One append-only table feeds **both** the recruiter activity tab and the applicant timeline.

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| application_id | uuid FK | |
| type | enum | see §6 |
| actor_type | enum | `applicant`, `recruiter`, `company-admin`, `system` |
| actor_id | uuid | null for `system` |
| visible_to_applicant | bool | recruiter-internal notes stay false |
| title, body | text | |
| payload | jsonb | interview details, old/new stage, threshold, etc. |
| created_at | timestamptz | |

### 2.7 Supporting tables
`interviews` (application_id, format, date, time, duration, notes, link, status `Pending|Confirmed|Reschedule Requested|Declined`, created_by, responded_at) ·
`candidate_notes` (application_id, author_id, body) ·
`candidate_tags` (application_id, tag) ·
`talent_pool` (company_id, owner_id, candidate_ref, tags[]) ·
`notifications` (user_id, kind, title, body, route, read, created_at) ·
`announcements` · `invitations` · `support_tickets` · `files`.

---

### 2.8 Platform entities (Super Admin)

`tenants` — one row per company. In practice this is the `companies` table plus
platform-only columns:

| Field | Type | Notes |
|---|---|---|
| status | enum | `Active`, `Trial`, `Suspended`, `Expired`, `Deleted` |
| status_reason, status_changed_by, status_changed_at | text / uuid / ts | audit trail for DEP-01 |
| seat_limit, seats_used | int | seat_limit derives from the plan |
| plan_override | jsonb | `{plan, reason, by_user_id, at}` — DEP-02 |
| joined_at, deleted_at | timestamptz | soft delete: data archived, never erased |

`plans` (id, name, price, period, seat_limit, features[], active) — the tiers the
Super Admin edits; a tenant references one. Note: `price` is not display copy —
it is read at request time to compute every tenant's MRR (`getPlatformStats().mrr`,
each row in `GET /platform/tenants`), so editing it changes billing numbers
immediately, the same way editing `feature_flags` changes access immediately.
The Subscriptions page's tier editor and the Feature Flags page are two UI
entry points onto the *same* `feature_flags` rows — the backend needs one
source of truth, not two.

`platform_staff` — Hirely's own internal operators (the Super Admin's "Platform
Team" page: e.g. "Sarah Al-Farsi", role `Super Admin`, status `Active`/`Inactive`).
These are `users` rows with `role = super-admin` and `company_id = null`, not a
separate table — `GET /platform/users` already returns tenant-side users, so add
`role=super-admin` to that same endpoint's filter rather than building a new one.
Actions on this page: invite (create a `super-admin` user, `Active`), deactivate/
reactivate (`PATCH .../status`), remove (hard delete — there is no tenant data to
orphan, unlike deactivating a recruiter). At least one active Super Admin must
always remain; the frontend already blocks removing/deactivating the last one.

`feature_flags` (plan_name, feature_id, enabled) — enforced per tier. Feature ids
currently gated by the frontend: `ai-summary`, `analytics-export`, `talent-pool`,
`company-analytics`, `automation`. Turning one off must remove the feature for
every tenant on that tier on the next request.

`skills` (id, category, name, active) — the global skill library. Job requirements
and applicant profile skills both autocomplete from it, and CV parsing maps to it.

`dfs_config` (id, weights jsonb, updated_by, updated_at) — the platform default
weight template new jobs start from. A job's own weights always win.

`platform_announcements` (id, title, body, target, scheduled_for, status, created_by)
— target is `All companies`, a tier, or one company. Publishing fans out to the
targeted company admins as an announcement plus a notification.

`support_tickets` (id, tenant_id, reporter_id, reporter_role, type, priority,
description, attachment_id, status `Open|In Progress|Escalated|Resolved`,
created_at, updated_at) — written by the company workspace "Report a Problem"
form, triaged by the Super Admin; status changes notify the reporter.

`platform_audit_log` (id, actor_id, action, type, target_type, target_id, payload,
created_at) — every platform action. Append-only, never editable.

`ai_usage` (id, tenant_id, kind `cv-parse|dfs-score|summary`, tokens, cost, created_at)
— one row per AI/DFS call, aggregated for the AI Monitor page and the daily budget
alert (DEP-18).

## 3. Roles & permissions

| Capability | Super Admin | Company Admin | Recruiter | Applicant |
|---|:--:|:--:|:--:|:--:|
| Platform organisations & monitoring | ✅ | — | — | — |
| Company settings, billing, team | — | ✅ | — | — |
| Create / edit / publish jobs | — | ✅ all | ✅ assigned only | — |
| Delete job | — | ✅ | — | — |
| Pause / resume / close job | — | ✅ all | ✅ assigned only | — |
| View candidates | — | ✅ company-wide | ✅ assigned jobs only | — |
| Move stage, bulk actions, reject, archive | — | ✅ | ✅ assigned | — |
| Schedule interview, send status update | — | ✅ | ✅ | — |
| **DFS score override** | — | ✅ | ❌ | — |
| Talent pool save / add to pipeline | — | ✅ | ✅ personal | — |
| Talent pool delete | — | ✅ | ❌ | — |
| Analytics | platform | company-wide + export | own assigned jobs only | — |
| Browse jobs, apply, withdraw | — | — | — | ✅ |
| Respond to interview invitation | — | — | — | ✅ |
| Edit own profile / CV | — | ✅ | ✅ (email read-only) | ✅ |

**Recruiter scoping rule (server side):**
`jobs WHERE assigned_to = :me OR created_by = :me`, and applications belonging to those jobs.
The current frontend scopes by recruiter **name**; the backend must scope by **user id**.

---

## 4. Scoring contract (DFS — Dynamic Fit Score)

Implemented in `hirelyBridge.calculateMatchScore(job, profile)`. The backend must reproduce
it exactly so both portals show the same number.

```
DFS = Σ(dimension_value × dimension_weight) / Σ(weights)
```

Weights come from `jobs.weights` (default `{skills:40, experience:30, education:15, location:15}`).

**Skills (0-100)** — for each entry in `jobs.requirements`, find the best match in the
applicant's skills (exact, or either string contains the other). Matched skills score by level:
`expert = 100`, `intermediate = 80`, `beginner = 60`; unmatched = `0`.
Dimension = average across all required skills. No requirements → `70`.

**Experience (0-100)** — parse years from each `experience[].period` (`"Jan 2021 — Present"`
→ 2021 → current year; an unparseable entry with a title counts as 1 year). Required years
come from `jobs.min_experience` if set, otherwise inferred from the title:
principal/head/director `8`, senior/lead `5`, junior/intern/entry/graduate `0`, else `3`.
Dimension = `clamp(round(have / need × 100), 20, 100)`; need = 0 → `100`.

**Education (0-100)** — PhD `100`, Master/MSc/MBA `95`, Bachelor/BSc `85`,
other entry `70`, no education `40`.

**Location (0-100)** — job remote/blank `100`; same city `100`; same country `80`;
different `50`; applicant location missing `60`.

The four dimension values are stored on the application and rendered as the score bars in
both the recruiter candidate panel and the applicant evaluation page.

**Recalculation triggers:** application created · applicant profile or CV updated (unless a
manual override exists) · job weights or requirements edited. A manual override
(`score_override`) freezes the score until it is cleared.

---

## 5. Automation rules

Evaluated on application creation and on every stage change, in this order:

1. `stage_automation[current_stage].action === "Auto-reject"` and `score <= threshold`
   → stage `Rejected`, system event.
2. `stage_automation[current_stage].action === "Auto-advance"` and `score >= threshold`
   → move to the next stage in `jobs.pipeline`, system event.
3. Global fallback: `score < auto_reject` → `Rejected`; `score > auto_advance` → `Shortlisted`.

Every automatic decision writes an `application_event` with `actor_type = system` and the
threshold in the payload, so both sides can see why it happened.

---

## 6. Event → notification map

| Event type | Trigger | Applicant sees | Recruiter / Admin sees |
|---|---|---|---|
| `application.submitted` | applicant applies | "Application Received" | "New candidate applied" |
| `application.auto_decision` | automation rule fires | progress / rejection entry | activity log line |
| `application.stage_changed` | recruiter moves stage | "Moved to X" + template message | pipeline update |
| `application.score_overridden` | company-admin override | "Score updated" | activity log line |
| `application.rejected` | recruiter rejects | reason + optional feedback + missing skills | activity log line |
| `application.status_message` | recruiter sends status update | message in timeline | activity log line |
| `interview.scheduled` | recruiter schedules | invitation card with Confirm / Reschedule / Decline | "Interview scheduled" |
| `interview.responded` | applicant responds | confirmation entry | "Interview response" |
| `application.withdrawn` | applicant withdraws | "Application Withdrawn" | "Application withdrawn" |
| `job.closed` | job closed or deleted | "Posting Closed" | — |
| `note.added` / `tag.added` | recruiter | ❌ internal only | activity log line |

Only events with `visible_to_applicant = true` reach the applicant. Recruiter notes and tags
must never be exposed.

---

## 7. API surface

Base: `/api/v1` · Auth: `Authorization: Bearer <JWT>` · JSON · timestamps ISO-8601 UTC.

### 7.1 Auth
```
POST   /auth/register/company      { company, adminName, email, password }  -> { token, user, company }
POST   /auth/register/applicant    { name, email, password }                -> { token, user }
POST   /auth/login                 { email, password }                      -> { token, user }
POST   /auth/forgot-password       { email, role }
POST   /auth/reset-password        { token, password }
POST   /auth/invitations/:token/accept { name, password }                   -> { token, user }
GET    /auth/me                                                             -> { user, company, permissions[] }
```
The JWT carries `{ sub, role, company_id }`. The frontend must read the role from `/auth/me`,
not from local storage.

### 7.2 Jobs — workspace
```
GET    /jobs?status=&q=&page=&scope=mine|company     -> paginated jobs (recruiter forced to scope=mine)
POST   /jobs                                          -> create (Draft or Open)
GET    /jobs/:id
PATCH  /jobs/:id                                      -> edit / publish / pause / resume / close
DELETE /jobs/:id                                      -> company-admin only, soft delete + close live applications
POST   /jobs/:id/duplicate
```

### 7.3 Jobs — public board (applicant)
```
GET    /public/jobs?q=&location=&type=&experience=&salary=&posted=&sort=
       -> only status Open/Screening/Interview/Assessment, each item includes
          { id, title, company, location, type, salary, posted, match, scoreBreakdown,
            tags, requirements, deadline, acceptingApplications }
GET    /public/jobs/:id
POST   /public/jobs/:id/save     |  DELETE /public/jobs/:id/save    -> saved jobs
GET    /me/saved-jobs
```
`match` and `scoreBreakdown` are computed **per authenticated applicant**.
Only `status = Open` accepts new applications.

### 7.4 Applications — applicant side
```
GET    /me/applications?filter=All|Active|Interviews|Rejected|Hired|Withdrawn
GET    /me/applications/:id      -> includes score breakdown, missing skills, timeline, interview
POST   /applications             { jobId, answers[], cvFileId }
       201 -> { application }
       409 -> { error: "You already applied to this job posting." }
       422 -> { error: "This job is not accepting applications right now." }
PATCH  /me/applications/:id/withdraw            { reason }
PATCH  /me/applications/:id/interview-response  { action: "confirm"|"reschedule"|"decline", message? }
```

### 7.5 Applications — workspace side
```
GET    /applications?jobId=&stage=&score=&q=&page=      -> candidate list (scoped by role)
GET    /applications/:id                                 -> full candidate record + events
PATCH  /applications/:id/stage        { stage }
POST   /applications/bulk             { ids[], action: "move"|"reject"|"archive", stage?, reason? }
PATCH  /applications/:id/reject       { reason, feedback? }
PATCH  /applications/:id/archive
PATCH  /applications/:id/score        { score, reason }      -> company-admin only, 403 for recruiter
POST   /applications/:id/notes        { body }
POST   /applications/:id/tags         { tag }   |  DELETE /applications/:id/tags/:tag
POST   /applications/:id/status-update { stage, message }     -> applicant-visible message
POST   /applications/:id/interviews    { format, date, time, duration, notes }
GET    /applications/:id/cv                                    -> signed download URL
```

### 7.6 Applicant profile
```
GET    /me/profile
PUT    /me/profile        { headline, bio, location, phone, skills, experience, education }
POST   /me/profile/photo  (multipart)
POST   /me/cv             (multipart, pdf/doc/docx, max 5 MB)  -> { fileId, name }
```
`PUT /me/profile` and `POST /me/cv` must trigger DFS recalculation for all of that
applicant's active applications that have no manual override.

### 7.7 Team, talent pool, analytics, notifications
```
GET    /team                      POST /team/invitations { email, role }
POST   /team/invitations/:id/resend
PATCH  /team/:id  { role?, status? }                     -> company-admin only
GET    /talent-pool?scope=mine|company       POST /talent-pool { applicationId, tags[] }
POST   /talent-pool/:id/add-to-pipeline { jobId }
DELETE /talent-pool/:id                                   -> company-admin only
GET    /analytics/company?range=            -> company-admin only (funnel, time-to-hire,
                                               conversion, score distribution, source of hire, export)
GET    /analytics/me?range=                 -> recruiter, assigned jobs only
GET    /notifications        PATCH /notifications/:id/read     POST /notifications/read-all
GET    /announcements        POST /announcements  (company-admin)
POST   /support/tickets      GET /support/tickets
```

### 7.9 Platform — Super Admin only

Every endpoint below requires `role = super-admin` and is **not** tenant-scoped.

```
GET    /platform/stats                      -> tenants, users, jobs, applications, hires, MRR, plan split
GET    /platform/tenants?status=&q=         -> tenant list with live job/application/seat counts
POST   /platform/tenants                    -> create a company account
GET    /platform/tenants/:id
PATCH  /platform/tenants/:id/status         { status, reason }   -> DEP-01
DELETE /platform/tenants/:id                                      -> archive: jobs closed, applications
                                                                     archived, applicants notified
PATCH  /platform/tenants/:id/subscription   { plan, reason }      -> DEP-02
POST   /platform/tenants/:id/impersonate                          -> short-lived support session token
GET    /platform/users?role=&status=&q=     -> users across all tenants, AND Hirely's own
                                                internal staff when role=super-admin (see
                                                platform_staff in §2.8 — same table, same endpoint)
PATCH  /platform/users/:id/status           { status }
GET    /platform/plans        POST /platform/plans      PATCH /platform/plans/:id
GET    /platform/feature-flags              PUT /platform/feature-flags   { [plan]: { [featureId]: bool } }
GET    /platform/dfs-config                 PUT /platform/dfs-config      { weights }  (must total 100)
GET    /platform/skills                     PUT /platform/skills          { categories[] }
GET    /platform/announcements              POST /platform/announcements  { title, body, target, scheduledFor? }
GET    /platform/support-tickets            PATCH /platform/support-tickets/:id { status, priority? }
GET    /platform/audit-log?type=&from=&to=
GET    /platform/ai-usage?range=            -> calls by kind, cost, % of monthly cap
```

**Hard rules**
- Suspending or deleting a tenant must revoke that tenant's JWTs immediately
  (token version / denylist), not just flip a flag. Both company roles hit the
  suspension screen on their next request and the tenant's jobs leave the public
  board in the same transaction.
- Deleting is archiving. Jobs, applications, scores and events are preserved and
  still readable by the platform; only access is removed.
- A plan downgrade re-evaluates seat limits and feature flags immediately. Users
  over the new seat limit lose access; features disabled for the new tier stop
  rendering.
- Platform endpoints never return another tenant's candidate PII beyond counts.

### 7.8 Errors
```json
{ "error": { "code": "DUPLICATE_APPLICATION", "message": "You already applied to this job posting." } }
```
Codes in use: `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 ·
`DUPLICATE_APPLICATION` 409 · `JOB_NOT_ACCEPTING` 422 · `VALIDATION_FAILED` 422
(with `fields`) · `WEIGHTS_INVALID` 422 · `OVERRIDE_NOT_ALLOWED` 403.

---

## 8. Frontend → endpoint mapping

Replace each function body in `src/services/hirelyBridge.js`; the return shapes stay identical.

| Bridge function | Endpoint |
|---|---|
| `listPublicJobs()` | `GET /public/jobs` |
| `getPublicJob(id)` | `GET /public/jobs/:id` |
| `submitApplication({jobId, answers, cv})` | `POST /applications` |
| `myApplications()` | `GET /me/applications` |
| `hasApplied(jobId)` | derived from `GET /me/applications` |
| `withdrawApplication(id, reason)` | `PATCH /me/applications/:id/withdraw` |
| `respondToInterview(id, action)` | `PATCH /me/applications/:id/interview-response` |
| `syncProfileToCandidates(profile)` | server-side side effect of `PUT /me/profile` — delete on the client |
| `syncApplicantFromCandidates(candidates)` | server-side event fan-out — delete on the client |
| `syncApplicationsWithJobs(jobs)` | server-side side effect of closing a job — delete on the client |
| `calculateMatchScore(job, profile)` | server-side; keep client copy only for the live preview |
| `pushNotification(target, entry)` | `GET /notifications` (server creates them) |
| `getPlatformStats()` | `GET /platform/stats` |
| `getTenants()` | `GET /platform/tenants` |
| `setTenantStatus(id, status, reason)` | `PATCH /platform/tenants/:id/status` |
| `deleteTenant(id)` | `DELETE /platform/tenants/:id` |
| `overrideTenantPlan(id, plan, reason)` | `PATCH /platform/tenants/:id/subscription` |
| `isLocalTenantSuspended()` | derived from `GET /auth/me` (`company.status`) |
| `getPlatformUsers()` / `setPlatformUserStatus()` | `GET /platform/users` · `PATCH /platform/users/:id/status` |
| `getFeatureFlags()` / `saveFeatureFlags()` | `GET|PUT /platform/feature-flags` |
| `isFeatureEnabled(id)` | from `GET /auth/me` (`permissions` / `features`) |
| `getDFSDefaults()` / `saveDFSDefaults()` | `GET|PUT /platform/dfs-config` |
| `getSkillLibrary()` / `saveSkillLibrary()` / `listSkills()` | `GET|PUT /platform/skills` |
| `publishPlatformAnnouncement()` | `POST /platform/announcements` |
| `getSupportTickets()` / `updateSupportTicket()` | `GET|PATCH /platform/support-tickets` |
| `logAudit()` / `getAuditLog()` | server-side; `GET /platform/audit-log` |
| `recordAiCall()` / `getAiUsage()` | server-side; `GET /platform/ai-usage` |

In `src/App.jsx`, `Provider` reads from `localStorage` and mirrors writes through the bridge.
Swap those reads for `GET /jobs` + `GET /applications`, and the three `sync*` calls for a
refetch (polling or WebSocket `application.*` events). Everything else stays as is.

---

## 9. Enums

```
job.status        Draft | Open | Paused | Closed
pipeline stages   Applied | Sourced | Screening | Shortlisted | Assessment | Interview | Offer | Hired
terminal stages   Rejected | Withdrawn | Archived | Closed
application.status Active | Rejected | Withdrawn | Offer Received | Hired | Closed | Archived
interview.status  Pending | Confirmed | Reschedule Requested | Declined
rejection reasons Skills mismatch | Experience mismatch | Role requirements changed |
                  Position filled | Other
withdraw reasons  Accepted another offer | Position no longer fits | Personal reasons | Other
notification kind Applications | Interviews | System
```

---

## 10. Non-functional notes

- **Uniqueness:** `UNIQUE (job_id, applicant_id)` on `applications` — the duplicate-apply guard
  must be a DB constraint, not just an application check.
- **Soft deletes** for jobs; closing a job closes its live applications and notifies applicants.
- **Files:** CVs and photos in object storage, served via short-lived signed URLs. A CV is
  snapshotted per application so later profile edits don't change what the recruiter reviewed.
- **Audit:** every score override, rejection and bulk action stores the acting user and timestamp.
- **Privacy:** an applicant's data is visible only to the company they applied to. Recruiter
  notes and tags are never returned by applicant endpoints.
- **Real time:** the applicant timeline is currently event-driven in the browser; a WebSocket
  channel per user (`application.*`, `notification.created`) is the natural replacement, with
  30-second polling as a fallback.
- **Email:** `auto_notify` on a job controls transactional mail for stage changes, interview
  invitations and rejections.
- **AI hooks (for the AI teammate, not required for v1):**
  `POST /applications/:id/ai-summary` (candidate summary shown in the recruiter panel),
  `POST /cv/parse` (CV → structured skills), `GET /me/recommendations` (job matches).
  The UI already has placeholders for all three.

---

## 11. Cross-role dependency contract (DEP-01 … DEP-20)

This is the acceptance list. Each row is one action, the events the backend must
emit, and what every other role must observe. The frontend already behaves this
way against the local store.

| # | Action | Backend must | Other roles see |
|---|---|---|---|
| DEP-01 | Super Admin suspends / deletes a tenant | revoke tenant JWTs, flip `tenants.status`, hide jobs from the public board, archive on delete | Admin + Recruiter: suspension screen. Applicant: jobs gone; if already applied, application shows `Closed` |
| DEP-02 | Super Admin overrides a plan | apply seat limits and feature flags atomically, notify admin | Admin: new plan card + email. Recruiter over seat limit: restricted. Disabled features disappear |
| DEP-03 | Company Admin completes onboarding | create isolated tenant, activate plan, send recruiter invites | Recruiters receive invitation emails |
| DEP-04 | Admin invites a recruiter | token valid 72h, email pre-filled and locked at setup | Recruiter: dedicated setup page, not login. Admin: status Pending → Active |
| DEP-05 | Admin deactivates a recruiter | revoke sessions, keep their historical pipeline actions in analytics | Recruiter loses access; their jobs stay assigned for reassignment |
| DEP-06 | Admin promotes a recruiter to admin | widen permissions on next token refresh | New admin gains Billing, Team, score override |
| DEP-07 | Admin / Recruiter publishes a job | reject publish unless weights total exactly 100, index for search | Applicant: job appears in Browse Jobs with a personalised match preview |
| DEP-08 | Admin deletes a job | archive job + applications (never hard delete), notify active applicants | Recruiter: job leaves My Jobs. Applicant: `Closed` + notification |
| DEP-09 | Applicant submits an application | store CV + answers, queue DFS, parse CV, score, run automation | Admin + Recruiter: candidate appears in pipeline. Applicant: confirmation, then score |
| DEP-10 | Auto-advance fires | move stage, log `Auto-advanced by system — score X/100`, notify recruiter | Applicant sees only "your application is progressing" — **never** the word auto-advanced |
| DEP-11 | Auto-reject fires | move to Rejected, generate feedback from the lowest dimensions, email it | Applicant: rejection + full score breakdown + improvement skills. Never ghosted |
| DEP-12 | Recruiter moves a candidate to Interview | log actor + timestamp, feed analytics | Admin: same pipeline state. Applicant: stage tracker advances |
| DEP-13 | Recruiter schedules an interview | create interview record, email + in-app invite; **do not** change the stage | Applicant: invitation with Confirm / Reschedule / Decline. Recruiter: response in activity |
| DEP-14 | Admin overrides a DFS score | store original + new + reason + actor, re-run automation | Recruiter: edit icon on the score, full details in Activity. Applicant: "your score was reviewed" — **never** the reason |
| DEP-15 | Recruiter rejects with feedback | store reason, feedback, actor, timestamp; send email | Applicant: score breakdown always visible plus the feedback. Admin: full audit trail |
| DEP-16 | Candidate saved to talent pool | link to candidate + tenant, tags | Admin: company-wide pool. Recruiter: own saved list only. Applicant: **no notification** |
| DEP-17 | Recruiter pipeline activity | every action is a timestamped analytics event | Admin: company-wide funnel updates. Recruiter: own scope only |
| DEP-18 | Super Admin monitors AI cost | aggregate `ai_usage`, alert on daily budget, degrade gracefully if Gemini fails | Companies see a degraded-AI banner; scores keep calculating |
| DEP-19 | Applicant updates their profile | recalculate preview scores and live applications without a manual override | Admin + Recruiter: the next application scores higher; old ones unchanged |
| DEP-20 | Applicant withdraws | status `Withdrawn`, remove from active pipeline, preserve data and score | Admin + Recruiter: card leaves the board, counts as funnel drop-off. Re-apply blocked for the same posting |

---

## 12. Corrections applied during validation

Fixed in the frontend while cross-checking against the documents — the backend
should implement the corrected behaviour, not the original:

1. **Auto-advance wording (DEP-10)** — the applicant timeline previously showed the
   internal "Automatically advanced by job rule…" text. The applicant now sees a
   neutral progress message; the internal wording stays in the recruiter activity log.
2. **Auto-reject feedback (DEP-11)** — a generic threshold message is replaced by
   structured feedback built from the two lowest-scoring dimensions plus the missing
   skills, matching the no-ghosting promise.
3. **Score override (DEP-14)** — the applicant now sees "your score was reviewed by
   the hiring team" with the original dimension bars intact, and never the reason.
4. **Job deletion (DEP-08)** — deleting a job used to drop the record. It now closes
   and archives the job, closes its live applications and notifies the applicants;
   the data stays for audit.
5. **Withdrawn / archived candidates (DEP-20)** — they no longer occupy a column on
   the active Kanban board; the record and score are preserved for analytics.
6. **Suspended tenant (DEP-01)** — a suspended company's jobs are now removed from
   Browse Jobs and from the job detail page, not just from the workspace.
7. **DFS defaults** — the job form's starting weights now come from the platform DFS
   template instead of a hardcoded object, so the Super Admin setting has an effect.
8. **Skill library** — job requirements and applicant skills autocomplete from the
   global library instead of free text, which is what makes skill matching reliable.
9. **Feature flags** — the flag matrix was decorative. The five flags listed in §2.8
   now actually gate navigation, the AI summary block, analytics export and the job
   automation section.
10. **Support tickets** — the Super Admin Reported Issues page listed mock rows; it
    now reads the tickets the company roles actually submit, and status changes flow
    back to the reporter.
11. **Platform statistics** — Companies, Users, Dashboard, Analytics and AI Monitor
    were hardcoded. They are derived from the shared data, so the numbers the Super
    Admin sees are the numbers the tenants produced.
12. **One inconsistency not in the documents:** the docs describe DFS dimensions as
    Skills / Experience / Qualifications / Custom, while the job form and the applicant
    score page use Skills / Experience / Education / Location. The implementation
    standardises on the four dimensions the UI actually renders and scores. If the
    "Custom criteria" dimension is required, add it as a fifth weight in `jobs.weights`
    and in §4 — it is a contained change.

---

## 13. Suggested build order

1. Auth + tenancy + `/auth/me` (roles come from the token, never the client).
2. Jobs CRUD with the weights-total-100 validation, then the public board.
3. Applicant profile + CV upload, then `POST /applications` with DFS scoring.
4. Application events and notifications — this is what makes the four roles feel linked.
5. Pipeline actions, interviews, rejection feedback.
6. Analytics aggregation (company + recruiter scope).
7. Platform layer: tenants, plans, feature flags, DFS config, skill library, audit log.
8. AI: Gemini CV parsing and candidate summaries, with the usage metering in §2.8.
