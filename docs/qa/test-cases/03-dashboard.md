# Dashboard — DASH-001 … DASH-007

**Module:** Management and counsellor dashboards  
**FSD:** FR-DASH-01 … FR-DASH-04  
**Route:** `/`  
**Preconditions.** Fiscal data exists from seed (or from a completed E2E-001). Signed-in session as named.

---

### DASH-001 — Management dashboard shows the period money metrics

| | |
| --- | --- |
| **FSD** | FR-DASH-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Sign in as `admin@saa.com`.
2. Open **Dashboard**.
3. Note the period selector if one is shown. Leave it on the current month.
4. Read revenue, expenses, net, cash, bank, petty cash, and receivables / AR indicators.
5. Compare one figure (monthly revenue) to `GET /dashboard/metrics`.

**Expected result**

- `GET /dashboard/metrics` returns **200**.
- `monthlyRevenue` is a number and matches the card (formatting may add commas; the value must match).
- Expenses, net, cash/bank/petty, and an AR indicator are present. Empty labels or `undefined` are a **Fail**.
- Net is consistent with revenue and expenses for the same period (revenue − expenses, as defined on the card). Investigate if the card shows a number the API does not return.

---

### DASH-002 — Commission by university chart loads

| | |
| --- | --- |
| **FSD** | FR-DASH-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. On the management dashboard, locate **commission by university**.
2. Confirm `GET /dashboard/charts/commission-by-university` returns **200** and a JSON array.

**Expected result**

- The chart renders (or an explicit empty state if every university total is zero).
- Each point has a university name and an amount. Seeded data should show at least one university.
- Amounts are PKR (or labelled with currency). A spinner that never finishes is a **Fail**.

---

### DASH-003 — Receivables ageing chart loads

| | |
| --- | --- |
| **FSD** | FR-DASH-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Locate the receivables ageing chart.
2. Confirm `GET /dashboard/charts/receivables-ageing` returns **200** and an array.

**Expected result**

- Buckets (current / age bands) render.
- Totals are not negative unless a credit balance is a real business state and is labelled.
- Hover or table values match the API array.

---

### DASH-004 — Branch profit chart loads

| | |
| --- | --- |
| **FSD** | FR-DASH-02, FR-DASH-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. As Super Admin with **All branches**, open the branch profit chart.
2. Confirm `GET /dashboard/charts/branch-profit` returns **200** and an array.
3. Switch the branch filter to **KHI** only and reload.

**Expected result**

- All-branches view can include more than one branch (seed has HO, KHI, LHR, ISB, MUL, FSD activity as seeded).
- KHI-only view does not include an LHR profit series. If the API still returns other branches, **Fail**.

---

### DASH-005 — Monthly trend chart loads

| | |
| --- | --- |
| **FSD** | FR-DASH-02 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. Locate the monthly trend chart.
2. Confirm `GET /dashboard/charts/monthly-trend` returns **200** and an array.

**Expected result**

- Points are ordered by month.
- The current month’s revenue point is consistent with DASH-001’s monthly revenue (same definition). A large unexplained gap is a **Fail** to investigate, not an automatic pass.

---

### DASH-006 — Counsellor dashboard is limited to that counsellor

| | |
| --- | --- |
| **FSD** | FR-DASH-03 |
| **Priority** | P1 |
| **Type** | Functional + security |

**Steps**

1. Sign in as `fatima@saa.com`.
2. Open `/`.
3. Read pipeline charts and the recent student list.
4. Confirm `GET /dashboard/counsellor` (or the counsellor metrics call the page uses) returns **200**.

**Expected result**

- The page is the counsellor dashboard, not the all-branch management P&L.
- `totalStudents` equals the count of Fatima’s students on Master Sheet (same filters).
- No other counsellor’s name appears as the owner of a student.
- Management-only charts (all-branch profit) are absent.

---

### DASH-007 — Branch Manager dashboard ignores another branch id

| | |
| --- | --- |
| **FSD** | FR-DASH-04 |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. Sign in as `ahmed@saa.com` (KHI).
2. Open Dashboard. Record cash / revenue.
3. Call `GET /dashboard/metrics?branchId=<LHR id>` with Ahmed’s token.

**Expected result**

- The call returns **403**, or **200** with only KHI figures and no LHR-only totals.
- A 200 body that changes the totals to LHR’s figures is a **Fail** (S1).
- The UI branch switcher does not offer LHR.
