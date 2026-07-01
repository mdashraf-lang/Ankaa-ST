# Ankaa ERP — Project Plan

## Employee Accounts

All accounts use the password: `Ankaa@2026`

| # | Full Name | Email | Password | Role |
|---|-----------|-------|----------|------|
| **C-Level** | | | | |
| 1 | Khalid Al Masoudi | khalid@ankaa.om | Ankaa@2026 | md |
| 2 | Mohammed Al Riyami | mohd@ankaa.om | Ankaa@2026 | cto |
| 3 | Ikram Al Balushi | ikram@ankaa.om | Ankaa@2026 | coo |
| **Senior Management** | | | | |
| 4 | Ali Al Ramimi | ali.r@ankaa.om | Ankaa@2026 | admin |
| 5 | Ali Al Ghassani | ali@ankaa.om | Ankaa@2026 | hod |
| **Heads of Department** | | | | |
| 6 | Sultan Al Balushi | sultan@ankaa.om | Ankaa@2026 | hod |
| 7 | Yousuf Al Riyami | yousuf@ankaa.om | Ankaa@2026 | hod |
| 8 | Mekaeel Abdullah | mekaeel@ankaa.om | Ankaa@2026 | hod |
| 9 | Omar Al Ghaithy | omar@ankaa.om | Ankaa@2026 | hod |
| 10 | Fuhood Al Haddabi | fuhood@ankaa.om | Ankaa@2026 | hod |
| 11 | Ahmed Al Kharusi | ahmed.khalid@ankaa.om | Ankaa@2026 | hod |
| 12 | Ahmed Al Kharusi (alias) | ahmed@ankaa.om | Ankaa@2026 | hod |
| 13 | Ahmed Al Mandhiri | ahmed.mondhari@ankaa.om | Ankaa@2026 | hod |
| 14 | Ghaydah Al Jabri | space@ankaa.om | Ankaa@2026 | hod |
| **HR** | | | | |
| 15 | HR Department | hr@ankaa.om | Ankaa@2026 | hr |
| 16 | Huria Al Lawati | huria@ankaa.om | Ankaa@2026 | hr |
| **Finance** | | | | |
| 17 | Fateme Sohrabi | accounts@taqa.om | Ankaa@2026 | finance |
| **Team Members** | | | | |
| 18 | Maathir Al Wahaibi | maathir@ankaa.om | Ankaa@2026 | team_member |
| 19 | Palwasha Asif | palwasha@ankaa.om | Ankaa@2026 | team_member |
| 20 | Imad Al Ramimi | imad@ankaa.om | Ankaa@2026 | team_member |
| 21 | Reham Al Ghanboosi | media@ankaa.om | Ankaa@2026 | team_member |
| 22 | Jamal Al Raisi | jamal@ankaa.om | Ankaa@2026 | team_member |
| 23 | Hilal Al Riyami | hilal@ankaa.om | Ankaa@2026 | team_member |
| 24 | Daniya Al Shabibi | daniya@ankaa.om | Ankaa@2026 | team_member |
| 25 | Mazin Al Toubi | mazinaltubi@ankaa.om | Ankaa@2026 | team_member |
| 26 | Khamis Al Hinai | khamis@ankaa.om | Ankaa@2026 | team_member |
| 27 | Mohammed Ambouri | m.ambouri@ankaa.om | Ankaa@2026 | team_member |
| 28 | Maryam Alkalbani | maryam.alkalbani@ankaa.om | Ankaa@2026 | team_member |
| 29 | Rahma Al Jahwari | rahma@ankaa.om | Ankaa@2026 | team_member |
| 30 | Mohammed Almaskari | m.almaskri@ankaa.om | Ankaa@2026 | team_member |
| 31 | Rayan Al Hashmi | rayan.alhashmi@ankaa.om | Ankaa@2026 | team_member |
| **Collaborators** | | | | |
| 32 | Furwa Asim | furwaasim@ankaa.om | Ankaa@2026 | collaborator |
| 33 | Mohammad Imthiyaz | imthiyaz@ankaa.om | Ankaa@2026 | collaborator |
| **ERP Admin** | | | | |
| 34 | MD Ashraf | ashraf@ankaa.om | Ankaa@2026 | super_admin |

## Role Hierarchy

```
super_admin  — full system access (ERP project lead)
md           — Managing Director
cto / coo    — C-Level officers
admin        — Senior Manager (leave approver level 2)
hod          — Head of Department (leave approver level 1)
hr           — HR Department (final leave approval)
finance      — Finance & Accounts
team_member  — Regular employee
collaborator — External / contract staff
```

## Approval Chain (Leave Requests)

| Employee Group | Flow |
|----------------|------|
| Under Ali Ghassani | pending_ghassani → pending_ramimi → pending_hr → approved |
| Under Yousuf / Sultan | pending_yousuf → pending_sultan → pending_hr → approved |
| HODs & above | direct_approved → approved |
| Under Ali Ramimi directly | pending_ramimi → pending_hr → approved |

## Org Chart

```
Khalid Al Masoudi (MD)
├── Mohammed Al Riyami (CTO)
│   ├── Ali Al Ramimi (Senior Manager)
│   │   ├── Maathir Al Wahaibi
│   │   ├── Imad Al Ramimi
│   │   ├── Reham Al Ghanboosi
│   │   └── Daniya Al Shabibi
│   └── Ali Al Ghassani (HoD)
│       ├── Omar Al Ghaithy (Software Engineering Lead)
│       │   ├── Palwasha Asif
│       │   ├── Mohammed Ambouri
│       │   ├── Maryam Alkalbani
│       │   ├── Rahma Al Jahwari
│       │   ├── Mohammed Almaskari
│       │   ├── Rayan Al Hashmi
│       │   ├── Furwa Asim
│       │   └── Mohammad Imthiyaz
│       ├── Ahmed Al Kharusi (Head of Tech Lab)
│       ├── Fuhood Al Haddabi (Smart Cities Lead)
│       ├── Mekaeel Abdullah (Project Director)
│       ├── Yousuf Al Riyami (Spray Team Leader)
│       └── Jamal Al Raisi (Cybersecurity)
├── Ikram Al Balushi (COO)
│   ├── Sultan Al Balushi (Team Head)
│   │   ├── Hilal Al Riyami (PRO)
│   │   └── Khamis Al Hinai
│   ├── Ghaydah Al Jabri (Space Dept Head)
│   │   └── Mazin Al Toubi
│   ├── HR Department
│   └── Huria Al Lawati (HR Officer)
└── Fateme Sohrabi (Finance & Accounts — TAQA)
```

## Projects Seeded

| Project | Owner | Description |
|---------|-------|-------------|
| MoH – Legal Services | Omar Al Ghaithy | Ministry of Health Legal Grievances & Lawsuits (OutSystems) |
| Smart Cities Initiative | Fuhood Al Haddabi | IoT, Analytics & Urban Management Solutions |
| Ankaa ERP – Internal System | MD Ashraf | Leave management, invoices, HR, projects |

## Cost Centers

| Name | Code |
|------|------|
| MoH – Legal Services | MOH-LGL |
| Smart Cities | SMC-001 |
| Space & Technology | SPC-001 |
| Tech Lab | TLB-001 |
| Operations & Management | OPS-001 |
| HR & Administration | HRA-001 |
| Media & Communications | MED-001 |
| Finance & Accounts | FIN-001 |
| North Batinah Project | NBP-001 |

  ┌─────────────┬──────────────────────────┬──────────────────┐
  │    Role     │          Email           │     Password     │
  ├─────────────┼──────────────────────────┼──────────────────┤
  │ Super Admin │ ashraf@ankaa.om          │ Ashraf@Super2026 │
  ├─────────────┼──────────────────────────┼──────────────────┤
  │ Admin       │ mdashraf@ankaa.om        │ Ashraf@Admin2026 │
  ├─────────────┼──────────────────────────┼──────────────────┤
  │ Trainee     │ mdashraf.intern@ankaa.om │ Ashraf@Train2026 │
  └─────────────┴──────────────────────────┴──────────────────┘


  ┌──────────────────────────┬──────────────────┬─────────────┐
  │          Email           │     Password     │    Role     │
  ├──────────────────────────┼──────────────────┼─────────────┤
  │ ashraf@ankaa.om          │ Ashraf@Super2026 │ Super Admin │
  ├──────────────────────────┼──────────────────┼─────────────┤
  │ mdashraf@ankaa.om        │ Ashraf@Admin2026 │ Admin       │
  ├──────────────────────────┼──────────────────┼─────────────┤
  │ mdashraf.intern@ankaa.om │ Ashraf@Train2026 │ Trainee     │
  ├──────────────────────────┼──────────────────┼─────────────┤
  │ admin@ankaa.om           │ Ankaa@2026       │ Admin       │
  ├──────────────────────────┼──────────────────┼─────────────┤
  │ hr@ankaa.om              │ Ankaa@2026       │ HR          │
  └──────────────────────────┴──────────────────┴─────────────┘

  Local (Now) vs Live Server (Later)

  What changes when you flip to live

  The only thing you change is one line in .env.local:

  # Now (local mock)
  USE_LOCAL_DB=true

  # When going live (flip to false OR delete the line)
  USE_LOCAL_DB=false

  That's it. The entire codebase stays exactly the same.

  ---
  What the live server uses instead

  The live server reads from your real Supabase database using the keys already in your
  .env.local:

  NEXT_PUBLIC_SUPABASE_URL=https://hvsbvmfv...supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJ...

  On the live Supabase DB:
  - Accounts → The real company employees imported from the old my-taskboard-main
  Supabase project
  - Passwords → Whatever passwords those users already have in Supabase Auth (they're
  hashed in Supabase, not accessible by you)
  - Roles → Whatever roles were assigned in the old system

  ---
  The migration plan

  LOCAL NOW                    →     LIVE SERVER
  ─────────────────────────────────────────────────────
  ashraf@ankaa.om              →     same email, new password
  Ashraf@Super2026             →     set by you in Supabase dashboard
  ─────────────────────────────────────────────────────
  admin@ankaa.om (mock)        →     deleted / replaced
  Ankaa@2026 (mock)            →     real company passwords
  ─────────────────────────────────────────────────────
  42 seeded profiles           →     real employee profiles from
  (test/mock data)                   the old Supabase project

  ---
  What you need to do before going live

  1. Run the import script — it pulls real data from the old Supabase into the new one:
  ! node scripts/import-from-supabase.js

  2. Set your own password in Supabase dashboard for ashraf@ankaa.om (since you can't
  recover old bcrypt hashes cross-project)

  3. Flip the flag:
  USE_LOCAL_DB=false

  4. Run the schema migration on Supabase — apply lib/db/schema.sql to the real
  Supabase DB so all the new tables exist (org_chart, roster_attendance with
  clock_in/out, etc.)

  ---
  What NEVER changes (regardless of local vs live)

  ┌─────────────────────────────────────┬───────────┐
  │                Thing                │  Status   │
  ├─────────────────────────────────────┼───────────┤
  │ All page code                       │ Unchanged │
  ├─────────────────────────────────────┼───────────┤
  │ Role-based access rules             │ Unchanged │
  ├─────────────────────────────────────┼───────────┤
  │ API routes                          │ Unchanged │
  ├─────────────────────────────────────┼───────────┤
  │ The isAdmin(), isHR() helpers       │ Unchanged │
  ├─────────────────────────────────────┼───────────┤
  │ JWT auth flow                       │ Unchanged │
  ├─────────────────────────────────────┼───────────┤
  │ The org chart, leave, payroll logic │ Unchanged │
  └─────────────────────────────────────┴───────────┘

  The local DB is purely a development sandbox — it lets the whole team work offline
  without touching real company data. When you're ready to ship, one env var switch
  connects everything to the real server and real users.

 Your working logins

  ┌──────────────────────────┬──────────────────┐
  │          Email           │     Password     │
  ├──────────────────────────┼──────────────────┤
  │ ashraf@ankaa.om          │ Ashraf@Super2026 │
  ├──────────────────────────┼──────────────────┤
  │ mdashraf@ankaa.om        │ Ashraf@Admin2026 │
  ├──────────────────────────┼──────────────────┤
  │ mdashraf.intern@ankaa.om │ Ashraf@Train2026 │
  ├──────────────────────────┼──────────────────┤
  │ All other staff          │ Ankaa@2026       │
  └──────────────────────────┴──────────────────┘

  ---
  Your working logins

  ┌──────────────────────────┬──────────────────┐
  │          Email           │     Password     │
  ├──────────────────────────┼──────────────────┤
  │ ashraf@ankaa.om          │ Ashraf@Super2026 │
  ├──────────────────────────┼──────────────────┤
  │ mdashraf@ankaa.om        │ Ashraf@Admin2026 │
  ├──────────────────────────┼──────────────────┤
  │ mdashraf.intern@ankaa.om │ Ashraf@Train2026 │
  ├──────────────────────────┼──────────────────┤
  │ All other staff          │ Ankaa@2026       │
  └──────────────────────────┴──────────────────┘
  ✅ Done (ported to ERP /projects):

  ┌────────────────────────────────────────────────────────────────────────┬────────┐
  │                                Feature                                 │ Status │
  ├────────────────────────────────────────────────────────────────────────┼────────┤
  │ Project list — kanban + list view                                      │ Done   │
  ├────────────────────────────────────────────────────────────────────────┼────────┤
  │ New/Edit/Delete project modal                                          │ Done   │
  ├────────────────────────────────────────────────────────────────────────┼────────┤
  │ Project detail — Overview, Risks, Change Requests, Action Items, Team  │ Done   │
  ├────────────────────────────────────────────────────────────────────────┼────────┤
  │ Tenders list + "New Tender" modal                                      │ Done   │
  ├────────────────────────────────────────────────────────────────────────┼────────┤
  │ DB tables: project_risks, project_change_requests,                     │ Done   │
  │ project_action_items, tenders                                          │        │
  └────────────────────────────────────────────────────────────────────────┴────────┘

  ---
  ❌ Not done yet (still in Django only):

  ┌────────────────────────────────┬───────────────────────────────────────────────┐
  │            Feature             │                Django Model(s)                │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │ Timeline / Gantt chart         │ TimelineTask                                  │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │ Milestones (phases, phase      │ Milestone, MilestonePhaseGroup,               │
  │ groups, milestone tasks)       │ MilestonePhase, MilestoneTask                 │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │                                │ TenderCommitteeEntry,                         │
  │ Purchasing Committee workflow  │ TenderCommitteeReviewer,                      │
  │ (reviewers, final review)      │ TenderCommitteeReview,                        │
  │                                │ TenderCommitteeFinalReview                    │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │ Tender detail page (sections,  │ TenderSection, TenderDocument,                │
  │ assignments, documents,        │ TenderProposal, TenderComment                 │
  │ proposals, comments)           │                                               │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │ Tender Invoices                │ TenderInvoice                                 │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │ Baseline tracking              │ Baseline                                      │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │ Workboard cards (kanban within │ WorkboardCard                                 │
  │  a project)                    │                                               │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │ Budget / Cost-benefit analysis │ ProjectBudgetTask, CostBenefitAnalysis        │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │ Issue tracking                 │ IssueCategory, Issue, IssueComment            │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │ NDA document management        │ NDADocument, NDAField, NDAInstance,           │
  │                                │ NDAFieldValue                                 │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │ Subcontractors                 │ Subcontractor                                 │
  ├────────────────────────────────┼───────────────────────────────────────────────┤
  │ PDF export for projects        │ ExportProjectPDFView                          │
  └────────────────────────────────┴───────────────────────────────────────────────┘

  ---
  What should I prioritize next? The Purchasing Committee workflow, the Tender detail
  page, or Milestones?