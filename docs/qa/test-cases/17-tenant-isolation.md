# Tenant isolation — TN-ISO-001 … TN-ISO-015

**Rule.** Tenant A (DED) never sees Tenant B (DEMO) data. Universities and settings are **per tenant**. CRM Admin cannot access tenant business APIs. Tenant Admin cannot call CRM tenant APIs. Document uploads are stored under `uploads/{tenantId}/…`.

**Actors**

| Code | User | Tenant |
| --- | --- | --- |
| A | admin@saa.com (Tenant Admin) | DED |
| B | admin@demo.local (Tenant Admin) | DEMO |
| CRM | crm@platform.local | Platform (null) |

**Runner.** `node backend/scripts/qa-run-tenant-isolation.js`  
**Evidence.** `docs/qa/evidence/tenant-isolation-results.json` · `docs/qa/TENANT-ISOLATION-RESULTS.md`

| ID | Theme |
| --- | --- |
| TN-ISO-001 | A student list ↛ B |
| TN-ISO-002 | Search ↛ B student |
| TN-ISO-003 | Direct UUID of B student → 403/404 |
| TN-ISO-004 | Invoices A ↛ B (+ direct id) |
| TN-ISO-005 | Expenses A ↛ B (+ direct id) |
| TN-ISO-006 | Journals A ↛ B (+ direct id) |
| TN-ISO-007 | Reports A/B no cross ids |
| TN-ISO-008 | CSV export no B markers |
| TN-ISO-009 | Forged `?tenantId=` rejected / ignored |
| TN-ISO-010 | CRM ↛ GL / students |
| TN-ISO-011 | Tenant Admin ↛ `/crm/tenants` |
| TN-ISO-012 | Universities per tenant |
| TN-ISO-013 | Settings orgName independent |
| TN-ISO-014 | Upload path `uploads/{tenantId}/` + cross download denied |
| TN-ISO-015 | B student list ↛ A |

A case **fails** if HTTP 200 returns foreign tenant ids/codes/names, or if CRM/Tenant boundaries return 200 on forbidden routes.
