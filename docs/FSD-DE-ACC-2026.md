# Functional Specification Document (FSD)

**Product:** D’ Educationist Accounting System  
**Document ID:** FSD-DE-ACC-2026  
**Proposal reference:** DE-ACC-2026-182  
**Version:** 1.0  
**Date:** 29 September 2026  
**Status:** Baseline for UAT / handover (aligned to implemented M1–M14; M15 client sign-off pending)

**Multi-tenant follow-on:** See [FSD-MULTI-TENANT-ADDENDUM.md](./FSD-MULTI-TENANT-ADDENDUM.md) and [MULTI-TENANT-MILESTONES.md](./MULTI-TENANT-MILESTONES.md). **MT1 schema/backfill Done**; product behaviour remains single-tenant until MT2+.

| Role | Name | Date |
|------|------|------|
| Prepared by | Delivery (engineering) | 29 Sep 2026 |
| Reviewed by | _________________ | |
| Approved by (Client) | _________________ | |

---

## 1. Purpose

This FSD defines **what the system must do** for end users and operators: modules, screens, business rules, roles, reports, and acceptance criteria. It is the functional contract between the client and the delivery team for the delivered web application (React SPA + NestJS API + PostgreSQL).

It does **not** replace commercial terms in proposal DE-ACC-2026-182. Where this document and the signed proposal conflict, the **signed proposal** prevails unless a written change request (CR) is agreed.

---

## 2. Scope

### 2.1 In scope

1. Multi-branch web application for study-abroad consultancy commission accounting (Pakistan).  
2. Authentication, RBAC, branch scoping, and audit trail.  
3. Student master (Master Sheet) with application pipeline.  
4. University commission invoices, other invoices, remittances, and allocation.  
5. Sub-agent commissions and payouts with GL posting.  
6. Petty cash, expenses (with approval), bank/cash, cheques, contra.  
7. Manual journals, fiscal lock, trial balance / GL inquiry, party ledgers.  
8. Tax summaries (WHT, GST/SRB, salary tax) for configurable periods.  
9. Payroll employees, runs, reimbursements, salary tax helper.  
10. Documents (file upload), approvals queue, audit log.  
11. Management and counsellor dashboards.  
12. Full reports hub (branch, consolidated, operations, tax, commission, standard registers) with **CSV** export.  
13. Settings: branches, users/roles/permissions, system settings, universities, categories.  
14. Deployment documentation, UAT checklist, user guide, training agenda (M15 pack).

### 2.2 Out of scope (exclusions)

Unless approved as a separate CR / add-on:

- Domain registration, SSL certificates, hosting fees  
- FBR / PEPPOL / open banking / bank API integrations  
- Native iOS / Android applications  
- Full historical Excel migration beyond agreed sample / CSV import for students  
- Pixel-perfect PDF letterhead / branded PDF export (CSV is delivered; PDF UI may show “not available”)  
- Email/SMS gateway for invoice send (workflow exists; provider not included)  
- Ongoing AMC after warranty (separate commercial item)  
- Unlimited feature change after UAT freeze  

### 2.3 Operating modes

| Mode | Trigger | Behaviour |
|------|---------|-----------|
| **API (production path)** | `VITE_API_URL` set | SPA talks only to Nest/Postgres for business data |
| **Mock (dev only)** | `VITE_API_URL` unset | Local Zustand seed; password `demo123` |
| **Production build** | `import.meta.env.PROD` | Requires `VITE_API_URL`; demo-login shortcuts disabled |

---

## 3. System overview

### 3.1 Context

```
┌─────────────┐     HTTPS      ┌──────────────────┐      ┌────────────┐
│  Browser    │ ──────────────► │  Vite SPA        │      │  Nest API  │
│  (Users)    │ ◄────────────── │  (React/TS)      │─────►│  /api/v1   │
└─────────────┘                 └──────────────────┘      └─────┬──────┘
                                                                │
                                                                ▼
                                                         ┌────────────┐
                                                         │ PostgreSQL │
                                                         │ + uploads/ │
                                                         └────────────┘
```

### 3.2 Technology stack

| Layer | Choice |
|-------|--------|
| Frontend | Vite, React, TypeScript, Tailwind |
| Backend | NestJS (Node.js 20+), Prisma ORM |
| Database | PostgreSQL 14+ (16 recommended), `citext` extension |
| Auth | bcrypt passwords, JWT access + refresh tokens |
| Files | Local disk via `UPLOAD_DIR` (mountable volume) |

### 3.3 Primary business flow

```
Branches / Users / Masters (universities, sub-agents, banks, COA)
        ↓
Students (Master Sheet) ← counsellor ownership
        ↓
Invoice (commission) → Send → Accrual JE
        ↓
Remittance / Allocation → Cash/Bank + WHT
        ↓
Sub-agent commission → Payment → Payable JE
        ↓
Expenses / Petty / Payroll → Approvals → GL
        ↓
Reports / Tax / Dashboard / Audit
```

---

## 4. Users and roles

### 4.1 Roles

| Role code | Display name | Functional intent |
|-----------|--------------|-------------------|
| `SUPER_ADMIN` | Super Admin | All branches; full settings; all reports |
| `BRANCH_MANAGER` | Branch Manager | Home branch operations; limited user management |
| `ACCOUNTANT` | Accountant | Journals, tax, revenue, expenses, ledgers |
| `CASHIER` | Cashier | Petty cash, bank, expenses (as permitted) |
| `COUNSELLOR` | Counsellor | Own students only; Operations reports only |
| `READ_ONLY` | Read Only | View-only where module permission ≥ `read` |

### 4.2 Permission model

- Modules (examples): Dashboard & Reports, Master Sheet, Invoices & Receivables, Sub-Agents & Payables, Expenses & Petty Cash, Bank & Cash, Journal Entries, Tax & Compliance, Approvals, Operations, Settings.  
- Levels: `none` < `read` < `limited` < `full`.  
- API enforces `@RequirePermission`; UI hides/disables sidebar items by matrix.  
- **Branch scope:** non–Super Admin requests are constrained to home branch (or assigned branches). Super Admin may use `branchId=all` / omit filter.  
- **Counsellor scope:** student and related ops filtered by `counsellorId = current user`.  

### 4.3 Seeded sample users (staging only)

Password from `SEED_PASSWORD` (default `ChangeMe123!`). **Must be changed before production.**

| Email | Role | Branch |
|-------|------|--------|
| admin@saa.com | Super Admin | HO |
| ahmed@saa.com | Branch Manager | KHI |
| sara@saa.com | Accountant | LHR |
| bilal@saa.com | Cashier | ISB |
| fatima@saa.com | Counsellor | KHI |
| usman@saa.com | Accountant | MUL |
| hina@saa.com | Read Only | FSD |
| zain@saa.com | Branch Manager | LHR |

### 4.4 Sample branches

HO (Head Office), KHI, LHR, ISB, MUL, FSD.

### 4.5 Currencies

PKR, GBP, USD, CAD, AUD, EUR — with FX rates to PKR for reporting.

---

## 5. Functional requirements by module

Requirement IDs use prefix **FR-***. Priority: **M** = must (delivered), **S** = should, **C** = could / future.

### 5.1 Authentication & security — FR-AUTH

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUTH-01 | User shall sign in with email + password against Postgres | M |
| FR-AUTH-02 | System shall issue JWT access + refresh tokens | M |
| FR-AUTH-03 | User shall refresh session; failed refresh forces re-login | M |
| FR-AUTH-04 | User shall log out (server invalidates refresh where applicable) | M |
| FR-AUTH-05 | Failed/successful login events shall be auditable | M |
| FR-AUTH-06 | Production SPA shall not offer demo-password fill-in | M |
| FR-AUTH-07 | Unauthenticated users shall be redirected to login | M |

### 5.2 Dashboard — FR-DASH

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DASH-01 | Management dashboard shall show period metrics: revenue, expenses, net, cash/bank/petty, AR indicators | M |
| FR-DASH-02 | Charts shall include commission-by-university, receivables ageing, branch profit, monthly trend | M |
| FR-DASH-03 | Counsellor dashboard shall show only that counsellor’s students (pipeline charts + recent list) | M |
| FR-DASH-04 | Metrics shall respect branch scope | M |

### 5.3 Master Sheet (Students) — FR-STU

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-STU-01 | List/create/update/soft-delete students | M |
| FR-STU-02 | Fields: code, name, CNIC/passport, contact, email, branch, counsellor, country, university, course, intake, group, status, sub-agent, tuition, scholarship, expected commission rate, currency | M |
| FR-STU-03 | Application statuses: Applied, Offer, Visa, Enrolled, Deferred, Withdrawn | M |
| FR-STU-04 | Status changes shall retain history | M |
| FR-STU-05 | Counsellor sees only assigned students | M |
| FR-STU-06 | CSV template download + import creating/updating via API | M |
| FR-STU-07 | Server-side pagination (`take`/`skip`) for large lists | M |

### 5.4 Revenue (Invoices & Remittance) — FR-REV

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-REV-01 | Create draft invoice with lines linked to students; multi-currency + FX | M |
| FR-REV-02 | Send invoice changes status and posts accrual JE (fiscal lock enforced) | M |
| FR-REV-03 | Other invoices (non-commission bill-to) supported | M |
| FR-REV-04 | Record receivable/remittance (gross, WHT, net PKR) to bank account | M |
| FR-REV-05 | Bulk remittance allocation to one or more invoices | M |
| FR-REV-06 | Invoice statuses: Draft, Sent, Partially Received, Fully Received, Closed | M |

### 5.5 Sub-agents & payables — FR-SA

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SA-01 | Maintain sub-agent master (identity, bank details) | M |
| FR-SA-02 | Commission payable = `grossFee × rate/100 × FX + followOnBonus` then WHT → net | M |
| FR-SA-03 | Record payments; status Pending → Partial → Paid | M |
| FR-SA-04 | Payment shall post JE (expense / WHT / bank) under fiscal lock | M |
| FR-SA-05 | Sub-agent ledger inquiry with running balance | M |

### 5.6 Cash & expenses — FR-CASH

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CASH-01 | Petty cash in/out with categories and tax components | M |
| FR-CASH-02 | Expenses with vendor, category, payment mode, approval workflow | M |
| FR-CASH-03 | Approve expense posts GL; reject does not | M |
| FR-CASH-04 | Bank accounts with opening balance + deposits/withdrawals/transfers | M |
| FR-CASH-05 | Cheques lifecycle (issued / cleared / bounced) as modelled | M |
| FR-CASH-06 | Contra entries between bank accounts with JE | M |

### 5.7 Accounting — FR-GL

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-GL-01 | Chart of accounts with types asset/liability/equity/income/expense | M |
| FR-GL-02 | Manual journal draft; Σ debit = Σ credit enforced | M |
| FR-GL-03 | Approve / reverse journals; auto-posted source docs linked | M |
| FR-GL-04 | Trial balance and account activity from **approved** lines only | M |
| FR-GL-05 | Fiscal lock blocks posting in locked periods | M |
| FR-GL-06 | Party ledgers: student, vendor, sub-agent | M |
| FR-GL-07 | Journal list supports pagination | M |

### 5.8 Tax & compliance — FR-TAX

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-TAX-01 | Period summary `YYYY-MM` aggregating WHT receivable/payable, GST in/out, SRB-SST, salary tax | M |
| FR-TAX-02 | Manual tax adjustments (CRUD) included in totals | M |
| FR-TAX-03 | Live aggregates from remittances, payments, expenses, petty cash, payroll | M |

### 5.9 Payroll — FR-PAY

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-PAY-01 | Employee master CRUD | M |
| FR-PAY-02 | Salary tax helper: 10% exempt; brackets 2.5% / 7.5% / 12.5% on annual taxable → monthly | M |
| FR-PAY-03 | Payroll run create / process / pay with JE on pay | M |
| FR-PAY-04 | Reimbursements with approve/reject | M |
| FR-PAY-05 | Import path for payroll lines (as implemented) | M |

### 5.10 Operations — FR-OPS

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-OPS-01 | Unified approvals queue for Expense / Journal / Reimbursement | M |
| FR-OPS-02 | Segregation of duties: requester cannot approve own item where enforced | M |
| FR-OPS-03 | Document upload, download, delete with metadata | M |
| FR-OPS-04 | Audit log list with filters and pagination | M |

### 5.11 Reports — FR-RPT

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-RPT-01 | Reports hub lists all catalog reports by category | M |
| FR-RPT-02 | Every catalog slug returns live Postgres data via `GET /reports/:slug` | M |
| FR-RPT-03 | CSV export via `GET /reports/:slug/csv` | M |
| FR-RPT-04 | Filters: date range, branch, university/counsellor/country/period where relevant | M |
| FR-RPT-05 | Counsellor sees only Operations reports (counsellor, country-wise, university-wise); others 403 | M |
| FR-RPT-06 | Net profit presentation where used: Profit/(Loss) − Outstanding = Net Profit (counsellor / university PL style reports) | M |

#### Report catalog

| Category | Reports |
|----------|---------|
| Branch | Branch Income, Branch Expenses, Branch Profit, Branch Cash Position |
| Consolidated | University-wise P&L, Consolidated P&L, Consolidated Balance Sheet, Consolidated Cash Flow |
| Operations | Counsellor P&L, Country-wise, University-wise |
| Standard | Trial Balance, Cash Book, Bank Book, Journal Register, Expense Report, Income Report, Receivable Ageing, Payable Ageing, Petty Cash |
| Tax | WHT Summary, GST/SRB Summary, Salary Tax Summary |
| Commission | Commission Earned vs Received, Sub-Agent Payout Summary, Net Margin per Student |

### 5.12 Settings — FR-SET

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SET-01 | Branches CRUD (Super Admin) | M |
| FR-SET-02 | Users CRUD; assignable roles by actor role | M |
| FR-SET-03 | Permission matrix view/edit (Super Admin) | M |
| FR-SET-04 | System settings (org, fiscal lock date, etc.) | M |
| FR-SET-05 | Universities, expense/petty categories, currencies/FX, GL accounts via masters APIs | M |

---

## 6. Screen / navigation map

| Sidebar | Routes |
|---------|--------|
| Dashboard | `/` |
| Master Sheet | `/master-sheet` |
| Revenue | `/invoices`, `/other-invoices`, `/receivables`, `/receivables/allocation` |
| Sub-Agents | `/sub-agents`, `/sub-agents/commissions`, `/sub-agents/payments` |
| Cash & Expenses | `/petty-cash`, `/expenses`, `/bank-cash` |
| Accounting | `/general-ledger`, `/journal-entries`, `/contra-entries` |
| Tax & Ledgers | `/tax-compliance`, `/ledgers/student`, `/ledgers/vendor`, `/ledgers/sub-agent` |
| Operations | `/payroll`, `/documents`, `/approvals`, `/audit-trail` |
| Reports | `/reports` + dedicated `/reports/*` paths |
| Settings | `/settings/branches`, `/settings/users`, `/settings/system` |
| Auth | `/login` |

Responsive layout (desktop + mobile viewport) is required for primary flows (FR-UI-01, Must).

---

## 7. Key business rules

| ID | Rule |
|----|------|
| BR-01 | Only **Approved** journal entries affect trial balance and GL balances. |
| BR-02 | Fiscal lock date blocks creating/posting documents dated on/before lock. |
| BR-03 | Journal lines must balance (debits = credits) within rounding tolerance. |
| BR-04 | Invoice send and remittance (incl. allocations) auto-post GL when rules apply. |
| BR-05 | Sub-agent payable uses rate × FX + bonus; WHT reduces net payable. |
| BR-06 | Counsellor data isolation by `counsellorId`. |
| BR-07 | Soft-deleted masters/students are excluded from default lists. |
| BR-08 | Posted source documents that created JEs are not freely deleted; use reversal where provided. |
| BR-09 | Salary tax uses documented helper brackets (not full FBR graduated calendar unless CR). |
| BR-10 | Multi-currency amounts convert to PKR using invoice FX or latest FX rate table. |

---

## 8. Data requirements (logical)

Major entities (normalized PostgreSQL via Prisma):

- Org: `branches`, `users`, `roles`, `modules`, `role_module_permissions`, `settings`  
- Masters: `universities`, `sub_agents`, `vendors`, `bank_accounts`, `gl_accounts`, `currencies`, `fx_rates`, categories  
- Students: `students`, `student_status_history`  
- Revenue: `invoices`, `invoice_lines`, `other_invoices`, `receivables`, `receivable_allocations`  
- Payables: `sub_agent_commissions`, `sub_agent_payments`  
- Cash: `petty_cash_entries`, `expenses`, `bank_transactions`, `cheques`, `contra_entries`  
- GL: `journal_entries`, `journal_lines`, `party_ledger_entries`  
- Tax: `tax_records`  
- Payroll: `employees`, `payroll_runs`, `payroll_lines`, `reimbursements`, `salary_tax_slabs`  
- Ops: `approvals`, `documents`, `audit_logs`  

Detailed physical schema: `backend/prisma/schema.prisma`.

---

## 9. Non-functional requirements

| ID | Area | Requirement |
|----|------|-------------|
| NFR-01 | Security | HTTPS in production; secrets not in git; JWT secrets rotated |
| NFR-02 | AuthZ | All business APIs behind JWT + permission + branch guards |
| NFR-03 | Audit | Mutations leave audit trail (HTTP interceptor + domain events) |
| NFR-04 | Performance | Pagination on students, journals, audit; report queries scoped |
| NFR-05 | Availability | Health endpoint reports API + DB status |
| NFR-06 | Usability | Loading and error toasts on API failures; 403 messaging |
| NFR-07 | Maintainability | Prisma migrations; env examples; verify scripts M4–M15 |
| NFR-08 | Backup | Client responsible for Postgres + `UPLOAD_DIR` backups |

---

## 10. External interfaces

| Interface | Direction | Status |
|-----------|-----------|--------|
| Browser ↔ SPA | Human | Delivered |
| SPA ↔ REST `/api/v1` | JSON / multipart | Delivered |
| API ↔ PostgreSQL | Prisma | Delivered |
| API ↔ local uploads | Files | Delivered |
| Email / SMS / FBR / Bank APIs | — | **Out of scope** |

### Representative API groups

`/auth/*`, `/branches`, `/users`, `/settings`, `/students`, `/invoices`, `/receivables`, `/sub-agent-*`, `/petty-cash`, `/expenses`, `/bank-*`, `/journal-entries`, `/gl/*`, `/ledgers/*`, `/tax/*`, `/employees`, `/payroll-runs`, `/approvals`, `/documents`, `/audit-logs`, `/dashboard/*`, `/reports`, `/reports/:slug`, `/health`.

---

## 11. Acceptance criteria (summary)

The system is **functionally accepted** when:

1. All **Must** FR-* items above pass on a staging/production DB with `VITE_API_URL` set.  
2. Core money path completes: student → invoice send → remittance → sub-agent payment → expense approve → visible in GL/reports.  
3. Counsellor cannot access non-Operations reports.  
4. Production build has no demo-password path.  
5. Client completes [UAT-CHECKLIST.md](./UAT-CHECKLIST.md) sign-off.  
6. Handover items in [HANDOVER.md](./HANDOVER.md) are transferred per commercial terms.

Automated assists: `backend/scripts/verify-m14.js`, `verify-m15.js`.

---

## 12. Assumptions and dependencies

1. Client provides hosting credentials or purchases hosting separately.  
2. Client nominates Super Admin and confirms branch list / currencies at kickoff (M0).  
3. Salary tax helper brackets are accepted as documented (or replaced by CR).  
4. Sample seed data is for staging/demo only.  
5. Browser support: current Chrome / Edge / Firefox / Safari desktop; mobile browser for primary flows.

---

## 13. Related documents

| Document | Path |
|----------|------|
| Milestones | `docs/BACKEND-MILESTONES.md` |
| Deployment | `docs/DEPLOYMENT.md` |
| UAT checklist | `docs/UAT-CHECKLIST.md` |
| User guide | `docs/USER-GUIDE.md` |
| Training agenda | `docs/TRAINING-AGENDA.md` |
| Handover | `docs/HANDOVER.md` |
| Project README | `README.md` |
| Prisma schema | `backend/prisma/schema.prisma` |

---

## 14. Revision history

| Ver | Date | Author | Changes |
|-----|------|--------|---------|
| 1.0 | 29 Sep 2026 | Delivery | Initial FSD aligned to implemented M1–M14 + M15 pack |

---

## 15. Approval

| Party | Signature | Date |
|-------|-----------|------|
| Client | | |
| Delivery lead | | |

**End of FSD-DE-ACC-2026**
