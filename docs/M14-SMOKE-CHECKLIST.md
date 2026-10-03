# M14 — Frontend API cutover smoke checklist

Use with `VITE_API_URL` set and Nest on `:3001`. Automated: `cd backend && node scripts/verify-m14.js`.

## Auth / mode

- [ ] Production build without `VITE_API_URL` shows config error (not mock data)
- [ ] Production build hides demo-account password shortcuts
- [ ] Dev + API mode: login with `admin@saa.com` / `ChangeMe123!`
- [ ] Session refresh / expired token returns to login

## Sidebar routes (business data from API)

- [ ] Dashboard metrics
- [ ] Master Sheet (paginated students)
- [ ] Invoices / Other invoices / Remittance
- [ ] Sub-agents / commissions / payments
- [ ] Petty cash / Expenses / Bank & cash
- [ ] General ledger / Journal entries (paginated list hydrate)
- [ ] Tax compliance / ledgers
- [ ] Payroll / Documents / Approvals
- [ ] Audit trail (paginated)
- [ ] Reports hub + one dedicated + one generic slug
- [ ] Settings: branches / users / system

## RBAC

- [ ] Counsellor cannot open Trial Balance report (403)
- [ ] Counsellor Master Sheet shows own students only
