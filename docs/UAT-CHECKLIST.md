# UAT checklist — D' Educationist Accounting (API-backed)

**Environment:** _________________ (staging / production)  
**API base:** _________________  
**Build / commit:** _________________  
**Tester:** _________________ · **Date:** _________________

Use a **fresh browser profile** (or private window). Confirm `VITE_API_URL` points at this environment.

Automated assist:

```bash
API_BASE=https://…/api/v1 node backend/scripts/verify-m15.js
API_BASE=https://…/api/v1 node backend/scripts/verify-mt9-migration.js
```

**Status:** Checklist template ready. **Client sign-off below is blank until the client signs** — engineering must not tick sign-off for the client.

---

## A. Access & security

| # | Step | Pass |
|---|------|------|
| A1 | Login as Tenant Admin succeeds; shell shows organisation name | ☐ |
| A2 | Wrong password fails with clear message | ☐ |
| A3 | Logout clears session; protected routes redirect to login | ☐ |
| A4 | Counsellor login cannot open Trial Balance report (403 / restricted hub) | ☐ |
| A5 | Branch Manager sees only own branch data where scoped | ☐ |
| A6 | CRM Admin login lands on Tenants; no Master Sheet / GL in nav | ☐ |
| A7 | Tenant Admin cannot open `/crm/tenants` | ☐ |
| A8 | Suspended tenant: user login rejected | ☐ |

## B. Masters & settings

| # | Step | Pass |
|---|------|------|
| B1 | Settings → Branches list loads from API (this org only) | ☐ |
| B2 | Settings → Users & Roles list loads | ☐ |
| B3 | Settings → System (universities / categories / org name) loads | ☐ |
| B4 | Sub-Agents master CRUD or list works | ☐ |

## C. Core money path

| # | Step | Pass |
|---|------|------|
| C1 | Master Sheet: list students (pagination if many) | ☐ |
| C2 | Create / edit student; status change | ☐ |
| C3 | Create invoice (draft → send) | ☐ |
| C4 | Record remittance / receivable; allocation if bulk | ☐ |
| C5 | Sub-agent commission appears; record payout | ☐ |
| C6 | Record expense → approve (GL posted) | ☐ |
| C7 | Petty cash and/or bank movement visible | ☐ |
| C8 | Journal register shows auto entries; trial balance loads | ☐ |

## D. Ops & compliance

| # | Step | Pass |
|---|------|------|
| D1 | Approvals queue: approve/reject with SoD where applicable | ☐ |
| D2 | Upload document; download; delete (file under tenant folder) | ☐ |
| D3 | Audit trail shows recent actions (paginated) | ☐ |
| D4 | Tax summary for a period loads | ☐ |
| D5 | Payroll: view employees / run (or import) as seeded | ☐ |

## E. Dashboard & reports

| # | Step | Pass |
|---|------|------|
| E1 | Dashboard metrics match period activity (non-zero if seeded) | ☐ |
| E2 | Reports hub lists categories; open Branch Income | ☐ |
| E3 | Open Trial Balance + CSV export | ☐ |
| E4 | Counsellor hub shows Operations reports only | ☐ |

## F. Multi-tenant (if second tenant provisioned)

| # | Step | Pass |
|---|------|------|
| F1 | CRM creates Tenant B; new admin can log in | ☐ |
| F2 | Tenant A student list does not show Tenant B students | ☐ |
| F3 | Tenant B settings org name independent of A | ☐ |

## G. Non-functional

| # | Step | Pass |
|---|------|------|
| G1 | Mobile / narrow viewport usable for login + one module | ☐ |
| G2 | No demo password panel on production build | ☐ |
| G3 | API health shows database `up` | ☐ |

---

## Defects found (UAT rounds)

| Round | ID | Severity | Description | Fixed? |
|-------|-----|----------|-------------|--------|
| 1 | | | | ☐ |
| 1 | | | | ☐ |
| 2 | | | | ☐ |
| 2 | | | | ☐ |

Proposal allowance: **up to two rounds** of minor UI/logic fixes during UAT.

---

## Sign-off

By signing, the client confirms the checklist was executed on the named environment and the system is accepted for go-live under the commercial proposal (warranty clock starts per proposal after formal delivery sign-off).

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Client representative | | | |
| Delivery lead | | | |

**Notes / conditions:**  
_______________________________________________________________

**Engineering note (MT9):** Dual-tenant API proof is documented in [DUAL-TENANT-PROOF.md](./DUAL-TENANT-PROOF.md). That is **not** a substitute for this client sign-off table.
