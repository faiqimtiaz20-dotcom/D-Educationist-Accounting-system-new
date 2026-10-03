# Project Proposal  
## D’ Educationist Accounting System

**Prepared for:** D’ Educationist Private Limited  
**Website:** [https://deducationist.com/](https://deducationist.com/)  
**Prepared by:** ______________________________  
**Proposal date:** 20 July 2026  
**Proposal validity:** 15 days from the date of issue  
**Reference:** DE-ACC-2026-001  

---

## 1. Executive Summary

This proposal covers the design, development, and delivery of a **multi-branch commission accounting system** tailored for D’ Educationist’s study-abroad consultancy operations in Pakistan.

The system will centralize student records, university commission invoicing, remittances, sub-agent payouts, expenses, payroll, general ledger, approvals, audit trail, and financial reporting — with role-based access for Super Admin, Branch Managers, Accountants, and Counsellors.

| Item | Detail |
|------|--------|
| **Project fee** | **USD 3,500** (fixed) |
| **Payment terms** | **50% advance** · **50% on final delivery** |
| **Duration** | **2 months** (8 weeks) |
| **Currency** | United States Dollars (USD) |

---

## 2. Client & Project Overview

| | |
|---|---|
| **Client** | D’ Educationist Private Limited |
| **Industry** | Study abroad consultancy & education services |
| **Project name** | D’ Educationist Accounting System |
| **Objective** | Digitize and consolidate branch-wise financial and commission operations into one secure web application |

### Business challenges addressed
- Scattered Excel / manual tracking of commissions and remittances  
- Limited branch-wise visibility for management  
- Manual sub-agent commission and payment reconciliation  
- Need for counsellor-level and university-level profit visibility  
- Lack of centralized approvals, audit trail, and role-based access  

---

## 3. Scope of Work

### 3.1 Core modules included

| # | Module | Description |
|---|--------|-------------|
| 1 | **Authentication & security** | Secure login, session handling, role-based access control (RBAC) |
| 2 | **Dashboard** | Management KPIs and separate counsellor dashboard |
| 3 | **Master Sheet** | Student / application pipeline with branch and counsellor assignment |
| 4 | **Invoices** | Multi-currency commission invoices, send / resend, status workflow |
| 5 | **Remittance** | Receipts against invoices with university, bank, and currency tracking |
| 6 | **Sub-Agents** | Sub-agent master, commission sheet, payments, and ledger |
| 7 | **Cash & Expenses** | Petty cash, expenses, bank & cash views |
| 8 | **Accounting** | General ledger (COA), journal entries, auto-posting foundations |
| 9 | **Tax & Ledgers** | Tax compliance screens; student, vendor, and sub-agent ledgers |
| 10 | **Payroll** | Employee payroll with Pakistan salary tax logic |
| 11 | **Operations** | Documents, approvals workflow, audit trail |
| 12 | **Reports hub** | Branch, consolidated, commission, tax, and operations reports |
| 13 | **Settings** | Branches, users & roles, system settings |
| 14 | **Responsive UI** | Desktop and mobile-friendly layout |

### 3.2 Key reports included

**Branch**
- Branch Income  
- Branch Expenses  
- Branch Profit (with detail drill-down)  
- Branch Cash Position (with detail drill-down)  

**Consolidated**
- University-wise P&L  
- Consolidated P&L  
- Consolidated Balance Sheet  
- Consolidated Cash Flow  

**Commission / Operations**
- Counsellor Report Profit and Loss  
- Country-wise Report  
- University-wise Report  
- Commission earned vs received, sub-agent payout, net margin (as per agreed report set)  

**Tax / Standard**
- WHT, GST/SRB, Salary Tax summaries and standard registers (as per agreed list)  

### 3.3 Key business logic included
- Multi-branch data scoping (Super Admin: all branches; others: own branch)  
- Commission income and remittance outstanding tracking  
- Sub-agent payable calculation and payment recording  
- Net profit formula where applicable: **Profit/(Loss) − Outstanding = Net Profit**  
- Pakistan payroll tax calculation (as configured)  
- Audit logging of critical actions  

---

## 4. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| UI components | Modern component library (Radix / shadcn-style) |
| State | Zustand (client state) / API-driven data from backend |
| Charts | Recharts |
| Routing | React Router |
| **Backend** | **Node.js (Express / NestJS-style REST API)** |
| **Database** | **PostgreSQL** |
| Auth | JWT / session-based authentication with role-based access |
| Branding | D’ Educationist name and logo |

Hosting (e.g. Render, Railway, VPS, or client-preferred cloud) will be confirmed at kickoff. Domain, SSL, and server costs remain client-side unless agreed as an add-on.

---

## 5. Deliverables

1. Fully working web application as per Section 3 (React frontend + **Node.js backend** + **PostgreSQL database**)  
2. Source code handover (frontend + backend + database migrations/schema) on final payment  
3. Admin / Super Admin access credentials  
4. Basic user guide (PDF or shared document)  
5. One remote training / walkthrough session (up to 2 hours)  
6. Deployment support for first production go-live (hosting credentials to be provided by client, or arranged as optional add-on)  
7. Environment configuration guide (`.env.example` for frontend and backend)  

---

## 6. Timeline — 2 Months

| Phase | Week | Activities |
|-------|------|------------|
| **Phase 1 — Kickoff & foundation** | Week 1–2 | Requirements freeze, branding, Node.js API setup, PostgreSQL schema, auth/RBAC, branches/users, base layout |
| **Phase 2 — Core operations** | Week 3–4 | Master Sheet, invoices, remittance, sub-agents, expenses, petty cash |
| **Phase 3 — Accounting & payroll** | Week 5–6 | GL/journals, ledgers, payroll, approvals, audit trail, tax screens |
| **Phase 4 — Reports & UAT** | Week 7 | Full report suite, filters/sorting, counsellor & university P&L, bug fixes |
| **Phase 5 — Go-live** | Week 8 | UAT sign-off, training, deployment, final handover |

### Milestones

| Milestone | Target | Payment trigger |
|-----------|--------|-----------------|
| Project start / kickoff | Week 1 | **Advance 50%** due |
| Mid review (core modules demo) | End of Week 4 | Progress review (no payment) |
| UAT & final delivery | End of Week 8 | **Balance 50%** due |

---

## 7. Commercial Terms

### 7.1 Project fee

| Description | Amount (USD) |
|-------------|--------------|
| D’ Educationist Accounting System — full development package | **3,500.00** |
| **Total project value** | **USD 3,500.00** |

### 7.2 Payment schedule

| Installment | When | Amount |
|-------------|------|--------|
| **Advance (50%)** | On proposal acceptance / before development start | **USD 1,750.00** |
| **Final (50%)** | On UAT sign-off and delivery of source code + go-live build | **USD 1,750.00** |
| **Total** | | **USD 3,500.00** |

### 7.3 Payment method
Bank transfer / Wise / Payoneer / other mutually agreed channel.  
Bank details will be shared on invoice after acceptance.

### 7.4 Inclusions
- Development as per scope in Section 3  
- Up to **two (2)** rounds of minor UI/logic revisions during UAT  
- Training session and basic documentation  

### 7.5 Exclusions (not included in USD 3,500)
- Third-party costs: domain, SSL, hosting, SMS/email provider fees  
- FBR / PEPPOL / bank API integrations (can be quoted separately)  
- Mobile native apps (iOS/Android)  
- Data migration from legacy Excel beyond an agreed sample template  
- Ongoing monthly support after free warranty period (see Section 8)  
- Major scope changes after kickoff sign-off  

---

## 8. Warranty & Support

| Item | Terms |
|------|--------|
| **Bug-fix warranty** | **30 days** after final delivery for defects in agreed scope |
| **Response** | Reasonable effort within 1–2 business days during warranty |
| **Post-warranty** | Optional AMC / support retainer — to be quoted separately (suggested: USD 100–200 / month) |

---

## 9. Change Requests

Any feature not listed in Section 3 will be treated as a **change request**, estimated in writing (time + cost) and started only after written client approval.

---

## 10. Client Responsibilities

To keep the 2-month schedule, the client will provide:

1. Timely feedback (within 3 business days of each review)  
2. Final logo, brand colors, and letterhead if needed for invoices  
3. Sample data / business rules confirmation (commission rates, branches, roles)  
4. Hosting / domain access (if client-managed) or approval of hosting plan  
5. Named UAT contact for sign-off  

Delays in client feedback may extend the delivery date without penalty to the developer.

---

## 11. Assumptions

- Primary users: internal staff (not public student portal)  
- English UI  
- Multi-branch Pakistan operations (Karachi, Lahore, Islamabad, etc.)  
- Multi-currency commission tracking with PKR reporting  
- **Backend stack fixed as Node.js; database fixed as PostgreSQL**  
- One production environment in scope (plus optional staging if hosting allows)  
- Scope frozen after Week 1 kickoff (except paid change requests)  

---

## 12. Acceptance Criteria

The project will be considered complete when:

1. Modules in Section 3 are available in the production/staging build  
2. Super Admin can manage branches, users, and view all-branch reports  
3. Branch users see only their branch data (as per RBAC)  
4. Counsellor dashboard/report shows counsellor-scoped data  
5. Client completes UAT checklist and provides written / email sign-off  
6. Source code and credentials are handed over after final payment  

---

## 13. Confidentiality & Intellectual Property

- Both parties will keep business and technical information confidential.  
- Upon **full payment**, source code and project IP for this system transfer to the client.  
- Until final payment, the developer retains ownership of the work product.  
- Third-party libraries remain under their respective open-source licenses.  

---

## 14. Acceptance of Proposal

By signing below, the client accepts this proposal, the scope, timeline, and commercial terms.

| | Client | Developer |
|---|--------|-----------|
| **Name** | | |
| **Designation** | | |
| **Organization** | D’ Educationist Private Limited | |
| **Signature** | | |
| **Date** | | |

**Advance due on acceptance:** USD **1,750.00**  
**Balance due on delivery:** USD **1,750.00**  
**Total:** USD **3,500.00**  
**Duration:** **2 months**

---

## 15. Next Steps

1. Client reviews and signs this proposal  
2. Advance invoice issued → payment of **USD 1,750**  
3. Kickoff meeting (Week 1) — requirements freeze & branding  
4. Development as per 8-week plan  
5. Mid demo (Week 4)  
6. UAT, training, go-live (Week 8)  
7. Final payment **USD 1,750** → source code handover  

---

*Thank you for the opportunity to partner with D’ Educationist. We look forward to delivering a reliable accounting system that supports your multi-branch study-abroad operations.*

**Contact:** ______________________________  
**Email:** ______________________________  
**Phone:** ______________________________  
