# Branch Isolation QA Results (BR-ISO-001 … 020)

**Rule:** Super Admin sees all branches; every other role is home-branch only. Universities and shared settings are common; transactional data never crosses branches.

**Environment:** `http://127.0.0.1:3001/api/v1`  
**Branch A:** KHI (`ahmed@saa.com`)  
**Branch B:** LHR (`sara@saa.com`)  
**Super Admin:** `admin@saa.com`  
**Ran:** 2026-10-01T14:38:40.190Z

## Totals

| Status | Count |
| --- | ---: |
| Pass | 20 |
| Fail | 0 |
| Blocked | 0 |

## Results

| TC ID | Status | Actual |
| --- | --- | --- |
| BR-ISO-001 | Pass | n=30 foreignLHR=0 hasStudentA=true |
| BR-ISO-002 | Pass | searchHitsForB=0 status=200 |
| BR-ISO-003 | Pass | GET /students/b213b8d3-3f23-4bc7-9452-a661655f7418 status=403 |
| BR-ISO-004 | Pass | invoices=14 foreignLHR=0 |
| BR-ISO-005 | Pass | receivables=30 foreignLHR=0 |
| BR-ISO-006 | Pass | expenses=34 foreignLHR=0 |
| BR-ISO-007 | Pass | pettyCash=24 foreignLHR=0 |
| BR-ISO-008 | Pass | banks=1 foreignBanks=0 balForeign=0 |
| BR-ISO-009 | Pass | journals=100 foreignLHR=0 TB=200 |
| BR-ISO-010 | Pass | incomeForeign=0 branchIncomeOnlyKhi=true statuses=200/200 |
| BR-ISO-011 | Pass | queryStatus=403 sneakHasB=false createStatus=403 createdBranch=null |
| BR-ISO-012 | Pass | isoSearchHits=10 foreign=0 |
| BR-ISO-013 | Pass | adminKhiStudents=30 hasA=true |
| BR-ISO-014 | Pass | adminLhrStudents=1 hasB=true |
| BR-ISO-015 | Pass | adminAll=31 hasBothMarkers=true |
| BR-ISO-016 | Pass | create=201 A=200 B=200 inListA=true inListB=true |
| BR-ISO-017 | Pass | patch=200 A=200/ISO-ORG-mupn38gc Bmgr=200/ISO-ORG-mupn38gc |
| BR-ISO-018 | Pass | create=201 branchId=c92127d0-32e1-40b9-8afd-20929b9011bc A=200 B=403 uniShared=true |
| BR-ISO-019 | Pass | counsellorLeak=false invoiceKhiLeak=0 rptStatus=200 |
| BR-ISO-020 | Pass | csvStatus=200 len=1885 hasLHR=false |

## Failures

_None — all isolation cases passed._

Evidence JSON: `docs/qa/evidence/branch-isolation-results.json`
