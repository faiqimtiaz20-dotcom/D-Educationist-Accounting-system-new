# D’ Educationist Accounting System — Backend & Integration Milestones

**Document purpose:** Break the remaining work into clear milestones for connecting the existing frontend to a **Node.js backend + PostgreSQL**, with a **fully normalized database**, without skipping modules from the product scope.

**Proposal reference:** DE-ACC-2026-182 (PKR proposal)  
**Last updated:** 29 September 2026  
**Status legend:**

| Status | Meaning |
|--------|---------|
| **Done (frontend UI)** | Screen/route exists in the React app and is usable with **local/mock Zustand data** |
| **Partial (frontend)** | Screen exists but uses placeholders, seeded mock rows, or incomplete logic |
| **Not started (backend)** | Feature API / seed / wire-up not built yet |
| **Scaffold done (M1)** | Nest + Prisma schema/migration exist; live DB apply and business APIs may still be pending |
| **Planned** | In scope for this milestone plan; not yet built |

---

## 0. Honest current state (do not treat as complete product)

### What exists today

| Area | Reality |
|------|---------|
| Frontend app | Vite + React + TypeScript + Tailwind; routes and pages under `src/` |
| Data | In-memory / persisted Zustand stores + seed data under `src/data/` — **not** yet driven by PostgreSQL |
| Auth | JWT + bcrypt against Postgres when API is running; frontend uses API if `VITE_API_URL` is set; mock `demo123` only without that env |
| API calls from frontend | **Partial** — … payroll, **approvals / documents / audit** |
| Backend folder | **`backend/` exists** (NestJS + Prisma) |
| PostgreSQL schema | Applied (`dedu_accounting`) |
| Business APIs (students, invoices, GL, reports, …) | **Done through M14**; M15 = UAT/deploy/handover (client sign-off pending) |
| Hosting of API | **Not done** |
| Production go-live with real DB | **Not done** |

### What the frontend already covers (UI + client logic)

These modules have pages/routes wired in `src/router/routes.tsx` and work against **local stores**, not a database:

1. Login / auth guards / RBAC matrix (client-side)
2. Dashboard (management + counsellor switch by role)
3. Master Sheet (students)
4. Invoices, Other Invoices, Remittance, Allocation
5. Sub-Agent Master, Commission Sheet, Payments
6. Petty Cash, Expenses, Bank & Cash
7. General Ledger, Journal Entries, Contra Entries
8. Tax Compliance; Student / Vendor / Sub-Agent ledgers
9. Payroll, Documents, Approvals, Audit Trail
10. Reports hub + many dedicated report pages
11. Settings: Branches, Users & Roles, System Settings
12. Client-side helpers: commission/WHT/payroll tax math, GL auto-posting foundations (`src/lib/gl-posting.ts`), branch filter, permissions

### Known frontend gaps (do not claim “complete”)

| Item | Reality |
|------|---------|
| Generic report route `/reports/:reportId` (`ReportPage.tsx`) | Builds **synthetic mock rows** (not real ledger math) for reports that fall through to this page (e.g. Trial Balance, Cash Book, Bank Book, Journal Register, WHT/GST/Salary summaries listed via that path, commission tracking routes that use `ReportPage`, etc.) |
| Dedicated report pages (Counsellor, Country, University, Branch*, Consolidated*, University-wise P&L) | Compute from **Zustand seed/store data**, not from PostgreSQL |
| Documents | Metadata in client store; **no real file upload storage** (S3/disk) |
| Email send/resend invoices | **Tenant SMTP** (Gmail / M365 / Outlook OAuth + app-password) via Settings → Email; invoice send uses tenant mailer |
| Demo credentials | Hard-coded demo accounts — must be replaced for production |
| Backend stack in proposal | Node.js + PostgreSQL is **scope**, not **delivered** yet |

### Proposal items explicitly out of this milestone plan (exclusions)

Per proposal exclusions — **not** claimed as included unless later approved as change requests:

- Domain, SSL, hosting fees
- FBR / PEPPOL / bank API integrations
- Native iOS/Android apps
- Full legacy Excel migration beyond an agreed sample template
- Ongoing AMC after warranty (separate commercial item)

---

## 1. Milestone map (overview)

| Milestone | Name | Depends on | Backend status today |
|-----------|------|------------|----------------------|
| **M0** | Baseline freeze & acceptance checklist | — | Planned |
| **M1** | Backend scaffold + PostgreSQL + full normalized schema | M0 | **Done** — Nest app + full schema; migration `20260928120000_m1_init` applied to local Postgres `dedu_accounting` |
| **M2** | Auth, RBAC, branches, users, settings, seed | M1 | **Done** — auth/JWT/seed; Branches/Users/General settings UI API-wired; port 3001 |
| **M3** | Masters: universities, sub-agents, vendors, bank accounts, COA | M2 | **Done** |
| **M4** | Master Sheet (students) API + frontend wire-up | M3 | **Done** |
| **M5** | Revenue: invoices, other invoices, remittance, allocation + GL posting | M4 | **Done** |
| **M6** | Sub-agents: commissions, payments, ledger postings | M5 | **Done** |
| **M7** | Cash & expenses, bank/cash, cheques, contra | M5 | **Done** |
| **M8** | Accounting core: journals API, fiscal lock, party ledgers | M5–M7 | **Done** |
| **M9** | Tax compliance + tax summary data sources | M8 | **Done** |
| **M10** | Payroll, employees, reimbursements | M8 | **Done** |
| **M11** | Documents, approvals workflow, audit log API | M7–M10 | **Done** |
| **M12** | Dashboard metrics API | M5–M10 | **Done** |
| **M13** | Full reports suite (every report in hub — real queries) | M8–M12 | **Done** |
| **M14** | Frontend cutover (remove demo-store dependency for production path) | M2–M13 | **Done** |
| **M15** | UAT, training pack, deployment support, handover | M14 | **Ready** — engineering pack Done; client sign-off pending |

Milestones **M5–M11** can overlap after M4 if staffing allows, but **schema (M1)** and **auth/branch scoping (M2)** must land first.

---

## 2. Detailed milestones

---

### M0 — Baseline freeze & acceptance checklist

**Goal:** Agree what “done” means before coding the API, so nothing in scope is silently dropped.

**Deliverables**

- [ ] Freeze module list against proposal Section 3.1 (14 modules) + reports in Section 3.2
- [ ] Confirm roles: Super Admin, Branch Manager, Accountant, Cashier, Counsellor, Read Only
- [ ] Confirm branches sample (e.g. HO / Karachi / Lahore / Islamabad) and multi-currency list (PKR, GBP, USD, CAD, AUD, EUR)
- [ ] Confirm net profit rule where applicable: **Profit/(Loss) − Outstanding = Net Profit**
- [ ] Confirm Pakistan payroll tax approach (use configurable slabs; current frontend uses a simple slab helper — backend must document the agreed formula)
- [ ] Written UAT checklist (login, branch scope, counsellor scope, invoice→remittance→sub-agent→expense→payroll→report path)
- [ ] Decide hosting target (client VPS / Render / Railway / other) — **decision only**; hosting cost remains client-side unless add-on agreed

**Exit criteria:** Signed/email-confirmed scope freeze for backend work.

**Does not claim:** Backend exists; production deployed.

---

### M1 — Backend scaffold + PostgreSQL + fully normalized schema

**Goal:** Create the API project and **all** database tables needed for the full product (empty schema is OK; no feature skipped in the schema).

**Status (28 Sep 2026):** **Done** for M1 scope. NestJS app runs at `/api/v1`. Prisma schema + migration `20260928120000_m1_init` applied to local PostgreSQL database `dedu_accounting`.

**Deliverables**

- [x] `backend/` NestJS project
- [x] PostgreSQL connection via env (`.env.example` present; local `.env` is gitignored)
- [x] Migration tool: **Prisma 6**
- [x] **Full normalized schema** covering every domain below
- [x] Migration **successfully applied** on Postgres (`dedu_accounting` @ localhost)
- [x] Health endpoint `GET /api/v1/health`
- [x] Backend README with setup steps and non-claims

#### M1 schema checklist (nothing skipped)

**Org / security**

- [x] `branches`
- [x] `roles`
- [x] `modules`
- [x] `permission_levels` (Prisma enum `PermissionLevel`)
- [x] `role_module_permissions`
- [x] `users` (password hash, role, home branch)
- [x] `refresh_tokens`
- [x] `user_branch_access`

**Lookups / settings**

- [x] `currencies`
- [x] `fx_rates`
- [x] `system_settings`
- [x] `expense_categories`
- [x] `petty_cash_categories`
- [x] `payment_modes`
- [x] `document_types` (Prisma enum `DocumentType`)
- [x] `countries`
- [x] Status enums: application, invoice, other invoice, approval, reconciliation, allocation, payroll, journal source, tax type, cheque status, etc.

**Masters**

- [x] `universities`
- [x] `sub_agents`
- [x] `vendors`
- [x] `bank_accounts`
- [x] `gl_accounts` (hierarchical COA via `parent_id`)
- [x] `employees`

**Students**

- [x] `students`
- [x] `student_status_history`

**Revenue**

- [x] `invoices` + `invoice_lines`
- [x] `other_invoices` + `other_invoice_lines`
- [x] `receivables`
- [x] `receivable_allocations`

**Sub-agents**

- [x] `sub_agent_commissions`
- [x] `sub_agent_payments`

**Cash / bank**

- [x] `petty_cash_entries`
- [x] `expenses`
- [x] `bank_transactions`
- [x] `cheques`
- [x] `contra_entries`

**Accounting**

- [x] `journal_entries` + `journal_lines`
- [x] Balanced-journal SQL trigger script (`prisma/sql/001_journal_balance_trigger.sql`) — **optional apply after migrate**; not auto-applied by Prisma migrate
- [x] `party_ledger_entries`

**Tax / payroll / ops**

- [x] `tax_records`
- [x] `payroll_runs` + `payroll_lines`
- [x] `reimbursements`
- [x] `salary_tax_slabs`
- [x] `documents`
- [x] `approvals`
- [x] `audit_logs`

**Exit criteria:** Migrations run on a clean Postgres; schema review confirms every frontend module has a persistence target.

**Exit today:** Schema + migration applied to local `dedu_accounting`. Business APIs still not started (M2+).

**Does not claim:** Business APIs complete; frontend wired; seed/auth; production hosting.

---

### M2 — Auth, RBAC, branches, users, settings, seed

**Goal:** Replace demo client auth with real server auth; enforce branch + permission rules on the API.

**Frontend today (honest):** Login uses API when `VITE_API_URL` is set. **Branches**, **Users & Roles**, **General system settings**, **universities**, **petty cash categories**, and **Sub-Agents** also use the API in that mode. Mock `demo123` login remains only if `VITE_API_URL` is unset.

**Status (28 Sep 2026):** **Done** for M2 scope. Verified: login/me/refresh/logout, branches/users/settings/matrix APIs, branch-scope interceptor + users/branches filtering, permission 403s, login audit. Default API port **3001**.

**Deliverables**

- [x] `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- [x] Password hashing (bcrypt); seed password is `ChangeMe123!` by default — **not** a production secret
- [x] JWT access + refresh tokens with role + branch claims
- [x] Seed roles, modules, default permission matrix (aligned with `src/lib/permissions.ts`)
- [x] CRUD/list: branches, users (Super Admin / Branch Manager rules)
- [x] `GET|PUT` permission matrix (Super Admin only for edit)
- [x] System settings: WHT %, enabled currencies, fiscal lock date, org name
- [x] Branch-scope helper + global interceptor (`req.branchScope`); applied on branches & users list/get
- [x] Permission middleware mapped to modules
- [x] Audit login success/failure (and logout)
- [x] Frontend: login + Branches / Users & Roles / General settings API-wired when `VITE_API_URL` set

**Exit criteria:** Can log in against Postgres users; API rejects cross-branch user access; matrix gates write routes. — **Met**.

**Still deferred (not false claims):** Full module cutover (M14); student/invoice pickers still local until M4/M5.

**Does not claim:** All business modules API-complete.
---

### M3 — Reference masters (universities, sub-agents, vendors, banks, COA)

**Goal:** All dropdown/master data comes from Postgres.

**Deliverables**

- [x] CRUD APIs: universities, sub-agents, vendors, bank accounts
- [x] COA seed from current template (`src/lib/coa.ts` codes 1110, 1120, 1200, …)
- [x] Currencies + FX rates CRUD/list
- [x] Expense + petty cash categories CRUD
- [x] Frontend settings/masters screens read/write via API (where those UIs exist)

**Exit criteria:** Creating a student/invoice can select university/bank/sub-agent from DB.

**Status (28 Sep 2026):** **Done** for M3 scope. Verified APIs under `/api/v1` for universities, sub-agents, vendors, bank-accounts, expense/petty-cash categories, currencies, fx-rates, gl-accounts (+ seed). Seed includes sample masters + COA. Frontend: System Settings (universities + petty cash categories) and Sub-Agents page use API when `VITE_API_URL` is set. Vendors / bank accounts / COA / expense categories have APIs + seed but **no dedicated frontend CRUD screens yet** (consumed later by M4–M7). Student/invoice pickers still Zustand until M4/M5.

**Does not claim:** Master Sheet, invoices, or GL journal posting are API-backed.

---

### M4 — Master Sheet (students / applications)

**Goal:** Student pipeline is persisted and scoped.

**Frontend today:** `MasterSheetPage` + CSV helpers on local store.

**Deliverables**

- [x] CRUD `/students` with branch + counsellor scoping
- [x] Application status transitions + optional status history
- [x] Filters: branch, counsellor, university, country, status, intake
- [x] CSV import/export endpoints **or** keep client CSV but persist via API (decide in M0; both acceptable if documented)
- [x] Counsellor role: only own / permitted student data
- [x] Frontend Master Sheet wired to API
- [x] Audit create/update/status change

**Exit criteria:** Student created in UI appears in Postgres; refresh keeps data.

**CSV decision:** Keep **client-side CSV parse/template**; on import, each valid row is created/updated via `/students` when `VITE_API_URL` is set (no dedicated import endpoint).

**Status (28 Sep 2026):** **Done** for M4 scope. Verified: list/create/update/delete, status history on create + status change, branch scope + counsellor-only list/get, audit entries. Seed includes 5 sample students. Frontend Master Sheet uses API for CRUD + CSV import persistence when API mode is on.

**Does not claim:** Invoices/receivables (M5); commissions (M6).

---

### M5 — Revenue (invoices, other invoices, remittance, allocation) + auto GL

**Goal:** Core commission cash cycle works end-to-end on the server.

**Frontend today:** Full UI + client `gl-posting` helpers; not persisted to DB.

**Deliverables**

- [x] Invoices CRUD + lines; statuses: Draft → Sent → Partially Received → Fully Received → Closed
- [x] Send / resend actions (resend = status/email hook; **real email only if provider configured** — otherwise mark as “action logged, email not integrated”)
- [x] Other invoices CRUD + lines + statuses
- [x] Receivables (remittance) CRUD; partial/bulk flags; WHT + FX snapshots stored
- [x] Allocation API: allocate remittance to one or more invoices; update invoice statuses
- [x] Auto journal posting in **DB transactions**:
  - Invoice sent → Dr AR / Cr Commission Income
  - Remittance → Dr Bank + Dr WHT Receivable / Cr AR (mirror existing client logic)
- [x] Prevent double-post per `(source_type, source_id)`
- [x] Fiscal lock rejected for locked dates
- [x] Frontend Revenue section wired to API

**Exit criteria:** Invoice → remittance → allocation updates balances consistently in journals and invoice status.

**Honest note:** “Send email to university” is **not** done unless an email provider is explicitly added in this milestone.

**Status (28 Sep 2026):** **Done** for M5 scope. APIs: `/invoices` (+ `/send`), `/other-invoices`, `/receivables` (+ `/allocate`). Auto GL on invoice send and non-bulk remittance; bulk remittance posts JE per child allocation. Fiscal lock enforced server-side. Frontend Invoices / Other Invoices / Receivables / Allocation hydrate from API and persist writes when `VITE_API_URL` is set. Seed includes sample sent invoice + partial remittance + JEs.

**Does not claim:** Real email delivery; journal reversal UI (M8); sub-agent commissions (M6).

---

### M6 — Sub-agents (commissions, payments, payables)

**Goal:** Sub-agent payable calculation and payment recording on server.

**Deliverables**

- [x] Commission sheet CRUD/generate from student + invoice + rate
- [x] Payable PKR calc (rate, FX, bonus, WHT) aligned with `src/lib/calculations.ts` / agreed formula
- [x] Payments against commissions; status Pending / Partial / Paid
- [x] Party ledger (sub-agent) entries and/or report queries
- [ ] Optional approval gate for payout (ties to M11)
- [x] Auto GL for payment posting
- [x] Frontend Sub-Agents section wired to API

**Exit criteria:** Paying a commission reduces outstanding payable; payment appears in bank/GL. — **Met**.

**Status (28 Sep 2026):** **Done** for M6 scope. APIs: `/sub-agent-commissions`, `/sub-agent-payments`, `/sub-agents/:id/ledger`. Payable formula: `grossFee × rate/100 × FX + bonus`, then WHT → net. Payment posts JE Dr 5100 / Cr 2200 (WHT share) / Cr 1120 (net). Status syncs Pending → Partial → Paid. Fiscal lock enforced. Frontend Commissions / Payments / Ledger hydrate and persist when `VITE_API_URL` is set. Seed includes sample commission + partial payment + JE. Posted payment delete blocked until M8 reversal.

**Does not claim:** Payment approval workflow (M11); payment edit/reversal (M8); Sub-Agents master page was already API-wired in M3.

---

### M7 — Cash & expenses, bank & cash, cheques, contra

**Goal:** Operating cash side persisted and posted.

**Deliverables**

- [x] Petty cash CRUD (`in`/`out` + tax components + total)
- [x] Expenses CRUD; approval_status; vendor link
- [x] Bank transactions list/create; reconciliation status
- [x] Cheques Issued / Cleared / Bounced
- [x] Contra entries (Cash-Bank, Bank-Bank, Cash-Cash) + GL
- [x] Expense approved → GL (OpEx + input tax / Cash or Bank)
- [x] Petty cash → GL
- [x] Frontend Cash & Expenses + Bank & Cash wired to API

**Exit criteria:** Expense approval posts journal; bank views match transactions (opening + movements). — **Met**.

**Status (28 Sep 2026):** **Done** for M7 scope. APIs: `/petty-cash`, `/expenses` (+ `/approve` `/reject`), `/bank-accounts-balances`, `/bank-transactions`, `/cheques`, `/contra-entries`. Auto GL: expense approve Dr 5200 (+1310) / Cr 1110|1120; petty cash in/out; contra Dr dest / Cr source. Bank balances = opening + movements. Seed includes sample petty/expense/cheque/contra + JEs. Frontend Petty Cash / Expenses / Bank & Cash / Contra hydrate when `VITE_API_URL` is set. Posted petty cash edit/delete blocked until M8 reversal.

**Does not claim:** Full approval workflow inbox (M11); journal reversal UI (M8); imprest replenishment workflow is UI-only stub.

---

### M8 — Accounting core (journals, GL, party ledgers)

**Goal:** Manual journals + inquiry APIs; GL balances from lines (not fake static balances).

**Deliverables**

- [x] Manual journal create/update (draft) / submit / approve
- [x] Enforce Σ debit = Σ credit
- [x] GL trial / account activity endpoints from `journal_lines`
- [x] List journals with source links (Invoice, Receivable, Expense, PettyCash, Payroll, Manual, Reversal, …)
- [x] Reversal journal support
- [x] Student / vendor / sub-agent ledger APIs (entries + running balance in query)
- [x] Frontend Accounting + ledger pages wired to API

**Exit criteria:** GL account balance equals sum of posted lines for that account (and branch filter). — **Met**.

**Status (29 Sep 2026):** **Done** for M8 scope. APIs: `/journal-entries` (+ approve/reverse), `/gl/trial-balance`, `/gl/chart`, `/gl/accounts/:code/activity`, `/ledgers/students|vendors|sub-agents/:id`. Manual journals draft→approve; unbalanced rejected; fiscal lock enforced; reversal posts `Reversal` JE. GL balances from approved lines only. Frontend Journals / GL / Student & Vendor ledgers hydrate when `VITE_API_URL` is set. Seed includes sample approved manual JE.

**Does not claim:** Payroll JE posting (M10); full report suite TB export (M13); deleting auto-posted source docs still blocked (use reverse JE).

---

### M9 — Tax & compliance

**Goal:** Tax screens and tax reports read real aggregated data.

**Deliverables**

- [x] Tax compliance API aggregating:
  - WHT from remittances / payables
  - GST / SRB-SST / sales tax from expenses & petty cash
  - Salary tax from payroll
- [x] Manual tax adjustment records if required
- [x] Period filters (YYYY-MM)
- [x] Frontend Tax Compliance wired to API

**Exit criteria:** Figures match source documents for a sample period (documented test cases).

**Status (29 Sep 2026):** **Done** for M9 scope. APIs: `GET /tax/summary`, `GET|POST|PATCH|DELETE /tax/records`. Summary aggregates WHT receivable (remittances), WHT payable (payment WHT share + expense income tax), GST input / SRB-SST (approved expenses + petty cash out), salary tax (processed/paid payroll), plus manual `tax_records`. Period `YYYY-MM` required. Frontend Tax Compliance hydrates when `VITE_API_URL` is set. Seed includes tax expense, GST output adjustment, and sample payroll salary tax for `2026-09`. Verified: `verify-m9.js` matches DB sources.

---

### M10 — Payroll

**Goal:** Employee payroll runs with agreed Pakistan tax logic.

**Deliverables**

- [x] Employees CRUD
- [x] Payroll runs: Draft → Processed → Paid
- [x] Payroll lines; totals; Internal vs Uploaded source
- [x] CSV import endpoint (parity with frontend payroll CSV helper) if required
- [x] Reimbursements + approval status; inclusion in run
- [x] Salary tax calculation per **agreed** slabs (document difference if replacing simple frontend helper)
- [x] GL posting on process/pay
- [x] Frontend Payroll wired to API

**Exit criteria:** Processed run persists; tax and net totals reproducible.

**Status (29 Sep 2026):** **Done** for M10 scope. APIs: `/employees`, `/payroll-runs` (+ `/process`, `/import`, `/:id/pay`), `/reimbursements` (+ approve/reject), `/salary-tax-slabs`. Tax formula matches FE (`10%` exempt + annual brackets 2.5%/7.5%/12.5% → monthly) — documented in `backend/src/payroll/salary-tax.ts`; slabs seeded for reference. Process builds lines + includes approved reimbursements; pay posts JE Dr 5300 (+5200 reimb) / Cr 2200 tax / Cr 1120 bank. Frontend Payroll hydrates and persists when `VITE_API_URL` is set. Verified: `verify-m10.js`.

---

### M11 — Documents, approvals, audit trail

**Goal:** Operations controls on the server.

**Deliverables**

- [x] Approvals queue API for: Expense, Sub-Agent Payout, Journal, Refund, Reimbursement, Payroll
- [x] Decide approve/reject updates source record + optional GL side effects
- [x] Documents: metadata in DB + file storage (local disk or S3); upload/download
- [x] Audit log API (filter by module, user, date, entity)
- [x] Audit interceptor on critical mutations
- [x] Frontend Approvals, Documents, Audit Trail wired to API

**Exit criteria:** Approve expense in UI changes DB status and posts GL when applicable; audit row written.

**Honest note:** Document storage is **local disk** (`UPLOAD_DIR` / `./uploads`) — not S3. Upload size capped at 10 MB.

**Status (29 Sep 2026):** **Done** for M11 scope. APIs: `/approvals` (+ approve/reject with SoD), `/documents` (+ multipart upload, download, delete), `/audit-logs`. Expense/Journal/Reimbursement creates sync `approvals` rows; approving expense via queue posts GL. AuditMutationInterceptor breadcrumbs Approvals/Documents HTTP mutations; domain services write detailed audit rows. Frontend Approvals / Documents / Audit Trail hydrate when `VITE_API_URL` is set. Verified: `verify-m11.js`.

---

### M12 — Dashboard metrics API

**Goal:** Management and counsellor dashboards use server aggregates.

**Deliverables**

- [x] `GET /dashboard/metrics` — today’s collection/expenses, cash/bank, monthly revenue/expenses, net profit, outstanding AR/AP, petty cash (branch-scoped)
- [x] Supporting chart endpoints as needed (commission by university, receivables ageing, monthly trend)
- [x] Counsellor dashboard endpoints scoped to counsellor
- [x] Frontend dashboards wired to API

**Exit criteria:** Dashboard numbers match SQL aggregates for seeded/UAT dataset.

**Status (29 Sep 2026):** **Done** for M12 scope. APIs: `/dashboard/metrics`, `/dashboard/charts/*` (commission-by-university, receivables-ageing, branch-profit, monthly-trend), `/dashboard/counsellor`. Metrics from Postgres (receivables PKR, approved expenses, bank account movements, GL 1110 cash, commission AR/AP). Counsellor endpoint forced to own `counsellorId`. Frontend management + counsellor dashboards hydrate when `VITE_API_URL` is set. Verified: `verify-m12.js` matches SQL aggregates.

---

### M13 — Reports suite (every report — no mock fall-through)

**Goal:** Every report linked from the Reports hub returns **real** data. Replace `ReportPage` mock-row behaviour for production paths.

**Status (29 Sep 2026):** **Done** for M13 scope. Unified API: `GET /reports` (catalog), `GET /reports/:slug` (JSON), `GET /reports/:slug/csv` (**CSV only** — PDF/Excel not built). All 26 hub slugs query Postgres. Counsellor role: catalog limited to 3 Operations reports; other slugs return 403. Frontend: `ReportPage` never uses `buildMockRows` when `VITE_API_URL` is set; dedicated report routes use `ApiReportView` in API mode. Verified: `backend/scripts/verify-m13.js`.

#### Branch reports

- [x] Branch Income
- [x] Branch Expenses
- [x] Branch Profit (with detail drill-down)
- [x] Branch Cash Position (with detail drill-down)

#### Consolidated

- [x] University-wise P&L
- [x] Consolidated P&L
- [x] Consolidated Balance Sheet
- [x] Consolidated Cash Flow

#### Operations / commission

- [x] Counsellor Report — Profit and Loss
- [x] Country-wise Report
- [x] University-wise Report
- [x] Commission earned vs received
- [x] Sub-agent payout summary
- [x] Net margin per student

#### Tax

- [x] WHT Summary
- [x] GST/SRB Summary
- [x] Salary Tax Summary

#### Standard registers

- [x] Trial Balance
- [x] Cash Book
- [x] Bank Book
- [x] Journal Register
- [x] Expense Report
- [x] Income Report
- [x] Receivable Ageing
- [x] Payable Ageing
- [x] Petty Cash Report

**Also**

- [x] Filters: date range (`from`/`to`), branch (`branchId`), university/counsellor/country/period where relevant
- [x] Export hooks — **CSV only** (PDF/Excel not implemented; UI says so in API mode)
- [x] Counsellor sees restricted report set only (as in frontend)

**Exit criteria:** No production report depends on `buildMockRows` in `ReportPage.tsx`. — **Met** (API mode).

**Does not claim:** Pixel-perfect PDF letterhead; dedicated-page pixel parity with local Zustand layouts (API mode uses shared `ApiReportView`).

---

### M14 — Frontend cutover & hardening

**Goal:** App can run in “API mode” against Postgres without pretending Zustand seeds are production data.

**Status (29 Sep 2026):** **Done** for M14 scope. Mode is `VITE_API_URL` present = API, absent = local mock (dev only). Production builds (`import.meta.env.PROD`) require `VITE_API_URL` and hide/reject demo-password login. `ApiError` + unauthorized handler clear session on 401; 403 messages surfaced. Server pagination: students & journals (`take`/`skip` → `{ items, total }`); audit-logs always paged. FE Master Sheet + Audit Trail page controls; journals hydrate with `take=200`. Smoke: `backend/scripts/verify-m14.js` + `docs/M14-SMOKE-CHECKLIST.md`. `.env.example` documents modes.

**Deliverables**

- [x] `VITE_API_URL` (or equivalent) documented in frontend `.env.example`
- [x] API client layer; error toasts; loading states on all wired pages
- [x] Feature flag or build mode: `mock` vs `api` (via `VITE_API_URL`; prod forces API)
- [x] Remove or clearly disable demo-password path for production builds
- [x] Ensure RBAC/route guards still align with server 403s
- [x] Smoke test script or checklist for all sidebar routes against API
- [x] Performance basics: pagination on large lists (students, journals, audit)

**Exit criteria:** Fresh browser profile + production build talks only to API for business data. — **Met** (prod build blocks mock; API mode pages hydrate from Nest).

**Does not claim:** Complete removal of Zustand seed arrays from the repo (still used for mock mode); pixel-perfect dedicated report UIs in API mode (shared `ApiReportView`).

---

### M15 — UAT, training, deployment support, handover

**Goal:** Match proposal deliverables that are still outstanding for a real backend go-live.

**Status (29 Sep 2026):** **Engineering pack Ready.** Delivered in-repo: root + backend `.env.example`, [DEPLOYMENT.md](./DEPLOYMENT.md), [UAT-CHECKLIST.md](./UAT-CHECKLIST.md) (with sign-off block), [USER-GUIDE.md](./USER-GUIDE.md), [TRAINING-AGENDA.md](./TRAINING-AGENDA.md), [HANDOVER.md](./HANDOVER.md), root [README.md](../README.md), `verify-m15.js`. **Not claimed Done:** live client UAT sign-off, scheduled training attendance, production deploy on client hosting, or commercial source handover — those require the client environment and signatures.

**Deliverables**

- [ ] UAT on staging/production DB with client checklist sign-off ← *checklist ready; sign-off pending*
- [ ] Up to two rounds of minor UI/logic fixes during UAT (per proposal inclusions) ← *process ready; rounds not yet run*
- [x] Basic user guide (shared markdown) reflecting **API-backed** flows — `docs/USER-GUIDE.md` (PDF optional export by client)
- [ ] One remote training / walkthrough (up to 2 hours) ← *agenda ready; session not yet held*
- [x] Deployment support docs for first go-live — `docs/DEPLOYMENT.md` (hosting credentials remain client-side)
- [ ] Source code handover after final payment terms as commercially agreed ← *inventory in HANDOVER.md; transfer pending commercial terms*
- [x] `.env.example` for frontend and backend
- [x] 30-day bug-fix warranty clock documented (starts only after formal delivery sign-off) — `docs/HANDOVER.md`

**Exit criteria:** Written UAT sign-off; credentials + repos handed over as agreed. — **Not met until client completes sign-off.**

**Does not claim:** Free hosting, FBR/bank integrations, unlimited post-warranty support, or that UAT has already been signed.

---

## 3. Traceability — proposal modules → milestones

| # | Proposal module | Frontend UI today | Backend milestone(s) |
|---|-----------------|-------------------|----------------------|
| 1 | Authentication & security | Done (API JWT; mock only without `VITE_API_URL`) | M2, M14 |
| 2 | Dashboard | Done (API metrics in API mode) | M12, M14 |
| 3 | Master Sheet | Done (API + pagination) | M4, M14 |
| 4 | Invoices | Done (API) | M5, M14 |
| 5 | Remittance | Done (API) | M5, M14 |
| 6 | Sub-Agents | Done (API) | M3, M6, M14 |
| 7 | Cash & Expenses | Done (API) | M7, M14 |
| 8 | Accounting | Done (API + journal pagination) | M8, M14 |
| 9 | Tax & Ledgers | Done (API) | M8, M9, M14 |
| 10 | Payroll | Done (API) | M10, M14 |
| 11 | Operations (docs, approvals, audit) | Done (API; audit paginated) | M11, M14 |
| 12 | Reports hub | Done (API + FE API mode; mock only without `VITE_API_URL`) | M13, M14 |
| 13 | Settings | Done (API branches/users/settings) | M2, M3, M14 |
| 14 | Responsive UI | Done (frontend) | — (no backend work; verify after cutover) |

---

## 4. Suggested sequencing (calendar — indicative only)

These are **planning buckets**, not a promise of calendar dates. Actual dates depend on kickoff, feedback speed, and hosting readiness.

| Week bucket | Milestones | Focus |
|-------------|------------|--------|
| Week A | M0, M1, M2 | Freeze, schema, auth |
| Week B | M3, M4, M5 | Masters, students, revenue + GL |
| Week C | M6, M7, M8, M9, M10 | Payables, cash, accounting, tax, payroll |
| Week D | M11, M12, M13, M14 | Ops, dashboard, all reports, cutover |
| Week E (buffer) | M15 | UAT, training, deploy, handover |

If the commercial proposal’s **1-month** timeline is binding, Weeks A–D must be compressed and scope change requests must stay frozen after M0. Any slip in client feedback extends delivery per proposal terms — this file does not override the signed proposal.

---

## 5. Definition of Done (per milestone)

A milestone is **Done** only when:

1. Items in its checklist are implemented against **PostgreSQL**
2. APIs are protected by auth + branch + permission rules (where applicable)
3. Critical writes create **audit** rows (from M2 onward for auth; from M4+ for business entities)
4. Frontend path for that module can run in **API mode** (from the milestone that lists wire-up)
5. No checklist item is marked done based only on Zustand/mock behaviour

---

## 6. Explicit non-claims

This milestones document does **not** claim that:

- Email, SMS, FBR, PEPPOL, or bank APIs are included
- Native mobile apps are included
- Full historical Excel migration is included
- Hosting/DNS/SSL are included in the development fee
- Client UAT has been signed or production is live on client infrastructure
- Unlimited post-warranty support is included

---

## 7. Next action

1. Complete **M0** (scope freeze + UAT checklist).  
2. Start **M1** (scaffold backend + full normalized migrations).  
3. Proceed in order **M2 → M15**, checking off boxes in this file as evidence is available (PR links / migration names / UAT notes).

---

## 8. Multi-tenant follow-on (separate track)

Single-tenant M1–M15 delivery is **not** multi-tenant. A separate plan covers tenants + CRM Admin:

- [MULTI-TENANT-MILESTONES.md](./MULTI-TENANT-MILESTONES.md) — MT0–**MT4 Done**; MT5–MT9 **Planned**
- [FSD-MULTI-TENANT-ADDENDUM.md](./FSD-MULTI-TENANT-ADDENDUM.md)

**Do not claim** the live product is multi-tenant until MT8 isolation evidence exists.

---

*End of milestones document.*
