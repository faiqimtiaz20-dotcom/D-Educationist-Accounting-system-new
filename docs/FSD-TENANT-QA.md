# Functional Specification Document — Tenant Application

**Product:** D’ Educationist Accounting System  
**Document ID:** FSD-TENANT-QA-2026  
**Audience:** QA / UAT (tenant consultancy users)  
**Proposal reference:** DE-ACC-2026-182  
**Version:** 1.0  
**Date:** 10 October 2026  
**Status:** Ready for QA — aligned to current multi-tenant implementation  

| Role | Name | Date |
|------|------|------|
| Prepared by | Delivery (engineering) | 10 Oct 2026 |
| Reviewed by (QA Lead) | _________________ | |
| Approved by (Client) | _________________ | |

### Related documents

| Document | Purpose |
|----------|---------|
| [FSD-DE-ACC-2026.md](./FSD-DE-ACC-2026.md) | Original baseline FSD (pre–multi-tenant wording in places) |
| [FSD-MULTI-TENANT-ADDENDUM.md](./FSD-MULTI-TENANT-ADDENDUM.md) | Tenancy / CRM platform rules |
| [TENANT-USER-PROCESS-GUIDE.md](./TENANT-USER-PROCESS-GUIDE.md) | End-user process steps |
| [UAT-CHECKLIST.md](./UAT-CHECKLIST.md) | Sign-off checklist |
| [docs/qa/TEST-CASES.md](./qa/TEST-CASES.md) | Detailed test cases (AUTH → TN-ISO) |
| [USER-GUIDE.md](./USER-GUIDE.md) | Shorter user guide |

**This document supersedes the parent FSD for QA of tenant behaviour** where they differ (roles, tenancy, email, invoice branding, courses/countries masters). Platform CRM Admin console (`/crm/*`) is **out of scope** except for boundary checks (tenant users must not access it).

---

## 1. Purpose

Define **what a tenant (consultancy) user must be able to do** in the web application so QA can validate modules, workflows, roles, business rules, isolation, and acceptance criteria.

It is the functional contract for **one organisation’s accounting workspace**, not the platform console that creates tenants.

---

## 2. Product overview

### 2.1 What the product is

Multi-tenant, multi-branch **commission accounting** for study-abroad consultancies (Pakistan-focused).

| Term | Meaning for QA |
|------|----------------|
| **Tenant** | One consultancy / company. All business data belongs to that org only. |
| **Branch** | Operating unit inside a tenant (e.g. HO, KHI, LHR). Branch isolation applies **inside** the tenant. |
| **Tenant user** | Staff who log in and use Dashboard, Master Sheet, Revenue, GL, Reports, Settings, etc. |
| **CRM Admin** | Platform operator — creates/suspends tenants. **Not** a tenant user. |

### 2.2 Stack (test environment)

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React + TypeScript + Tailwind (`src/`) |
| Backend | NestJS + Prisma (`backend/`), API prefix `/api/v1` |
| Database | PostgreSQL (`citext` required) |
| Auth | JWT access + refresh, RBAC, branch + tenant scope |
| Files | Uploads under `UPLOAD_DIR/{tenantId}/…` |

### 2.3 Operating modes

| Mode | Condition | QA note |
|------|-----------|---------|
| **API (production path)** | `VITE_API_URL` set | **Required for all formal QA** |
| **Mock (dev only)** | `VITE_API_URL` unset | Local Zustand demo — **do not use for UAT sign-off** |
| **Production build** | `import.meta.env.PROD` | Demo-login shortcuts disabled; API URL required |

### 2.4 Primary business flow (happy path)

```text
Tenant setup (branches, users, countries, universities, courses, banks, SMTP)
        ↓
Master Sheet (student) ← counsellor ownership
        ↓
Commission Invoice (Draft → Send) → Accrual JE + optional email/PDF
        ↓
Remittance / Bulk Allocation → Bank + WHT + FX
        ↓
Sub-agent commission → Payment → Payable JE
        ↓
Expenses / Petty / Payroll → Approvals → GL
        ↓
Reports / Tax / Dashboard / Audit
```

### 2.5 Explicit exclusions (not tenant QA scope unless CR)

- CRM Admin tenant create/suspend UI (except boundary: tenant cannot open it)
- Domain / SSL / hosting procurement
- FBR / bank / open-banking APIs
- Native mobile apps
- SaaS subscription billing / payment gateway
- Impersonation (“login as another user”)
- Full historical Excel migration beyond student CSV import

---

## 3. Actors and roles

### 3.1 Tenant roles

| DB role code | UI label (may vary) | Scope | Typical work |
|--------------|---------------------|-------|--------------|
| `TENANT_ADMIN` | Tenant Admin (matrix may still say “Super Admin”) | All branches in **own tenant** | Setup, users, permissions, full money path, all reports |
| `BRANCH_MANAGER` | Branch Manager | Home branch (HO BM may see all branches) | Branch ops, limited settings/users |
| `ACCOUNTANT` | Accountant | Home branch (HO Accountant may see all) | Invoices, remittance, journals, tax, expenses |
| `CASHIER` | Cashier | Home branch | Petty cash, expenses, bank view as permitted |
| `COUNSELLOR` | Counsellor | Own students (`counsellorId`) | Master Sheet (own), Operations reports only |
| `READ_ONLY` | Read Only | View where matrix ≥ `read` | No create / edit / approve |

Legacy alias: `SUPER_ADMIN` is treated as Tenant Admin.

**Not a tenant role:** `CRM_ADMIN` (platform; `tenantId` null).

### 3.2 Permission model

- **Modules:** Dashboard & Reports, Master Sheet / Students, Invoices & Receivables, Expenses & Petty Cash, Journal Entries, Approvals, Settings, Sub-Agents & Payables, Bank & Cash, Tax & Compliance, Operations.
- **Levels:** `none` < `read` < `limited` < `full`.
- UI hides/disables sidebar items by matrix; API enforces `@RequirePermission`.
- Only **Tenant Admin** may edit the permission matrix.
- **Assignable roles:**
  - Tenant Admin → Branch Manager, Accountant, Cashier, Counsellor, Read Only (cannot assign another Tenant Admin via normal UI).
  - Branch Manager → Accountant, Cashier, Counsellor, Read Only (cannot escalate to Tenant Admin).

### 3.3 Default permission matrix (seed baseline)

| Module | Tenant Admin | Branch Mgr | Accountant | Cashier | Counsellor | Read Only |
|--------|:------------:|:----------:|:----------:|:-------:|:----------:|:---------:|
| Dashboard & Reports | full | full | read | read | read* | read |
| Master Sheet | full | full | read | none | full | read |
| Invoices & Receivables | full | full | full | read | none | read |
| Expenses & Petty Cash | full | full | full | full | none | read |
| Journal Entries | full | limited | full | none | none | read |
| Approvals | full | full | limited | none | none | none |
| Settings | full | limited | none | none | none | none |
| Sub-Agents & Payables | full | full | full | read | none | read |
| Bank & Cash | full | full | full | read | none | read |
| Tax & Compliance | full | full | full | none | none | read |
| Operations | full | full | full | read | none | read |

\*Counsellor `read` on Dashboard & Reports = **Operations reports only** (counsellor, country-wise, university-wise). Other report slugs → **403**.

### 3.4 Branch scope rules

| Actor | Branch behaviour |
|-------|------------------|
| Tenant Admin | May filter **All branches** or one branch |
| HO Branch Manager / HO Accountant | May access all branches within tenant |
| Other roles | Constrained to **home branch** |
| Counsellor | Home branch + `counsellorId = self` on students |

### 3.5 Seeded accounts (staging / local only)

Default password: `ChangeMe123!` (or `SEED_PASSWORD`). **Must be changed before production.**

| Email | Role | Tenant | Notes |
|-------|------|--------|-------|
| `admin@saa.com` | Tenant Admin | DED | seed |
| `admin@demo.local` | Tenant Admin | DEMO | isolation sample |
| `crm@platform.local` | CRM Admin | (none) | platform only |
| Other `@saa.com` users | Various | DED | BM, Accountant, Cashier, Counsellor, Read Only |

Sample branches (DED): HO, KHI, LHR, ISB, MUL, FSD.

### 3.6 Currencies

PKR, GBP, USD, CAD, AUD, EUR — with FX rates to PKR for reporting.

---

## 4. Tenant context and isolation (QA-critical)

### 4.1 Isolation rules

| ID | Rule | Expected result |
|----|------|-----------------|
| TN-01 | Tenant A never sees Tenant B data in lists, search, get-by-id, dashboards, reports, CSV, or file downloads | Empty / 403 / not found — never leak |
| TN-02 | Forged `tenantId` in query/body is ignored or rejected; JWT tenant wins | No cross-tenant access |
| TN-03 | Universities, courses, countries, org name, WHT %, fiscal lock, COA, SMTP are **per tenant** | Independent configs |
| TN-04 | Uploads stored under tenant folder; cross-tenant download denied | 403 |
| TN-05 | Suspended tenant → login rejected | Clear failure, no session |
| TN-06 | Branch isolation still applies **inside** a tenant | BR-ISO cases |
| TN-07 | Tenant Admin cannot open CRM console write/list beyond policy | 403 on `/crm/*` |

Automated assist: `node backend/scripts/qa-run-tenant-isolation.js`  
Branch assist: `node backend/scripts/qa-run-branch-isolation.js`

### 4.2 Login model

1. Email is **globally unique**.
2. User does **not** enter a tenant code; tenant is inferred from the user record.
3. Successful login loads that user’s `tenantId` into JWT context.
4. Subdomain-per-tenant routing is **out of v1**.

---

## 5. Screen / navigation map (tenant)

| Area | Routes | Page purpose |
|------|--------|--------------|
| Auth | `/login` | Email + password |
| Dashboard | `/` | Management dashboard **or** Counsellor dashboard |
| Master Sheet | `/master-sheet` | Students CRUD + CSV |
| Revenue | `/invoices`, `/other-invoices`, `/receivables`, `/receivables/allocation` | Commission invoices, other invoices, remittance, bulk allocate |
| Sub-Agents | `/sub-agents`, `/sub-agents/commissions`, `/sub-agents/payments` | Master, commission sheet, payouts |
| Cash & Expenses | `/petty-cash`, `/expenses`, `/bank-cash` | Petty, expenses, bank/cheques/recon |
| Accounting | `/general-ledger`, `/journal-entries`, `/contra-entries` | COA/TB, journals, contra |
| Tax & Ledgers | `/tax-compliance`, `/ledgers/student`, `/ledgers/vendor`, `/ledgers/sub-agent` | Tax period + party ledgers |
| Operations | `/payroll`, `/documents`, `/approvals`, `/audit-trail` | Payroll, files, approvals, audit |
| Reports | `/reports`, `/reports/*` | Hub + dedicated report pages |
| Settings | `/settings/branches`, `/settings/users`, `/settings/system`, `/settings/email` | Org setup + SMTP |
| Profile | `/profile` | Profile + change password |

**Exclude from tenant testing as feature under test:** `/crm/tenants`, `/crm/mail-delivery` (boundary only).

Responsive layout (desktop + mobile) is required for primary flows.

---

## 6. Functional requirements by module

Requirement IDs use prefix **FR-***. Priority: **M** = must (delivered), **S** = should, **C** = could / future.

For each FR, QA should verify: **UI behaviour**, **API enforcement**, **permission gating**, and **tenant/branch scope**.

---

### 6.1 Authentication & security — FR-AUTH

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-AUTH-01 | Sign in with email + password against Postgres | M | Valid user → tokens + shell |
| FR-AUTH-02 | Issue JWT access + refresh tokens | M | Subsequent API calls authorized |
| FR-AUTH-03 | Refresh session; failed refresh forces re-login | M | Expired refresh → `/login` |
| FR-AUTH-04 | Logout invalidates refresh where applicable | M | Protected routes redirect |
| FR-AUTH-05 | Login success/failure auditable | M | Audit trail entries |
| FR-AUTH-06 | Production SPA has no demo-password fill-in | M | PROD build check |
| FR-AUTH-07 | Unauthenticated users redirected to login | M | Deep-link protected routes |
| FR-AUTH-08 | Suspended tenant users cannot log in | M | Clear error |
| FR-AUTH-09 | User can update profile and change password | M | `/profile` |
| FR-AUTH-10 | Wrong password fails with clear message | M | No stack traces to UI |

**API:** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/profile`, `POST /auth/change-password`

---

### 6.2 Dashboard — FR-DASH

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-DASH-01 | Management dashboard shows period metrics: revenue, expenses, net, cash/bank/petty, AR indicators | M | Respects branch filter |
| FR-DASH-02 | Charts: commission-by-university, receivables ageing, branch profit, monthly trend | M | Live API data |
| FR-DASH-03 | Counsellor dashboard shows only that counsellor’s students (pipeline + recent list) | M | No other counsellor data |
| FR-DASH-04 | Metrics respect branch + tenant scope | M | No cross-tenant numbers |

**API:** `GET /dashboard/metrics`, chart endpoints, `GET /dashboard/counsellor`

---

### 6.3 Master Sheet (Students) — FR-STU

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-STU-01 | List / create / update / soft-delete students | M | Soft-deleted excluded from default list |
| FR-STU-02 | Required identity & academic fields (see §7.1) | M | Server validation |
| FR-STU-03 | Application statuses: Applied, Offer, Visa, Enrolled, Deferred, Withdrawn | M | |
| FR-STU-04 | Status changes retain history | M | Status history API/UI |
| FR-STU-05 | Counsellor sees only assigned students | M | Cannot set another counsellor |
| FR-STU-06 | CSV template download + import (API mode) | M | Create/update via import |
| FR-STU-07 | Server-side pagination (`take`/`skip`) | M | Large lists |
| FR-STU-08 | Country from tenant Countries master; university filtered by country | M | Empty masters → empty dropdowns |
| FR-STU-09 | Selecting university prefills currency + expected commission % when configured | M | |
| FR-STU-10 | Course from tenant Courses master | M | |
| FR-STU-11 | Consultant optional (**None** allowed); counsellors locked to self | M | |
| FR-STU-12 | Unique `(tenantId, studentCode)`; soft-delete may allow code reuse per rules | M | |

**API:** `/students` CRUD, `GET /students/:id/status-history`

---

### 6.4 Revenue — FR-REV

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-REV-01 | Create draft commission invoice with lines linked to students; multi-currency + FX | M | One student uniqueness on lines as enforced |
| FR-REV-02 | Send invoice → status Sent + accrual JE; fiscal lock enforced | M | Cannot revert Sent → Draft |
| FR-REV-03 | Optional email of invoice via tenant SMTP on send/resend | M | Requires Email settings |
| FR-REV-04 | Branded PDF letterhead uses tenant invoice branding + logo | M | Settings → System branding |
| FR-REV-05 | Other invoices (non-commission) Draft → Sent → Paid → Closed | M | |
| FR-REV-06 | Remittance against Sent/open invoices (not Draft/Closed): gross, WHT, net PKR → bank | M | WHT from tenant settings |
| FR-REV-07 | Partial remittances until Fully Received / Closed | M | |
| FR-REV-08 | Bulk remittance allocation across invoices | M | `/receivables/allocation` |
| FR-REV-09 | Invoice statuses: Draft, Sent, PartiallyReceived, FullyReceived, Closed | M | UI may show spaced labels |
| FR-REV-10 | Delete blocked if remittances exist | M | |
| FR-REV-11 | Remittance / allocation auto-post GL (incl. FX gain/loss where rates differ) | M | |

**API:** `/invoices` (+ `POST :id/send`), `/other-invoices`, `/receivables` (+ `POST :id/allocate`)

---

### 6.5 Sub-agents & payables — FR-SA

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-SA-01 | Sub-agent master CRUD (identity, NTN, bank details) | M | Tenant-scoped |
| FR-SA-02 | Commission = `grossFee × rate/100 × FX + followOnBonus`; then WHT → net | M | |
| FR-SA-03 | Payment statuses: Pending → Partial → Paid | M | |
| FR-SA-04 | Payment posts JE (expense / WHT / bank) under fiscal lock | M | |
| FR-SA-05 | Sub-agent ledger with running balance | M | |
| FR-SA-06 | Commission accrual may post AP (SubAgentCommission source) | M | Visible in journals |

**API:** `/sub-agents`, `/sub-agent-commissions`, `/sub-agent-payments`, `/sub-agents/:id/ledger`

---

### 6.6 Cash & expenses — FR-CASH

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-CASH-01 | Petty cash in/out with categories and tax components | M | Categories from Settings |
| FR-CASH-02 | Expenses with vendor, category, payment mode, approval workflow | M | |
| FR-CASH-03 | Approve expense posts GL; reject does not | M | |
| FR-CASH-04 | Bank accounts CRUD: name, bank, number, branch, currency, opening balance | M | Required for remittance/payout |
| FR-CASH-05 | Bank deposits / withdrawals / transfers | M | |
| FR-CASH-06 | Cheques: Issued / Cleared / Bounced | M | |
| FR-CASH-07 | Reconciliation matched / unmatched | M | |
| FR-CASH-08 | Contra entries (CashBank / BankBank / CashCash) with JE | M | |

**API:** `/petty-cash`, `/expenses` (+ approve/reject), `/bank-accounts*`, `/bank-transactions`, `/cheques`, `/contra-entries`

---

### 6.7 Accounting / GL — FR-GL

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-GL-01 | Chart of accounts: asset / liability / equity / income / expense | M | Per tenant |
| FR-GL-02 | Manual journal; Σ debit = Σ credit enforced | M | |
| FR-GL-03 | Approve / reverse journals; auto-posted source docs linked | M | |
| FR-GL-04 | Trial balance & account activity from **Approved** lines only | M | BR-01 |
| FR-GL-05 | Fiscal lock blocks posting dated on/before lock | M | BR-02 |
| FR-GL-06 | Party ledgers: student, vendor, sub-agent | M | |
| FR-GL-07 | Journal list pagination | M | |
| FR-GL-08 | Auto journal sources include Invoice, Receivable, Expense, PettyCash, Payroll, SubAgent*, Contra, BulkReceivable, Reversal, etc. | M | Source type visible |

**API:** `/journal-entries`, `/gl/trial-balance`, `/gl/chart`, `/gl/accounts/:code/activity`, `/ledgers/*`

---

### 6.8 Tax & compliance — FR-TAX

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-TAX-01 | Period summary `YYYY-MM`: WHT receivable/payable, GST in/out, SRB-SST, salary tax | M | |
| FR-TAX-02 | Manual tax adjustments (CRUD) included in totals | M | |
| FR-TAX-03 | Live aggregates from remittances, payments, expenses, petty cash, payroll | M | |

**API:** `/tax/summary`, `/tax/records`

---

### 6.9 Payroll — FR-PAY

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-PAY-01 | Employee master CRUD | M | |
| FR-PAY-02 | Salary tax helper: 10% exempt; brackets 2.5% / 7.5% / 12.5% annual → monthly | M | Not full FBR calendar unless CR |
| FR-PAY-03 | Payroll run: Draft → Processed → Paid with JE on pay | M | |
| FR-PAY-04 | Reimbursements approve/reject (Travel, Fuel, Reimbursement, AdvanceSettlement) | M | |
| FR-PAY-05 | Import path for payroll lines as implemented | M | |

**API:** `/employees`, `/payroll-runs` (+ process/import/pay), `/reimbursements`, `/salary-tax-slabs`

---

### 6.10 Operations — FR-OPS

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-OPS-01 | Approvals queue for Expense / Journal / Reimbursement (and similar types) | M | |
| FR-OPS-02 | Segregation of duties: requester cannot approve own item where enforced | M | |
| FR-OPS-03 | Document upload / download / delete; files under tenant folder | M | Types: Invoice, Receipt, Bill, Contract, Agreement |
| FR-OPS-04 | Audit log list with filters + pagination | M | LOGIN, CREATE, UPDATE, APPROVE, SEND, etc. |

**API:** `/approvals`, `/documents`, `/audit-logs`, `/notifications`

---

### 6.11 Reports — FR-RPT

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-RPT-01 | Reports hub lists catalog by category | M | |
| FR-RPT-02 | Every catalog slug returns live data via `GET /reports/:slug` | M | Tenant + branch scoped |
| FR-RPT-03 | CSV export via `GET /reports/:slug/csv` | M | |
| FR-RPT-04 | Filters: date range, branch, university/counsellor/country/period where relevant | M | |
| FR-RPT-05 | Counsellor: only Operations reports; others 403 | M | See catalog |
| FR-RPT-06 | Net profit style: Profit/(Loss) − Outstanding = Net Profit where used | M | Counsellor / university PL |

#### Report catalog

| Category | Slug | Title | Counsellor allowed |
|----------|------|-------|--------------------|
| Branch | `branch-income` | Branch Income | No |
| Branch | `branch-expenses` | Branch Expenses | No |
| Branch | `branch-profit` | Branch Profit | No |
| Branch | `branch-cash` | Branch Cash Position | No |
| Consolidated | `university-wise-pl` | University-wise P&L | No |
| Consolidated | `consolidated-pl` | Consolidated P&L | No |
| Consolidated | `consolidated-bs` | Consolidated Balance Sheet | No |
| Consolidated | `consolidated-cf` | Consolidated Cash Flow | No |
| Standard | `trial-balance` | Trial Balance | No |
| Standard | `cash-book` | Cash Book | No |
| Standard | `bank-book` | Bank Book | No |
| Standard | `journal-register` | Journal Register | No |
| Standard | `expense-report` | Expense Report | No |
| Standard | `income-report` | Income Report | No |
| Standard | `receivable-ageing` | Receivable Ageing | No |
| Standard | `payable-ageing` | Payable Ageing | No |
| Standard | `petty-cash` | Petty Cash Report | No |
| Tax | `wht-summary` | WHT Summary | No |
| Tax | `gst-summary` | GST/SRB Summary | No |
| Tax | `salary-tax` | Salary Tax Summary | No |
| Commission | `commission-tracking` | Commission Earned vs Received | No |
| Commission | `subagent-payout` | Sub-Agent Payout Summary | No |
| Commission | `net-margin` | Net Margin per Student | No |
| Operations | `counsellor` | Counsellor Report P&L | **Yes** |
| Operations | `country-wise` | Country-wise Report | **Yes** |
| Operations | `university-wise` | University-wise Report | **Yes** |

---

### 6.12 Settings — FR-SET

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-SET-01 | Branches CRUD; Head Office cannot be deleted | M | Tenant Admin |
| FR-SET-02 | Users CRUD; assignable roles by actor | M | See §3.2 |
| FR-SET-03 | Permission matrix view/edit (Tenant Admin only) | M | |
| FR-SET-04 | Organisation settings: org display name, currencies, tax defaults, fiscal lock | M | Shell branding uses org name |
| FR-SET-05 | Tenant Countries master CRUD | M | Used by students & universities |
| FR-SET-06 | Registered Universities CRUD (country, default commission %, currency) | M | Per tenant |
| FR-SET-07 | Courses master CRUD | M | Used on students & invoice lines |
| FR-SET-08 | University–course rates where implemented | M | |
| FR-SET-09 | Expense / petty-cash categories | M | |
| FR-SET-10 | FX rates maintenance | M | |
| FR-SET-11 | Invoice branding: logo (PNG/JPG/WEBP/GIF &lt;2MB), accent `#RRGGBB`, address/phone/email/website/footer, bank block, email subject/body templates with placeholders | M | |
| FR-SET-12 | Counsellors cannot change tenant settings | M | 403 |

**API:** `/branches`, `/users`, `/permissions/matrix`, `/settings`, `/settings/invoice-logo`, masters under universities/courses/countries/categories/fx-rates/gl-accounts

---

### 6.13 Email / SMTP — FR-MAIL

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-MAIL-01 | Per-tenant SMTP config: Gmail / Microsoft 365 / Outlook / Custom | M | `/settings/email` |
| FR-MAIL-02 | Auth modes: PASSWORD or OAUTH | M | Secrets never returned in GET |
| FR-MAIL-03 | Secrets encrypted at rest | M | |
| FR-MAIL-04 | Test send action | M | |
| FR-MAIL-05 | Delete / disconnect SMTP config | M | |
| FR-MAIL-06 | Invoice send uses tenant SMTP when configured | M | Graceful message if not configured |

Optional infra: Cloudways mail relay (ops concern; see `docs/CLOUDWAYS-MAIL-RELAY.md`).

---

### 6.14 UI / UX — FR-UI

| ID | Requirement | Priority | Acceptance notes |
|----|-------------|----------|------------------|
| FR-UI-01 | Primary flows usable on desktop and narrow/mobile viewport | M | Login + one module minimum |
| FR-UI-02 | Loading/error toasts on API failures; clear 403 messaging | M | |
| FR-UI-03 | Submit buttons show spinner and disable until request finishes | M | Prevents double-submit |
| FR-UI-04 | Sidebar / command palette respect permissions | M | Missing menus = no access |

---

## 7. Field & validation reference (high-value for QA)

### 7.1 Student (Master Sheet)

| Field | Required | Notes |
|-------|:--------:|-------|
| Student code | Yes | Unique per tenant |
| Name | Yes | |
| CNIC / passport | Yes | |
| Contact | As enforced | |
| Email | No | Validated if present |
| Branch | Yes | Writable branch only |
| Counsellor | No | Counsellors forced to self |
| Country | Yes | From tenant Countries |
| University | Yes | From tenant Universities; country filter |
| Course | Yes | From tenant Courses |
| Intake | Yes | |
| Group | Optional | |
| Application status | Yes | Enum §8 |
| Sub-agent | Optional | |
| Tuition | Yes | ≥ 0 |
| Scholarship | As modelled | |
| Expected commission % | Yes | 0–100 |
| Currency | Yes | 3-letter code |

### 7.2 Invoice branding

| Field | Constraint |
|-------|------------|
| Logo | PNG / JPG / WEBP / GIF; max 2 MB |
| Accent color | `#RRGGBB` |
| Email templates | Placeholders e.g. `{{invoiceNo}}`, `{{invoiceDate}}`, `{{orgName}}` |
| Bank block | Name, branch, city, account title/no, SWIFT, IBAN |

### 7.3 Common uniqueness (per tenant)

- Branch code  
- Student code  
- Invoice number  
- University number / name rules as implemented  
- Country name, course name, category names  

---

## 8. Status enums (expected values)

| Domain | Values |
|--------|--------|
| ApplicationStatus | Applied, Offer, Visa, Enrolled, Deferred, Withdrawn |
| InvoiceStatus | Draft, Sent, PartiallyReceived, FullyReceived, Closed |
| OtherInvoiceStatus | Draft, Sent, Paid, Closed |
| ApprovalStatus | Pending, Approved, Rejected |
| AllocationStatus | pending, allocated |
| SubAgentCommissionStatus | Pending, Partial, Paid |
| PayrollRunStatus | Draft, Processed, Paid |
| ChequeStatus | Issued, Cleared, Bounced |
| ReconciliationStatus | Matched, Unmatched |
| TenantStatus | Active, Suspended, Trial |
| PermissionLevel | none, read, limited, full |
| GlAccountType | asset, liability, equity, income, expense |
| TaxType | WhtReceivable, WhtPayable, GstInput, GstOutput, SrbSst, SalaryTax |
| SmtpProvider | GMAIL, MICROSOFT365, OUTLOOK, CUSTOM |
| SmtpAuthMode | PASSWORD, OAUTH |

---

## 9. Key business rules

| ID | Rule |
|----|------|
| BR-01 | Only **Approved** journal entries affect trial balance and GL balances. |
| BR-02 | Fiscal lock date blocks creating/posting documents dated on/before lock. |
| BR-03 | Journal lines must balance (debits = credits) within rounding tolerance. |
| BR-04 | Invoice send, remittance, and allocations auto-post GL when rules apply. |
| BR-05 | Sub-agent payable uses rate × FX + bonus; WHT reduces net payable. |
| BR-06 | Counsellor data isolation by `counsellorId`. |
| BR-07 | Soft-deleted masters/students excluded from default lists. |
| BR-08 | Posted source documents that created JEs are not freely deleted; reverse where provided. |
| BR-09 | Salary tax uses documented helper brackets (not full FBR calendar unless CR). |
| BR-10 | Multi-currency amounts convert to PKR using invoice FX or FX rate table. |
| BR-11 | Cannot remittance Draft or Closed invoices. |
| BR-12 | Cannot delete invoice that has remittances. |
| BR-13 | Cannot change Sent invoice back to Draft. |
| BR-14 | Head Office branch is not deletable. |
| BR-15 | All business data is tenant-scoped; child rows inherit via parent FK. |
| BR-16 | Cross-branch write by non–all-branch users → Forbidden. |
| BR-17 | Countries / universities / courses must exist in Settings before (or while) adding students. |

---

## 10. End-to-end scenarios for QA

### E2E-01 — First-time tenant setup (Tenant Admin)

1. Login as Tenant Admin → shell shows **organisation name**.  
2. Settings → Branches: confirm HO; add a branch.  
3. Settings → Users: create Accountant / Counsellor; adjust matrix if needed.  
4. Settings → System: set org name; add Countries; add Universities; add Courses; set WHT % / fiscal lock if testing lock.  
5. Settings → System → Invoice branding: logo + bank block.  
6. Settings → Email: configure SMTP (or skip and note invoice email skipped).  
7. Bank & Cash: add bank account.  
8. Sub-Agents: add one agent (optional for E2E-02).  

**Pass:** All masters load for this tenant only; no CRM menus.

### E2E-02 — Core money path

1. Master Sheet → create student (country/uni/course, optional sub-agent).  
2. Invoices → create Draft → **Send** (JE posted; email if SMTP).  
3. Remittance → record receipt to bank (partial then full if desired).  
4. (If sub-agent) Commission → Payment.  
5. Expenses → create → Approvals → Approve (GL posted).  
6. Petty cash entry.  
7. Journal register shows auto entries; Trial Balance loads.  
8. Dashboard metrics reflect activity; open Branch Income + Trial Balance CSV.  

**Pass:** Full path completes without cross-tenant leakage; balances coherent.

### E2E-03 — Counsellor isolation

1. Login as Counsellor.  
2. Sees only own students; dashboard is counsellor view.  
3. Cannot open Settings write / Trial Balance / consolidated reports.  
4. Can open Operations reports only.  

**Pass:** 403 / hidden menus for disallowed areas.

### E2E-04 — Branch isolation

1. Login as non-HO Branch Manager.  
2. Lists/filters show home branch data only.  
3. Cannot write to another branch’s records.  

**Pass:** BR-ISO cases pass.

### E2E-05 — Dual-tenant isolation

1. Provision / use Tenant A (`admin@saa.com`) and Tenant B (`admin@demo.local`).  
2. Create uniquely named student/uni in each.  
3. Confirm A never lists B’s data (students, settings org name, reports, documents).  

**Pass:** TN-ISO suite green.

### E2E-06 — Fiscal lock

1. Set fiscal lock date in Settings.  
2. Attempt invoice send / journal / remittance with date ≤ lock.  

**Pass:** Blocked with clear error; later dates succeed.

---

## 11. Non-functional requirements (tenant-relevant)

| ID | Area | Requirement |
|----|------|-------------|
| NFR-01 | Security | HTTPS in production; secrets not in client bundles |
| NFR-02 | AuthZ | Business APIs behind JWT + permission + branch + tenant guards |
| NFR-03 | Audit | Mutations leave audit trail |
| NFR-04 | Performance | Pagination on students, journals, audit; scoped reports |
| NFR-05 | Availability | `GET /health` reports API + DB |
| NFR-06 | Usability | Loading states, toasts, 403 messaging |
| NFR-07 | Isolation | Dual-tenant proof scripts pass on staging |
| NFR-08 | Backup | Client/ops responsible for Postgres + uploads |

---

## 12. Representative API surface (tenant)

Base: `/api/v1`

| Group | Endpoints (representative) |
|-------|----------------------------|
| Auth | `/auth/login`, `/refresh`, `/logout`, `/me`, `/profile`, `/change-password` |
| Org | `/branches`, `/users`, `/permissions/matrix` |
| Settings | `/settings`, `/settings/invoice-logo`, `/settings/email/*` |
| Masters | universities, courses, countries, sub-agents, vendors, bank-accounts, categories, currencies, fx-rates, gl-accounts |
| Students | `/students` |
| Revenue | `/invoices`, `/other-invoices`, `/receivables` |
| Payables | `/sub-agent-commissions`, `/sub-agent-payments` |
| Cash | `/petty-cash`, `/expenses`, `/bank-transactions`, `/cheques`, `/contra-entries` |
| GL | `/journal-entries`, `/gl/*`, `/ledgers/*` |
| Tax / Payroll | `/tax/*`, `/employees`, `/payroll-runs`, `/reimbursements` |
| Ops | `/approvals`, `/documents`, `/audit-logs`, `/notifications` |
| Insights | `/dashboard/*`, `/reports`, `/reports/:slug`, `/reports/:slug/csv` |
| Health | `/health` |

CRM platform routes are **not** for tenant QA feature coverage.

---

## 13. Data model (logical — tenant-owned)

| Area | Entities |
|------|----------|
| Org | Tenant, Branch, User, UserBranchAccess, RefreshToken |
| Settings | SystemSetting, TenantSmtpConfig, FxRate, ExpenseCategory, PettyCashCategory |
| Masters | TenantCountry, University, Course, UniversityCourseRate, SubAgent, Vendor, BankAccount, GlAccount |
| Students | Student, StudentStatusHistory |
| Revenue | Invoice, InvoiceLine, OtherInvoice, OtherInvoiceLine, Receivable, ReceivableAllocation |
| Payables | SubAgentCommission, SubAgentPayment |
| Cash | PettyCashEntry, Expense, BankTransaction, Cheque, ContraEntry |
| GL | JournalEntry, JournalLine, PartyLedgerEntry |
| Tax / Payroll | TaxRecord, Employee, PayrollRun, PayrollLine, Reimbursement |
| Ops | Document, Approval, Notification, AuditLog |

**Platform-shared (not tenant-owned):** Role, AppModule, RoleModulePermission, Currency, PaymentMode, Country (reference), SalaryTaxSlab.

Physical schema: `backend/prisma/schema.prisma`.

---

## 14. Role × process matrix (quick)

| Process | Tenant Admin | Branch Mgr | Accountant | Cashier | Counsellor |
|---------|:------------:|:----------:|:----------:|:-------:|:----------:|
| Settings masters | ● | ○ | — | — | — |
| Email / branding | ● | ○ | — | — | — |
| Add students | ● | ● | ○ | — | ● (own) |
| Invoices / remittance | ● | ● | ● | — | — |
| Sub-agent pay | ● | ● | ● | ○ | — |
| Expenses / petty cash | ● | ● | ● | ● | — |
| Bank accounts | ● | ● | ● | ○ | — |
| Journals / GL | ● | ○ | ● | — | — |
| Tax / payroll | ● | ○ | ● | — | — |
| Approvals | ● | ● | ○ | — | — |
| Full reports | ● | ○ | ● | — | Ops only |

● = primary · ○ = limited / read · — = typically none  

---

## 15. Acceptance criteria (tenant UAT)

The tenant application is **functionally accepted** when:

1. All **Must** FR-* items in §6 pass on staging/production with `VITE_API_URL` set.  
2. E2E-01 and E2E-02 complete successfully.  
3. E2E-03 (counsellor), E2E-04 (branch), E2E-05 (dual-tenant) pass.  
4. Production build has no demo-password path.  
5. Tenant Admin cannot operate CRM console; CRM Admin cannot open tenant accounting modules.  
6. Client completes [UAT-CHECKLIST.md](./UAT-CHECKLIST.md) sign-off.  

### Automated assists

```bash
cd backend
API_BASE=https://…/api/v1 node scripts/verify-m14.js
API_BASE=https://…/api/v1 node scripts/verify-m15.js
API_BASE=https://…/api/v1 node scripts/verify-mt9-migration.js
node scripts/qa-run-tenant-isolation.js
node scripts/qa-run-branch-isolation.js
```

Detailed case IDs: `docs/qa/test-cases/01-authentication.md` … `17-tenant-isolation.md`.

---

## 16. Traceability to QA suites

| FSD area | QA folder / suite |
|----------|-------------------|
| FR-AUTH | `docs/qa/test-cases/01-authentication.md` |
| Roles / permissions | `02-rbac.md` |
| Dashboard | `03-dashboard.md` |
| Students | `04-students.md` |
| Revenue | `05-revenue.md` |
| Sub-agents | `06-sub-agents.md` |
| Cash | `07-cash.md` |
| GL | `08-general-ledger.md` |
| Tax | `09-tax.md` |
| Payroll | `10-payroll.md` |
| Operations | `11-operations.md` |
| Reports | `12-reports.md` |
| Settings (+ email/branding) | `13-settings.md` |
| NFR | `14-non-functional.md` |
| E2E | `15-end-to-end.md` |
| Branch isolation | `16-branch-isolation.md` |
| Tenant isolation | `17-tenant-isolation.md` |

---

## 17. Assumptions and dependencies

1. Formal QA runs in **API mode** against a seeded or provisioned staging DB.  
2. Dual-tenant isolation requires a second tenant (seed DEMO or CRM-provisioned).  
3. SMTP/email tests need valid SMTP credentials or Cloudways relay in that environment.  
4. Salary tax helper brackets are accepted as documented unless a CR replaces them.  
5. Browsers: current Chrome / Edge / Firefox / Safari; mobile browser for primary flows.  
6. Seed passwords are for staging only and must be rotated for production.

---

## 18. Revision history

| Ver | Date | Author | Changes |
|-----|------|--------|---------|
| 1.0 | 10 Oct 2026 | Delivery | Tenant-focused FSD for QA: multi-tenant roles, full module FR set, email/branding/courses/countries, E2E scenarios, isolation rules |

---

## 19. Approval

| Party | Signature | Date |
|-------|-----------|------|
| QA Lead | | |
| Client | | |
| Delivery lead | | |

**End of FSD-TENANT-QA-2026**
