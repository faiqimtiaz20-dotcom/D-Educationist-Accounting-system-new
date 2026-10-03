# MT1 — Tenant schema inventory

**Migration:** `20261001120000_mt1_tenant`  
**Default tenant id:** `a0000000-0000-4000-8000-000000000001` (`DED` / D' Educationist)  
**Date:** 1 October 2026

## Platform-shared (no `tenant_id`)

| Table | Reason |
|-------|--------|
| `roles` | Global role catalogue (CRM_ADMIN added in MT2) |
| `app_modules` | Global module catalogue |
| `role_module_permissions` | Global permission matrix |
| `currencies` | Shared ISO currency codes |
| `payment_modes` | Shared payment mode codes |
| `countries` | Shared country codes |
| `salary_tax_slabs` | Shared tax tables (v1) |
| `refresh_tokens` | Session tokens; user → tenant |
| `user_branch_access` | User → tenant via user |
| `student_status_history` | Child of student |
| `invoice_lines` | Child of invoice |
| `other_invoice_lines` | Child of other invoice |
| `receivable_allocations` | Child of receivable |
| `journal_lines` | Child of journal entry |
| `payroll_lines` | Child of payroll run |

## Business tables with `tenant_id` (NOT NULL + DEFAULT = DED)

| Table | Unique change |
|-------|---------------|
| `tenants` | new table (`code` unique) |
| `branches` | `(tenant_id, code)` |
| `users` | nullable `tenant_id` (CRM_ADMIN later); default DED |
| `fx_rates` | `(tenant_id, currency_code, effective_date)` |
| `system_settings` | `(tenant_id, key)` |
| `expense_categories` | `(tenant_id, name)` |
| `petty_cash_categories` | `(tenant_id, name)` |
| `universities` | index only |
| `sub_agents` | index only |
| `vendors` | index only |
| `students` | `(tenant_id, student_code)` |
| `invoices` | `(tenant_id, invoice_no)` |
| `other_invoices` | `(tenant_id, invoice_no)` |
| `bank_accounts` | index only |
| `receivables` | `(tenant_id, receipt_no)` |
| `sub_agent_commissions` | index only |
| `sub_agent_payments` | index only |
| `petty_cash_entries` | index only |
| `expenses` | index only |
| `bank_transactions` | index only |
| `cheques` | index only |
| `contra_entries` | index only |
| `gl_accounts` | `(tenant_id, code)` |
| `journal_entries` | `(tenant_id, entry_no)` |
| `party_ledger_entries` | index only |
| `tax_records` | index only |
| `employees` | index only (`user_id` remains globally unique) |
| `payroll_runs` | index only |
| `reimbursements` | index only |
| `documents` | index only |
| `approvals` | index only |
| `audit_logs` | nullable + default (platform CRM audit later) |

## Parity notes (MT1)

- App behaviour remains **single-tenant** until MT2/MT3.
- Prisma `@default` + SQL `DEFAULT` keep creates working without explicit `tenantId`.
- Composite unique lookups use `DEFAULT_TENANT_ID` from `src/common/tenant.constants.ts`.
- **Email** stays globally unique (D4).

## Evidence

- Migration applied via `prisma migrate deploy`
- Backfill verification SQL: `backend/scripts/mt1-verify-backfill.sql`
- Smoke: login + list API (see MT1 section in MULTI-TENANT-MILESTONES.md)
