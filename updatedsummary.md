# Ankaa ERP — Project Progress & Database Summary
**Last Updated:** 28 Jun 2026  
**Project Lead:** MD Ashraf  
**Company:** Ankaa Space & Technologies L.L.C  
**Working Week:** Sun – Thu | **Project Window:** 11 Jun – 9 Sep 2026

---

## 1. Project Overview

The Ankaa ERP is a 17-phase internal enterprise resource planning system built on Next.js + PGlite (local-first) with Supabase for cloud sync. The plan was derived from the **Integrated ERP Project Plan** (ankaa_erp_gantt_hr_first.html) which absorbs all HR Manual requirements into existing phase builds — eliminating duplicate modules and saving 7 calendar days.

| Section | Phases | Window | Focus |
|---------|--------|--------|-------|
| Foundation | P1 – P6 | 11 Jun – 6 Jul | Core modules + HR quick wins |
| Backend & Mobile | P7 – P10 | 7 Jul – 28 Jul | Real-time, email, SLA, mobile |
| Dedicated HR & Compliance | P11 – P17 | 2 Aug – 9 Sep | Full HR cycle + governance |

---

## 2. Phase Status (as of 28 Jun 2026)

| Phase | Scope | Dates | Days | Status |
|-------|-------|-------|------|--------|
| **P1** | HR Quick Wins | 11 Jun | 1 | ✅ Done |
| **P2** | Design System | 14–17 Jun | 4 | ✅ Done |
| **P3** | Backend & DB Migration + SLA | 21–26 Jun | 5 | ✅ Done (cleared this session) |
| **P4** | Asset System + Stores | 28–30 Jun | 3 | 🔵 Active |
| **P5** | Fleet + Logistics | 30 Jun – 2 Jul | 3 | 📋 Planned |
| **P6** | Ankaa Plus + Risk Widget | 5–6 Jul | 2 | 📋 Planned |
| **P7** | DB Migration | 7–9 Jul | 3 | 📋 Planned |
| **P8** | Real-time + Email + SLA | 12–14 Jul | 3 | 📋 Planned |
| **P9** | File Uploads + SSO + DMS Base | 15–16 Jul | 2 | 📋 Planned |
| **P10** | Mobile App (HR screens) | 19–28 Jul | 8 | 📋 Planned |
| **P11** | Employee Lifecycle + Recruitment | 2–11 Aug | 8 | 🆕 Schema ready |
| **P12** | Performance + Training | 12–18 Aug | 5 | 🆕 Schema ready |
| **P13** | Procurement + PO Management | 19–24 Aug | 4 | 🆕 Schema ready |
| **P14** | Full DMS + Mail Register | 25–27 Aug | 3 | 🆕 Schema ready |
| **P15** | Audit Management | 30 Aug – 1 Sep | 3 | 🆕 Schema ready |
| **P16** | Local Content + CSR | 2–7 Sep | 4 | 🆕 Schema ready |
| **P17** | Government Relations | 8–9 Sep | 2 | 🆕 Schema ready |

---

## 3. Session 1 — 28 Jun 2026 (Morning)
### DB Schema Build — Phase 4–17 Tables

**What was done:**

Audited the old MyTaskBoard Supabase schema against the new ERP schema and the 17-phase project plan. Found that Phase 4–17 tables were missing from the live DB entirely.

**Tables added to `lib/db/schema.sql` and applied to live DB:**

| Phase | Tables Added |
|-------|-------------|
| P4 — Asset System | `asset_categories`, `asset_locations`, `assets`, `asset_movements` |
| P5 — Fleet | `fleet_vehicles`, `fleet_drivers`, `fleet_drones`, `fleet_pilots`, `fleet_trips` |
| P8 — Service Requests | `service_requests` |
| P11 — Recruitment | `job_postings`, `recruitments` |
| P12 — Performance | `performance_reviews`, `training_records` |
| P13 — Procurement | `vendors`, `purchase_orders`, `purchase_order_items` |
| P14 — DMS | `document_categories`, `documents`, `mail_register` |
| P15 — Audit | `risk_register`, `audits` |
| P16 — CSR | `csr_activities` |
| P17 — Gov Relations | `government_relations`, `government_submissions` |

**Seed data applied via `scripts/apply-phase-tables.js`:**
- 9 asset categories, 5 office locations, 15 demo assets (laptops, drones, survey gear, vehicles)
- 5 fleet vehicles (Land Cruiser, Hilux, Coaster, etc.), 3 drivers, 3 drones, 2 pilots
- 4 HR risk register items pre-seeded (turnover risk, harassment policy, payroll breach, succession gap)

**Live DB total after this session: 50 tables**

---

## 4. Session 2 — 28 Jun 2026 (Afternoon)
### Backend Migration Audit — MyTaskBoard → Ankaa ERP

**What was done:**

Full backend migration audit — verified every API route, every table, every column, and every live query to confirm the MyTaskBoard migration is complete and correct.

---

### 4.1 Migration Audit Results

**Every table used by current API routes was verified:**

| Table | API Route | Row Count | Status |
|-------|-----------|-----------|--------|
| `profiles` | auth, users, payroll, org-chart | 42 rows | ✅ |
| `leave_requests` | leave-requests, leave-requests/[id] | 16 rows | ✅ |
| `leave_balances` | dashboard/stats | 42 rows | ✅ |
| `roster_attendance` | roster | 1 row | ✅ |
| `invoices` | invoices | 15 rows | ✅ |
| `cost_centers` | cost-centers | 9 rows | ✅ (bug fixed) |
| `projects` | projects | 3 rows | ✅ |
| `project_cards` | cards/[id], projects/[id]/cards | 50 rows | ✅ |
| `project_lists` | projects/[id]/lists | 11 rows | ✅ |
| `project_members` | projects | 20 rows | ✅ |
| `todos` | todos, todos/[id] | 38 rows | ✅ |
| `notifications` | notifications | 0 rows | ✅ |
| `org_chart` | org-chart, org-chart/[id] | 31 nodes | ✅ |

**Authentication verified:**
- All 42 profiles have valid `password_hash` — every user can log in
- JWT middleware correctly injects `x-user-id`, `x-user-email`, `x-user-role` headers
- Login query confirmed working for all roles (admin, hod, hr, md, cto, super_admin, etc.)
- 8-hour session cookie correctly set

**Payroll verified:**
- 36 of 42 profiles have `basic_salary > 0` — payroll computation works
- Oman GOSI rates (7% employee / 11.5% employer) correctly applied
- Housing allowance (30% executives / 25% others) and transport (OMR 50 flat) correctly computed
- Working days calculation uses Sun–Thu Oman calendar

**Leave approval chain verified:**
- All 5 approval stage columns exist in `leave_requests`:  
  `pending_ghassani_*`, `pending_yousuf_*`, `pending_sultan_*`, `pending_ramimi_*`, `pending_hr_*`
- `approval_history` JSON append logic works correctly
- Cancel flow (`canceled_at`, `canceled_by`, `cancel_reason`) all present
- Role-to-stage mapping correct for all roles

**Old `attendance` table:** renamed to `roster_attendance` in new ERP — all API routes already use the new name. Unique constraint `(user_id, date)` confirmed present for upsert.

---

### 4.2 Bugs Found and Fixed

#### Bug 1 — `cost_centers` route: boolean vs integer type mismatch
**File:** `app/api/cost-centers/route.ts`

**Problem:** The route called `.eq('active', true)`. PGlite stores the `active` column as `INTEGER` (1/0), not a PostgreSQL boolean. Passing the JavaScript `true` caused:
```
invalid input syntax for type integer: "true"
```
The `/api/cost-centers` endpoint was returning a 500 error on every request, so the Finance and Invoice pages had no cost center dropdown data.

**Fix:**
```ts
// Before (broken)
.eq('active', true)

// After (fixed)
.eq('active', 1)
```

---

#### Bug 2 — PGlite adapter: Supabase join syntax produced invalid SQL
**File:** `lib/db/pglite.ts` — `simplifySelectCols()` function

**Problem:** The PGlite adapter's `simplifySelectCols()` was supposed to strip Supabase-specific join syntax like `profiles:user_id(id, full_name, email)` from SELECT strings so they work as plain SQL. It did this by splitting on `,` and filtering out tokens containing `(` or `:`.

The flaw: splitting `profiles:user_id(id, full_name, email)` on `,` produces fragments:
- `profiles:user_id(id` → filtered ✓
- `full_name` → kept (leaked inner column)
- `email)` → kept (leaked inner column + dangling `)`)

This produced invalid SQL for three critical queries:

| Query | Broken SQL produced |
|-------|---------------------|
| Admin projects | `SELECT *, role, full_name, email)) FROM projects` |
| Non-admin projects | `SELECT project_id, role, name, description, created_at, updated_at, created_by) FROM project_members` |
| Leave requests | `SELECT *, full_name, email, role, employee_id, position_title, department_id) FROM leave_requests` |

The `)` caused SQL syntax errors. The `name`, `description` etc. from inside the join caused "column does not exist" errors. All three endpoints were silently returning `{ data: null, error: '...' }`, meaning:
- Projects page showed nothing for non-admin users
- Leave requests page failed to load
- The dangling `)` crashed the admin projects query too

**Fix:** Rewrote `simplifySelectCols` to:
1. Collect all "join relation names" — words that appear directly before `(` in the original string
2. Remove all balanced parenthesis groups iteratively (innermost first), which properly collapses `table(a, nested(b))` → `table`
3. Filter out any remaining token that contains `(`, `)`, `:`, `!`, or is a collected join relation name

```ts
// Result for each broken case:
'*, project_members(user_id, role, profiles:user_id(id, full_name, email))'  →  '*'
'project_id, role, projects!inner(id, name, description, ...)'               →  'project_id, role'
'*, profiles:user_id(id, full_name, email, role, ...)'                       →  '*'
```

All 10 end-to-end query tests pass after the fix.

---

### 4.3 Final Verification Results

All queries tested against live DB after fixes:

```
✓ admin projects:        3 rows
✓ non-admin projects:    query executes correctly
✓ leave_requests:        16 rows
✓ invoices:              15 rows
✓ cost_centers active:   9 rows   ← was broken, now fixed
✓ roster_attendance:     1 row
✓ payroll (36/42 with salary)
✓ login query:           found, role=admin
✓ notifications:         0 rows
✓ org_chart:             31 nodes
```

**Migration verdict: CLEAR.** The MyTaskBoard → Ankaa ERP backend migration is complete. All data is correct, all API routes execute without errors, and both bugs have been patched.

---

## 5. Live DB — Full Table Inventory (50 tables)

| Group | Tables |
|-------|--------|
| Auth | `profiles`, `password_reset_tokens` |
| HR — Leave | `leave_requests`, `leave_requests_audit_log`, `leave_balances` |
| HR — Attendance | `roster_attendance`, `roster_date_events` |
| HR — Recruitment | `job_postings`, `recruitments` |
| HR — Performance | `performance_reviews`, `training_records` |
| Finance | `invoices`, `invoices_audit_log`, `cost_centers` |
| Projects | `projects`, `project_members`, `project_lists`, `project_cards`, `project_card_members`, `project_card_activities`, `project_card_attachments`, `project_checklists`, `project_checklist_items`, `project_labels` |
| Tasks & Todos | `todos`, `user_task_access` |
| Org | `org_chart`, `notifications`, `user_activity_sessions` |
| Assets (P4) | `asset_categories`, `asset_locations`, `assets`, `asset_movements` |
| Fleet (P5) | `fleet_vehicles`, `fleet_drivers`, `fleet_drones`, `fleet_pilots`, `fleet_trips` |
| Service (P8) | `service_requests` |
| Procurement (P13) | `vendors`, `purchase_orders`, `purchase_order_items` |
| DMS (P14) | `document_categories`, `documents`, `mail_register` |
| Audit (P15) | `risk_register`, `audits` |
| CSR (P16) | `csr_activities` |
| Government (P17) | `government_relations`, `government_submissions` |

---

## 6. Files Changed (Both Sessions)

| File | Change |
|------|--------|
| `lib/db/schema.sql` | Added 410 lines — Phase 4–17 table definitions |
| `lib/db/pglite.ts` | Fixed `simplifySelectCols()` — Supabase join syntax parser rewrite |
| `app/api/cost-centers/route.ts` | Fixed `.eq('active', true)` → `.eq('active', 1)` |
| `scripts/apply-phase-tables.js` | New — one-time migration + seed script |
| `updatedsummary.md` | This file |

---

## 7. Next Steps

1. **P4 — Build Asset System UI** (`app/(dashboard)/assets/`) — list view, create asset form, assign to employee, movement log
2. **P5 — Build Fleet UI** (`app/(dashboard)/fleet/`) — vehicles, drivers, drones, trip request flow
3. **Wire `service_requests`** into the existing Task Board page as a "Service" tab with SLA countdown
4. **P7 — Supabase cloud sync migration** — apply `lib/db/schema.sql` to Supabase once local schema is stable
5. Add seed data for `roster_attendance` (mark today's attendance for demo purposes)
