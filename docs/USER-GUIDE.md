# User guide — D’ Educationist Accounting (API-backed)

This guide assumes the **production / API** path: the app is built with `VITE_API_URL` and talks to Nest + PostgreSQL. Screens may look empty until data is entered (seed data is for staging only).

The product is **multi-tenant**: each consultancy (tenant) has its own students, invoices, settings, and universities.

> **Full process (tenant users only):** see **[TENANT-USER-PROCESS-GUIDE.md](./TENANT-USER-PROCESS-GUIDE.md)** — setup → students → invoices → remittance → cash → GL → tax → payroll → reports.  
> **CRM Admin** (platform) is separate — see [TRAINING-CRM-VS-TENANT-ADMIN.md](./TRAINING-CRM-VS-TENANT-ADMIN.md). This short guide is for **tenant users**.

## 1. Sign in

1. Open the app URL provided by your administrator.  
2. Enter your **email and password only** — your organisation is inferred from your account (you do not enter a tenant code).  
3. Optional: “Remember email on this device”.  
4. After login, **tenant users** land on the **Dashboard** (accounting).

Passwords are managed by your Tenant Admin / Branch Manager. Demo shortcuts appear only on local development builds.

If your organisation is **Suspended**, login is rejected — contact your platform operator.

## 2. Roles (summary)

| Role | Typical access |
|------|----------------|
| Tenant Admin (legacy label “Super Admin”) | All branches **inside your organisation**, settings, users, full reports |
| Branch Manager | Own branch operations + limited settings |
| Accountant | Journals, tax, revenue, expenses |
| Cashier | Cash, bank, expenses |
| Counsellor | Own students + Operations reports only |
| Read Only | View where permitted |

If you see “permission” / 403 errors, ask Tenant Admin to adjust role modules under **Settings → Users & Roles**.

## 3. Daily flows (summary)

Detail steps, checklists, and troubleshooting are in **[TENANT-USER-PROCESS-GUIDE.md](./TENANT-USER-PROCESS-GUIDE.md)**.

### Setup (first time)

1. **Settings → Branches**  
2. **Settings → Users & Roles**  
3. **Settings → System**: Countries, Registered Universities, categories, org name  
4. **Bank & Cash → Add Bank Account**  
5. Sub-Agents master (if used)

### Students (Master Sheet)

- **Country** and **University** dropdowns load from Settings (country first, then universities for that country).  
- **Consultant** is optional (None allowed).  
- CSV Template / Import for bulk load.

### Invoicing & remittance

1. **Revenue → Invoices** — create, send.  
2. **Remittance** — record university payment (WHT if applicable).  
3. **Allocation** — for bulk remittances, allocate to invoices.  

### Sub-agents → Cash → Accounting → Tax / Payroll → Reports

Follow the full process guide sections 6–11.

## 4. Branch switcher

Tenant Admins can select **All branches** or a single branch **within your organisation**. Other roles are fixed to their home branch.

## 5. Getting help

1. Check **Audit Trail** for recent actions.  
2. Confirm with Admin that your role has the module permission.  
3. Escalate with screenshot + approximate time.  
4. See “Common issues” in the [process guide](./TENANT-USER-PROCESS-GUIDE.md#14-common-issues-tenant-side).

## 6. What this guide does not cover

- CRM Admin platform console  
- FBR / bank API integrations  
- Native mobile apps  
- Hosting / DNS (see Deployment runbook for engineers)  
- Payment / billing gateway  
