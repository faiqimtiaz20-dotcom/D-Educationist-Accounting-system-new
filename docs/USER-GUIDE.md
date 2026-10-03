# User guide — D' Educationist Accounting (API-backed)

This guide assumes the **production / API** path: the app is built with `VITE_API_URL` and talks to Nest + PostgreSQL. Screens may look empty until data is entered (seed data is for staging only).

The product is **multi-tenant**: each consultancy (tenant) has its own students, invoices, settings, and universities. Platform operators use a separate **CRM Admin** console — see [TRAINING-CRM-VS-TENANT-ADMIN.md](./TRAINING-CRM-VS-TENANT-ADMIN.md).

## 1. Sign in

1. Open the app URL provided by your administrator.  
2. Enter your **email and password only** — your organisation is inferred from your account (you do not enter a tenant code).  
3. Optional: “Remember email on this device”.  
4. After login:
   - **Tenant users** land on the **Dashboard** (accounting).  
   - **CRM Admin** lands on **Tenants** (platform console — no ledger).  

Passwords are managed by your Tenant Admin / Branch Manager (or platform CRM for new tenants). Demo shortcuts appear only on local development builds.

If your organisation is **suspended**, login is rejected — contact your platform operator.

## 2. Roles (summary)

| Role | Typical access |
|------|----------------|
| CRM Admin | Platform only: create / suspend / activate tenants. **No** Master Sheet, GL, or reports |
| Tenant Admin (legacy label “Super Admin”) | All branches **inside your organisation**, settings, users, full reports |
| Branch Manager | Own branch operations + limited settings |
| Accountant | Journals, tax, revenue, expenses |
| Cashier | Cash, bank, expenses |
| Counsellor | Own students + Operations reports only |
| Read Only | View where permitted |

If you see “permission” / 403 errors, ask Tenant Admin to adjust role modules under **Settings → Users & Roles**.

## 3. Daily flows

### Students (Master Sheet)

- Filter by branch / status / intake.  
- **Add** student → save.  
- Update **application status** as the pipeline moves.  
- CSV **Template** / **Import** available for bulk load (API creates rows when connected).

### Invoicing & remittance

1. **Revenue → Invoices** — create, send.  
2. **Remittance** — record university payment (WHT if applicable).  
3. **Allocation** — for bulk remittances, allocate to invoices.  

Sending an invoice and booking remittance posts to the **General Ledger** automatically when approved rules apply.

### Sub-agents

1. Maintain agents under **Sub-Agents**.  
2. **Commission Sheet** — payable from invoice students.  
3. **Payments** — record payouts (WHT share handled in posting).

### Cash & expenses

- **Petty Cash** — in/out with categories.  
- **Expenses** — submit → **Approvals** (or accountant approve).  
- **Bank & Cash** — balances and movements.

### Accounting

- **Journal Entries** — drafts, approve, reverse.  
- **General Ledger** — trial balance / account activity.  
- Fiscal lock (if set in system settings) blocks back-dated posts.

### Tax & payroll

- **Tax Compliance** — period `YYYY-MM` summaries (WHT, GST/SRB, salary tax).  
- **Payroll** — employees, runs, reimbursements; paying a run posts GL.

### Operations

- **Approvals** — pending expenses / journals / reimbursements.  
- **Documents** — upload supporting files.  
- **Audit Trail** — who changed what (paginated).

### Reports

Open **Reports** from the sidebar. Branch / consolidated / tax / commission reports use live data. Export **CSV** where available (PDF letterhead is not included unless separately delivered).

Counsellors only see **Operations** reports (counsellor P&L, country-wise, university-wise).

## 4. Branch switcher

Tenant Admins can select **All branches** or a single branch **within your organisation**. Other roles are fixed to their home branch. There is no switcher to another consultancy.

## 5. Getting help

1. Check **Audit Trail** for recent failed/successful actions.  
2. Confirm with Admin that your role has the module permission.  
3. Escalate with screenshot + approximate time (for log correlation).

## 6. What this guide does not cover

- FBR / bank API integrations  
- Native mobile apps  
- Full historical Excel migration  
- Hosting / DNS setup (see Deployment runbook for engineers)  
- Payment / billing gateway (tenant status only in v1)  
- CRM Admin “login as” a tenant user (not in v1)
