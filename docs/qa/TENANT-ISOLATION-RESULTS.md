# Tenant Isolation QA Results (TN-ISO-001 … 015)

**Rule:** Tenant A must never see Tenant B transactional or master data. CRM Admin cannot access tenant GL/business APIs. Tenant Admin cannot call CRM APIs. Uploads live under `uploads/{tenantId}/`.

**Environment:** `http://127.0.0.1:3001/api/v1`  
**Tenant A:** DED (`admin@saa.com`)  
**Tenant B:** DEMO (`admin@demo.local`)  
**CRM:** `crm@platform.local`  
**Ran:** 2026-10-01T14:38:36.591Z

## Totals

| Status | Count |
| --- | ---: |
| Pass | 15 |
| Fail | 0 |
| Blocked | 0 |

## Results

| TC ID | Status | Actual |
| --- | --- | --- |
| TN-ISO-001 | **Pass** | aCount=30 foreign=0 |
| TN-ISO-002 | **Pass** | status=200 hits=0 |
| TN-ISO-003 | **Pass** | status=404 |
| TN-ISO-004 | **Pass** | a=14 b=0 listLeak=0 directB=404 |
| TN-ISO-005 | **Pass** | a=43 b=0 listLeak=0 directB=404 |
| TN-ISO-006 | **Pass** | a=100 b=0 listLeak=0 directB=404 |
| TN-ISO-007 | **Pass** | a=200 b=200 leak=false |
| TN-ISO-008 | **Pass** | status=200 len=1885 leak=false |
| TN-ISO-009 | **Pass** | status=403 leak=false |
| TN-ISO-010 | **Pass** | gl=403 students=403 |
| TN-ISO-011 | **Pass** | status=403 |
| TN-ISO-012 | **Pass** | aLeak=false demoHas=true a=24 b=1 |
| TN-ISO-013 | **Pass** | aOrg=D' Educationist bOrg=Demo Agency (MT4) |
| TN-ISO-014 | **Pass** | up=201 key=a0000000-0000-4000-8000-000000000001/35a361ef-d715-483b-bc69-f2e9968e3e44.txt cross=404 |
| TN-ISO-015 | **Pass** | bCount=1 foreignA=0 |

Evidence JSON: `docs/qa/evidence/tenant-isolation-results.json`