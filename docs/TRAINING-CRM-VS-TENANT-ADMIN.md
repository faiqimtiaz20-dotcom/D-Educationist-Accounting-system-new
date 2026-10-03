# Training notes — CRM Admin vs Tenant Admin

**Document ID:** MT9-TRAINING-ROLES  
**Date:** 1 October 2026  
**Audience:** Platform operators + consultancy admins  
**Related:** [USER-GUIDE.md](./USER-GUIDE.md) · [TRAINING-AGENDA.md](./TRAINING-AGENDA.md) · [FSD-MULTI-TENANT-ADDENDUM.md](./FSD-MULTI-TENANT-ADDENDUM.md)

---

## 1. Two different jobs

| | **CRM Admin** (platform) | **Tenant Admin** (was “Super Admin”) |
|--|--------------------------|--------------------------------------|
| **Who** | Your SaaS / ops team | Consultancy owner / head office |
| **Login** | e.g. `crm@platform.local` | e.g. `admin@saa.com` |
| **Tenant** | None (`tenantId` null) | Exactly one company |
| **SPA shell** | **Platform CRM** — Tenants only | **Accounting** — Master Sheet, GL, reports, settings |
| **Can create companies** | Yes (`/crm/tenants`) | No |
| **Can see other companies’ data** | No (no ledger access) | No (scoped to own tenant) |
| **Branches** | n/a | All branches **inside own tenant** |
| **Billing (v1)** | Set Active / Suspended / Trial only | Sees org settings; no payment gateway |

**Never** give CRM credentials to a tenant user. **Never** use Tenant Admin to manage other consultancies.

---

## 2. Login (D4)

- Email is **globally unique**. Tenant is inferred from the user — **no tenant code** on the login form.  
- If a tenant is **Suspended**, its users cannot sign in.  
- CRM Admin cannot access `/students`, `/gl-accounts`, reports, etc. (403).  

---

## 3. CRM Admin daily tasks

1. Sign in → land on **Tenants**.  
2. **Create tenant** — code, name, Tenant Admin email/password, HO city. System provisions COA / categories / settings template.  
3. **Suspend** / **Activate** as needed.  
4. Do **not** expect Master Sheet or invoices — those stay with the tenant.

Impersonation (“login as tenant user”) is **not** in v1.

---

## 4. Tenant Admin daily tasks

1. Sign in → **Dashboard** / accounting nav.  
2. Manage **branches**, **users**, **universities**, students, revenue, cash, GL, reports — all for **this organisation only**.  
3. Branch switcher = branches inside this tenant (not other companies).  
4. Organisation name under **Settings → System** brands invoices/shell for this tenant.

UI may still say “Super Admin” in some matrix labels; it means **Tenant Admin** (full access within one tenant).

---

## 5. Suggested training split

| Segment | Minutes | Content |
|---------|---------|---------|
| Platform ops | 20 | CRM console, create/suspend tenant, what CRM cannot see |
| Tenant Admin | 90 | Existing [TRAINING-AGENDA.md](./TRAINING-AGENDA.md) money path |
| Isolation reminder | 10 | Why two tenants never share students/universities |

---

## 6. Quiz (optional)

1. Can CRM open Trial Balance? → **No**.  
2. Can Tenant Admin list all platform tenants? → **No**.  
3. After suspend, can Tenant B admin log in? → **No**.  
4. Do universities sync across tenants? → **No** (per-tenant masters).  

---

*End of CRM vs Tenant Admin training notes.*
