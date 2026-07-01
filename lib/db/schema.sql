-- Ankaa ERP — Local PGlite Schema (v2 — full migration columns)
-- Applied automatically by scripts/setup-local-db.js

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                TEXT PRIMARY KEY DEFAULT '',
  email             TEXT UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,
  full_name         TEXT,
  username          TEXT UNIQUE,
  role              TEXT DEFAULT 'collaborator',
  -- Employment
  employee_id       TEXT UNIQUE,
  position_title    TEXT,
  department_id     TEXT,
  contract_type     TEXT DEFAULT 'full_time',
  basic_salary      REAL,
  status            TEXT DEFAULT 'active',
  joining_date      TEXT,
  -- Personal
  date_of_birth     TEXT,
  gender            TEXT,
  phone_number      TEXT,
  emergency_number  TEXT,
  avatar_url        TEXT,
  last_sign_in_at   TEXT,
  created_at        TEXT,
  updated_at        TEXT
);

-- ── leave_balances ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_balances (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  annual_leave_days     INTEGER DEFAULT 30,
  sick_leave_days       INTEGER DEFAULT 21,
  emergency_leave_days  INTEGER DEFAULT 6,
  maternity_leave_days  INTEGER DEFAULT 98,
  paternity_leave_days  INTEGER DEFAULT 7,
  other_leave_days      INTEGER DEFAULT 0,
  last_refresh_date     TEXT,
  created_at            TEXT,
  updated_at            TEXT
);

-- ── leave_requests ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id                              TEXT PRIMARY KEY,
  user_id                         TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  start_date                      TEXT NOT NULL,
  end_date                        TEXT NOT NULL,
  leave_type                      TEXT NOT NULL,
  total_working_days              INTEGER,
  half_day                        INTEGER DEFAULT 0,
  reason                          TEXT NOT NULL,
  description                     TEXT,
  status                          TEXT DEFAULT 'pending_ghassani',
  current_approver                TEXT,
  -- Per-approver tracking
  pending_ghassani_comments       TEXT,
  pending_ghassani_approved_at    TEXT,
  pending_ghassani_approved_by    TEXT,
  pending_yousuf_comments         TEXT,
  pending_yousuf_approved_at      TEXT,
  pending_yousuf_approved_by      TEXT,
  pending_sultan_comments         TEXT,
  pending_sultan_approved_at      TEXT,
  pending_sultan_approved_by      TEXT,
  pending_ramimi_comments         TEXT,
  pending_ramimi_approved_at      TEXT,
  pending_ramimi_approved_by      TEXT,
  pending_hr_comments             TEXT,
  pending_hr_approved_at          TEXT,
  pending_hr_approved_by          TEXT,
  -- Approval chain (JSON stored as text)
  approval_chain                  TEXT,
  approval_history                TEXT DEFAULT '[]',
  current_approval_level          INTEGER DEFAULT 1,
  -- Snapshot of employee info at time of request
  joining_date                    TEXT,
  phone_number                    TEXT,
  -- Sick / document tracking
  sick_document_url               TEXT,
  document_required               INTEGER DEFAULT 0,
  document_uploaded               INTEGER DEFAULT 0,
  document_upload_deadline        TEXT,
  document_reminder_sent          INTEGER DEFAULT 0,
  document_employee_reminder_sent INTEGER DEFAULT 0,
  document_file_url               TEXT,
  sick_documents                  TEXT,
  sick_document_reminder_sent_at  TEXT,
  sick_document_hr_reminder_sent_at TEXT,
  -- Direct approval (for HODs / managers who bypass normal chain)
  direct_approved                 INTEGER DEFAULT 0,
  direct_approved_by              TEXT,
  direct_approved_at              TEXT,
  direct_comments                 TEXT,
  direct_approved_by_name         TEXT,
  direct_approved_by_department   TEXT,
  -- Direct manager layer
  direct_manager_approved         INTEGER,
  direct_manager_approved_by      TEXT,
  direct_manager_approved_at      TEXT,
  direct_manager_comments         TEXT,
  -- Admin edits
  admin_modified                  INTEGER DEFAULT 0,
  admin_modified_by               TEXT,
  admin_modified_at               TEXT,
  admin_modification_reason       TEXT,
  original_start_date             TEXT,
  original_end_date               TEXT,
  original_total_days             INTEGER,
  -- Cancellation
  canceled                        INTEGER DEFAULT 0,
  canceled_at                     TEXT,
  canceled_by                     TEXT,
  canceled_by_name                TEXT,
  cancel_reason                   TEXT,
  -- Handover
  handover_to_user_id             TEXT,
  handover_notes                  TEXT,
  -- Emergency documents
  emergency_document_url          TEXT,
  emergency_documents             TEXT,
  emergency_note                  TEXT,
  -- Official meeting / trip fields
  start_time                      TEXT,
  end_time                        TEXT,
  location                        TEXT,
  meeting_subject                 TEXT,
  original_start_time             TEXT,
  original_end_time               TEXT,
  original_location               TEXT,
  original_meeting_subject        TEXT,
  -- TADA / Official trip
  tada_zone                       TEXT,
  official_trip_description       TEXT,
  original_tada_zone              TEXT,
  original_official_trip_description TEXT,
  -- Who created on behalf of employee
  created_by_admin_id             TEXT,
  created_at                      TEXT,
  updated_at                      TEXT
);

-- ── cost_centers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_centers (
  id          TEXT PRIMARY KEY DEFAULT '',
  name        TEXT UNIQUE NOT NULL,
  code        TEXT,
  description TEXT,
  active      INTEGER DEFAULT 1,
  created_at  TEXT,
  updated_at  TEXT
);

-- ── invoices ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES profiles(id),
  name                  TEXT NOT NULL,
  amount                REAL,
  transaction_date      TEXT,
  status                TEXT DEFAULT 'unpaid',
  expense_category      TEXT,
  cost_center           TEXT,
  description           TEXT,
  currency              TEXT DEFAULT 'OMR',
  bill_number           TEXT,
  paid_by               TEXT,
  extracted_date        TEXT,
  extracted_amount      REAL,
  fuel_amount           REAL DEFAULT 0,
  materials_amount      REAL DEFAULT 0,
  transportation_amount REAL DEFAULT 0,
  food_amount           REAL DEFAULT 0,
  others_amount         REAL DEFAULT 0,
  created_at            TEXT,
  updated_at            TEXT
);

-- ── invoices_audit_log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices_audit_log (
  id             TEXT PRIMARY KEY DEFAULT '',
  invoice_id     TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  user_id        TEXT REFERENCES profiles(id),
  user_email     TEXT,
  user_name      TEXT,
  old_data       TEXT,
  new_data       TEXT,
  changed_fields TEXT,
  created_at     TEXT
);

-- ── leave_requests_audit_log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests_audit_log (
  id               TEXT PRIMARY KEY DEFAULT '',
  leave_request_id TEXT REFERENCES leave_requests(id) ON DELETE SET NULL,
  action           TEXT NOT NULL,
  user_id          TEXT REFERENCES profiles(id),
  user_email       TEXT,
  user_name        TEXT,
  old_data         TEXT,
  new_data         TEXT,
  changed_fields   TEXT,
  created_at       TEXT
);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                TEXT PRIMARY KEY DEFAULT '',
  user_id           TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  request_id        TEXT,
  notification_type TEXT NOT NULL,
  viewed_at         TEXT,
  created_at        TEXT
);

-- ── org_chart ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_chart (
  id                    TEXT PRIMARY KEY,
  title                 TEXT,
  user_id               TEXT REFERENCES profiles(id),
  parent_id             TEXT,
  position              TEXT DEFAULT 'center',
  color                 TEXT,
  children_layout       TEXT,
  "order"               INTEGER DEFAULT 0,
  department            TEXT,
  reporting_to          TEXT,
  is_c_level            INTEGER DEFAULT 0,
  can_direct_approve    INTEGER DEFAULT 0,
  is_head_of_department INTEGER DEFAULT 0,
  full_name             TEXT,
  email                 TEXT,
  level                 TEXT
);

-- ── projects (Kanban boards + ERP project tracking) ──────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  section       TEXT DEFAULT 'current',     -- current | expected | research | closing
  status        TEXT DEFAULT 'in_progress', -- pending | in_progress | completed
  progress      INTEGER DEFAULT 0,          -- 0–100
  priority      TEXT DEFAULT 'medium',      -- low | medium | high | critical
  start_date    TEXT,
  end_date      TEXT,
  department_id TEXT,
  created_by    TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TEXT,
  updated_at    TEXT
);

CREATE TABLE IF NOT EXISTS project_members (
  id         TEXT PRIMARY KEY DEFAULT '',
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member',
  joined_at  TEXT,
  created_at TEXT,
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_lists (
  id         TEXT PRIMARY KEY DEFAULT '',
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  position   INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS project_cards (
  id          TEXT PRIMARY KEY DEFAULT '',
  list_id     TEXT REFERENCES project_lists(id) ON DELETE CASCADE,
  project_id  TEXT REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  position    INTEGER DEFAULT 0,
  completed   INTEGER DEFAULT 0,
  due_date    TEXT,
  due_time    TEXT,
  labels      TEXT DEFAULT '[]',
  priority    TEXT DEFAULT 'medium',
  reminder    TEXT,
  created_at  TEXT,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS project_card_members (
  id         TEXT PRIMARY KEY DEFAULT '',
  card_id    TEXT REFERENCES project_cards(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT,
  UNIQUE (card_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_labels (
  id         TEXT PRIMARY KEY DEFAULT '',
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  position   INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS project_checklists (
  id         TEXT PRIMARY KEY DEFAULT '',
  card_id    TEXT REFERENCES project_cards(id) ON DELETE CASCADE,
  title      TEXT DEFAULT 'Checklist',
  position   INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS project_checklist_items (
  id           TEXT PRIMARY KEY DEFAULT '',
  checklist_id TEXT REFERENCES project_checklists(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  completed    INTEGER DEFAULT 0,
  position     INTEGER DEFAULT 0,
  created_at   TEXT,
  updated_at   TEXT
);

CREATE TABLE IF NOT EXISTS project_card_activities (
  id         TEXT PRIMARY KEY DEFAULT '',
  card_id    TEXT REFERENCES project_cards(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,
  comment    TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS project_card_attachments (
  id          TEXT PRIMARY KEY DEFAULT '',
  card_id     TEXT REFERENCES project_cards(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT,
  file_size   INTEGER,
  file_type   TEXT,
  uploaded_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TEXT
);

-- ── todos ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS todos (
  id               BIGSERIAL PRIMARY KEY,
  user_id          TEXT REFERENCES profiles(id),
  task             TEXT NOT NULL,
  is_complete      INTEGER DEFAULT 0,
  due_date         TEXT,
  due_time         TEXT,
  priority         TEXT DEFAULT 'medium',
  notes            TEXT,
  assigned_by      TEXT,
  assigned_by_name TEXT,
  created_by       TEXT,
  completed_at     TEXT,
  is_request       INTEGER DEFAULT 0,
  request_status   TEXT,
  created_at       TEXT
);

-- ── roster_attendance ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roster_attendance (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date          TEXT NOT NULL,
  status        TEXT NOT NULL,
  clock_in      TEXT,
  clock_out     TEXT,
  late_minutes  INTEGER DEFAULT 0,
  location_type TEXT DEFAULT 'office',
  marked_at     TEXT,
  marked_by     TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE (user_id, date)
);

-- ── roster_date_events ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roster_date_events (
  id         TEXT PRIMARY KEY DEFAULT '',
  date       TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TEXT,
  updated_at TEXT
);

-- ── user_activity_sessions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_activity_sessions (
  id               TEXT PRIMARY KEY DEFAULT '',
  user_id          TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  started_at       TEXT,
  ended_at         TEXT,
  last_activity_at TEXT,
  created_at       TEXT
);

-- ── user_task_access ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_task_access (
  id             TEXT PRIMARY KEY DEFAULT '',
  user_id        TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at     TEXT,
  UNIQUE (user_id, target_user_id)
);

-- ── password_reset_tokens ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         TEXT PRIMARY KEY DEFAULT '',
  user_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 4 — Asset System + Stores (migrated from asset_management-master)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS asset_categories (
  id          TEXT PRIMARY KEY DEFAULT '',
  name        TEXT UNIQUE NOT NULL,
  code        TEXT UNIQUE,                       -- short code e.g. OEM, FF, OD used in asset_id generation
  description TEXT,
  created_at  TEXT
);

CREATE TABLE IF NOT EXISTS asset_locations (
  id          TEXT PRIMARY KEY DEFAULT '',
  name        TEXT UNIQUE NOT NULL,
  floor       TEXT,
  building    TEXT,
  address     TEXT,                              -- full address (from old system)
  created_at  TEXT
);

-- Vendors (suppliers of assets)
CREATE TABLE IF NOT EXISTS asset_vendors (
  id             TEXT PRIMARY KEY DEFAULT '',
  name           TEXT NOT NULL,
  contact_person TEXT,
  email          TEXT,
  phone          TEXT,
  address        TEXT,
  created_at     TEXT,
  updated_at     TEXT
);

-- Companies that own assets (Ankaa, GIS, Taqa, Wingtech)
CREATE TABLE IF NOT EXISTS asset_companies (
  id          TEXT PRIMARY KEY DEFAULT '',
  name        TEXT UNIQUE NOT NULL,
  code        TEXT UNIQUE,                       -- short code used in asset_id generation
  description TEXT,
  created_at  TEXT
);

CREATE TABLE IF NOT EXISTS assets (
  id                      TEXT PRIMARY KEY DEFAULT '',
  asset_id                TEXT UNIQUE,           -- human-readable e.g. Ankaa-OEM-0001
  name                    TEXT NOT NULL,
  category_id             TEXT REFERENCES asset_categories(id),
  company_id              TEXT REFERENCES asset_companies(id) ON DELETE SET NULL,
  location_id             TEXT REFERENCES asset_locations(id),
  vendor_id               TEXT REFERENCES asset_vendors(id) ON DELETE SET NULL,
  assigned_to             TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  parent_id               TEXT REFERENCES assets(id) ON DELETE CASCADE,  -- sub-asset
  condition               TEXT DEFAULT 'good',   -- new | good | fair | poor | newly_purchased
  status                  TEXT DEFAULT 'available', -- available | assigned | maintenance | retired
  -- Identification
  serial_number           TEXT,
  barcode                 TEXT UNIQUE,           -- QR / barcode for scanning
  account_reference_number TEXT,                -- accounting reference
  quantity                INTEGER DEFAULT 1,
  used_by                 TEXT,                  -- person or department using asset
  -- Financials
  purchase_date           TEXT,
  purchase_price          REAL,
  current_value           REAL,
  salvage_value           REAL DEFAULT 0,
  useful_life_years       INTEGER DEFAULT 5,
  depreciation_method     TEXT DEFAULT 'straight_line', -- straight_line | reducing_balance | none
  last_depreciation_date  TEXT,
  -- Dates
  warranty_expiry         TEXT,
  -- Media
  image_url               TEXT,                  -- asset photo
  -- Notes
  notes                   TEXT,
  description             TEXT,
  -- Audit
  created_by              TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  modified_by             TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at              TEXT,
  updated_at              TEXT
);

-- Asset file attachments (manuals, invoices, docs)
CREATE TABLE IF NOT EXISTS asset_attachments (
  id          TEXT PRIMARY KEY DEFAULT '',
  asset_id    TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_url    TEXT,
  file_name   TEXT,
  description TEXT,
  uploaded_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TEXT
);

CREATE TABLE IF NOT EXISTS asset_movements (
  id              TEXT PRIMARY KEY DEFAULT '',
  asset_id        TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  from_location   TEXT,
  to_location     TEXT,
  from_company_id TEXT REFERENCES asset_companies(id) ON DELETE SET NULL,
  to_company_id   TEXT REFERENCES asset_companies(id) ON DELETE SET NULL,
  from_asset_id   TEXT,                          -- snapshot of old asset_id code
  to_asset_id     TEXT,                          -- snapshot of new asset_id code
  asset_condition TEXT,
  moved_by        TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  moved_at        TEXT,
  notes           TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 5 — Fleet + Logistics (migrated from fleet-final-main)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id                         TEXT PRIMARY KEY DEFAULT '',
  category                   TEXT DEFAULT 'ankaa',   -- ankaa | gis | taqa
  vehicle_name               TEXT NOT NULL,
  model                      TEXT,
  license_plate_number       TEXT,
  license_plate_alphabets    TEXT,                    -- Omani LP alphabetic suffix
  color                      TEXT,
  year                       INTEGER,
  status                     TEXT DEFAULT 'available', -- available | in_use | maintenance | retired
  mileage                    REAL DEFAULT 0,
  fuel_type                  TEXT DEFAULT 'petrol',
  registration_issue_date    TEXT,                    -- date issued
  registration_expiry_date   TEXT,
  insurance_expiry_date      TEXT,
  operating_card_number      TEXT,
  operating_card_issue_date  TEXT,
  operating_card_expiry_date TEXT,
  notes                      TEXT,
  created_at                 TEXT,
  updated_at                 TEXT
);

-- Vehicle photos (multiple per vehicle)
CREATE TABLE IF NOT EXISTS fleet_vehicle_images (
  id         TEXT PRIMARY KEY DEFAULT '',
  vehicle_id TEXT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  created_at TEXT
);

-- Vehicle assignments — defined after fleet_drivers below

-- Vehicle maintenance records
CREATE TABLE IF NOT EXISTS fleet_vehicle_maintenance (
  id                TEXT PRIMARY KEY DEFAULT '',
  vehicle_id        TEXT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  issue_type        TEXT,   -- engine | brakes | transmission | electrical | tires | oil_change | ac_system | battery | lights | other
  oil_change_details TEXT,
  status            TEXT DEFAULT 'pending', -- pending | in_progress | completed | cancelled
  reported_date     TEXT,
  completion_date   TEXT,
  cost              REAL,
  notes             TEXT,
  parts_replaced    TEXT,
  created_at        TEXT,
  updated_at        TEXT
);

-- PDF bills attached to maintenance records
CREATE TABLE IF NOT EXISTS fleet_vehicle_maintenance_bills (
  id                   TEXT PRIMARY KEY DEFAULT '',
  maintenance_id       TEXT NOT NULL REFERENCES fleet_vehicle_maintenance(id) ON DELETE CASCADE,
  file_url             TEXT,
  file_name            TEXT,
  bill_date            TEXT,
  description          TEXT,
  uploaded_at          TEXT
);

-- General vehicle bills (fuel, insurance, registration etc.)
CREATE TABLE IF NOT EXISTS fleet_vehicle_bills (
  id          TEXT PRIMARY KEY DEFAULT '',
  vehicle_id  TEXT REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  bill_number TEXT,
  bill_date   TEXT,
  amount      REAL,
  file_url    TEXT,
  file_name   TEXT,
  description TEXT,
  mileage     REAL,                                  -- odometer at time of bill
  created_at  TEXT,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS fleet_drivers (
  id              TEXT PRIMARY KEY DEFAULT '',
  user_id         TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  license_number  TEXT,
  license_expiry  TEXT,
  category        TEXT,                              -- license category
  status          TEXT DEFAULT 'active',             -- active | on_trip | off_duty | inactive
  joined_date     TEXT,
  created_at      TEXT,
  updated_at      TEXT
);

-- Vehicle assignments (needs fleet_vehicles + fleet_drivers above)
CREATE TABLE IF NOT EXISTS fleet_vehicle_assignments (
  id                   TEXT PRIMARY KEY DEFAULT '',
  vehicle_id           TEXT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  driver_id            TEXT NOT NULL REFERENCES fleet_drivers(id) ON DELETE CASCADE,
  cc_recipient_id      TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  start_condition      TEXT DEFAULT 'good',           -- excellent | good | fair | poor | other
  start_condition_note TEXT,
  end_condition        TEXT,
  end_condition_note   TEXT,
  return_notes         TEXT,
  start_mileage        REAL,
  end_mileage          REAL,
  assignment_date      TEXT,
  assignment_time      TEXT,
  return_date          TEXT,
  return_time          TEXT,
  is_active            INTEGER DEFAULT 1,
  created_at           TEXT,
  updated_at           TEXT
);

CREATE TABLE IF NOT EXISTS fleet_drones (
  id                  TEXT PRIMARY KEY DEFAULT '',
  drone_name          TEXT NOT NULL,
  model               TEXT,
  registration_number TEXT UNIQUE,
  category            TEXT DEFAULT 'ankaa',          -- ankaa | gis | taqa
  status              TEXT DEFAULT 'available',       -- available | in_use | maintenance | retired
  flight_hours        REAL DEFAULT 0,
  registration_date   TEXT,
  last_maintenance    TEXT,
  next_maintenance    TEXT,
  notes               TEXT,
  created_at          TEXT,
  updated_at          TEXT
);

-- Drone assignments — defined after fleet_pilots below

-- Drone maintenance records
CREATE TABLE IF NOT EXISTS fleet_drone_maintenance (
  id                          TEXT PRIMARY KEY DEFAULT '',
  drone_id                    TEXT NOT NULL REFERENCES fleet_drones(id) ON DELETE CASCADE,
  maintenance_type            TEXT DEFAULT 'routine', -- routine | repair | battery | calibration | firmware | other
  description                 TEXT,
  maintenance_date            TEXT,
  completed_date              TEXT,
  cost                        REAL,
  performed_by                TEXT,
  flight_hours_at_maintenance REAL DEFAULT 0,
  status                      TEXT DEFAULT 'pending', -- pending | completed
  notes                       TEXT,
  created_at                  TEXT
);

CREATE TABLE IF NOT EXISTS fleet_pilots (
  id                 TEXT PRIMARY KEY DEFAULT '',
  user_id            TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  phone              TEXT,
  email              TEXT,
  address            TEXT,
  drone_category     TEXT DEFAULT 'small',           -- small | medium | large
  total_flight_hours REAL DEFAULT 0,
  license_number     TEXT,
  license_expiry     TEXT,
  status             TEXT DEFAULT 'active',           -- active | on_mission | off_duty | inactive
  created_at         TEXT,
  updated_at         TEXT
);

-- Drone assignments (needs fleet_drones + fleet_pilots above)
CREATE TABLE IF NOT EXISTS fleet_drone_assignments (
  id                   TEXT PRIMARY KEY DEFAULT '',
  drone_id             TEXT NOT NULL REFERENCES fleet_drones(id) ON DELETE CASCADE,
  pilot_id             TEXT NOT NULL REFERENCES fleet_pilots(id) ON DELETE CASCADE,
  start_condition      TEXT DEFAULT 'good',
  start_condition_note TEXT,
  end_condition        TEXT,
  end_condition_note   TEXT,
  start_flight_hours   REAL DEFAULT 0,
  end_flight_hours     REAL,
  assignment_date      TEXT,
  return_date          TEXT,
  is_active            INTEGER DEFAULT 1,
  start_location       TEXT,                         -- JSON {lat, lng, altitude}
  end_location         TEXT,                         -- JSON {lat, lng, altitude}
  created_at           TEXT,
  updated_at           TEXT
);

-- Flight logs (drone missions)
CREATE TABLE IF NOT EXISTS fleet_flight_logs (
  id                TEXT PRIMARY KEY DEFAULT '',
  pilot_id          TEXT REFERENCES fleet_pilots(id) ON DELETE SET NULL,
  drone_id          TEXT REFERENCES fleet_drones(id) ON DELETE SET NULL,
  mission_name      TEXT NOT NULL,
  start_time        TEXT,
  end_time          TEXT,
  flight_duration   REAL DEFAULT 0,                  -- hours, auto-calculated
  start_location    TEXT,                            -- JSON {lat, lng, altitude}
  end_location      TEXT,                            -- JSON {lat, lng, altitude}
  flight_path       TEXT,                            -- JSON array of coordinates
  status            TEXT DEFAULT 'completed',         -- completed | aborted | incident | in_progress
  weather_conditions TEXT,                           -- clear | cloudy | rain | wind | storm
  wind_speed        REAL,                            -- km/h
  temperature       REAL,                            -- Celsius
  notes             TEXT,
  created_at        TEXT,
  updated_at        TEXT
);

CREATE TABLE IF NOT EXISTS fleet_trips (
  id            TEXT PRIMARY KEY DEFAULT '',
  vehicle_id    TEXT REFERENCES fleet_vehicles(id) ON DELETE SET NULL,
  driver_id     TEXT REFERENCES fleet_drivers(id) ON DELETE SET NULL,
  requested_by  TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  purpose       TEXT,
  destination   TEXT,
  departure     TEXT,
  return_time   TEXT,
  mileage_start REAL,
  mileage_end   REAL,
  status        TEXT DEFAULT 'pending',              -- pending | approved | active | completed | cancelled
  notes         TEXT,
  created_at    TEXT,
  updated_at    TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 8 — Real-time + Email + SLA / Service Requests (P8: 12–14 Jul 2026)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS service_requests (
  id            TEXT PRIMARY KEY DEFAULT '',
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT DEFAULT 'it',    -- it | hr | maintenance | admin | other
  priority      TEXT DEFAULT 'medium',-- low | medium | high | critical
  status        TEXT DEFAULT 'open',  -- open | in_progress | pending | resolved | closed
  requester_id  TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to   TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  sla_hours     INTEGER DEFAULT 24,   -- SLA target in hours
  due_at        TEXT,
  resolved_at   TEXT,
  resolution    TEXT,
  created_at    TEXT,
  updated_at    TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 11 — Employee Lifecycle + Recruitment (P11: 2–11 Aug 2026)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS job_postings (
  id              TEXT PRIMARY KEY DEFAULT '',
  title           TEXT NOT NULL,
  department_id   TEXT,
  description     TEXT,
  requirements    TEXT,
  status          TEXT DEFAULT 'draft', -- draft | open | closed | on_hold
  salary_min      REAL,
  salary_max      REAL,
  posted_at       TEXT,
  closes_at       TEXT,
  created_by      TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TEXT,
  updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS recruitments (
  id              TEXT PRIMARY KEY DEFAULT '',
  job_posting_id  TEXT REFERENCES job_postings(id) ON DELETE SET NULL,
  applicant_name  TEXT NOT NULL,
  applicant_email TEXT,
  applicant_phone TEXT,
  cv_url          TEXT,
  stage           TEXT DEFAULT 'applied', -- applied | screening | interview | offer | hired | rejected
  notes           TEXT,
  interviewed_by  TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  hired_user_id   TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TEXT,
  updated_at      TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 12 — Performance + Training (P12: 12–18 Aug 2026)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS performance_reviews (
  id              TEXT PRIMARY KEY DEFAULT '',
  user_id         TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id     TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  period          TEXT NOT NULL,              -- e.g. "Q1 2026", "H1 2026"
  rating          REAL,                       -- 1.0–5.0
  strengths       TEXT,
  areas_to_improve TEXT,
  goals_next      TEXT,
  comments        TEXT,
  status          TEXT DEFAULT 'draft',       -- draft | submitted | acknowledged
  reviewed_at     TEXT,
  acknowledged_at TEXT,
  created_at      TEXT,
  updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS training_records (
  id           TEXT PRIMARY KEY DEFAULT '',
  user_id      TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  provider     TEXT,
  category     TEXT,                          -- technical | soft_skills | compliance | safety
  start_date   TEXT,
  end_date     TEXT,
  hours        REAL,
  certificate_url TEXT,
  status       TEXT DEFAULT 'enrolled',       -- enrolled | in_progress | completed | cancelled
  notes        TEXT,
  created_at   TEXT,
  updated_at   TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 13 — Procurement + PO Management (P13: 19–24 Aug 2026)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendors (
  id           TEXT PRIMARY KEY DEFAULT '',
  name         TEXT UNIQUE NOT NULL,
  category     TEXT,
  contact_name TEXT,
  email        TEXT,
  phone        TEXT,
  address      TEXT,
  cr_number    TEXT,                          -- Commercial Registration
  status       TEXT DEFAULT 'active',
  created_at   TEXT,
  updated_at   TEXT
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              TEXT PRIMARY KEY DEFAULT '',
  po_number       TEXT UNIQUE NOT NULL,
  vendor_id       TEXT REFERENCES vendors(id) ON DELETE SET NULL,
  requested_by    TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by     TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  cost_center     TEXT,
  total_amount    REAL DEFAULT 0,
  currency        TEXT DEFAULT 'OMR',
  status          TEXT DEFAULT 'draft',       -- draft | pending_approval | approved | ordered | received | cancelled
  order_date      TEXT,
  expected_date   TEXT,
  received_date   TEXT,
  notes           TEXT,
  created_at      TEXT,
  updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id          TEXT PRIMARY KEY DEFAULT '',
  po_id       TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    REAL DEFAULT 1,
  unit        TEXT DEFAULT 'pcs',
  unit_price  REAL DEFAULT 0,
  total_price REAL DEFAULT 0,
  received_qty REAL DEFAULT 0
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 14 — Full DMS + Mail Register (P14: 25–27 Aug 2026)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS document_categories (
  id          TEXT PRIMARY KEY DEFAULT '',
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at  TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id           TEXT PRIMARY KEY DEFAULT '',
  title        TEXT NOT NULL,
  category_id  TEXT REFERENCES document_categories(id) ON DELETE SET NULL,
  file_url     TEXT,
  file_name    TEXT,
  file_size    INTEGER,
  file_type    TEXT,
  version      TEXT DEFAULT '1.0',
  status       TEXT DEFAULT 'active',         -- active | archived | deleted
  owner_id     TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  department_id TEXT,
  tags         TEXT DEFAULT '[]',             -- JSON array of tags
  uploaded_at  TEXT,
  expires_at   TEXT,
  created_at   TEXT,
  updated_at   TEXT
);

CREATE TABLE IF NOT EXISTS mail_register (
  id              TEXT PRIMARY KEY DEFAULT '',
  ref_number      TEXT UNIQUE NOT NULL,
  direction       TEXT NOT NULL,              -- inbound | outbound
  subject         TEXT NOT NULL,
  sender          TEXT,
  recipient       TEXT,
  department_id   TEXT,
  document_id     TEXT REFERENCES documents(id) ON DELETE SET NULL,
  received_date   TEXT,
  sent_date       TEXT,
  status          TEXT DEFAULT 'pending',     -- pending | actioned | filed | archived
  action_required TEXT,
  actioned_by     TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TEXT,
  updated_at      TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 15 — Audit Management + Risk Register (P15: 30 Aug – 1 Sep 2026)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS risk_register (
  id            TEXT PRIMARY KEY DEFAULT '',
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT DEFAULT 'operational',   -- operational | financial | hr | it | compliance | reputational
  likelihood    INTEGER DEFAULT 3,            -- 1–5
  impact        INTEGER DEFAULT 3,            -- 1–5
  risk_score    INTEGER,                      -- computed: likelihood * impact
  owner_id      TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  status        TEXT DEFAULT 'open',          -- open | mitigated | closed | accepted
  mitigation    TEXT,
  review_date   TEXT,
  created_at    TEXT,
  updated_at    TEXT
);

CREATE TABLE IF NOT EXISTS audits (
  id             TEXT PRIMARY KEY DEFAULT '',
  title          TEXT NOT NULL,
  audit_type     TEXT DEFAULT 'internal',     -- internal | external | regulatory
  department_id  TEXT,
  auditor_id     TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  status         TEXT DEFAULT 'planned',      -- planned | in_progress | completed | cancelled
  scheduled_date TEXT,
  completed_date TEXT,
  findings       TEXT,
  recommendations TEXT,
  follow_up_date TEXT,
  created_at     TEXT,
  updated_at     TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 16 — Local Content + CSR (P16: 2–7 Sep 2026)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS csr_activities (
  id              TEXT PRIMARY KEY DEFAULT '',
  title           TEXT NOT NULL,
  category        TEXT DEFAULT 'community',   -- community | environment | education | health | other
  description     TEXT,
  budget          REAL DEFAULT 0,
  currency        TEXT DEFAULT 'OMR',
  beneficiaries   TEXT,
  status          TEXT DEFAULT 'planned',     -- planned | active | completed | cancelled
  start_date      TEXT,
  end_date        TEXT,
  lead_id         TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  outcome         TEXT,
  created_at      TEXT,
  updated_at      TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 17 — Government Relations (P17: 8–9 Sep 2026)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS government_relations (
  id              TEXT PRIMARY KEY DEFAULT '',
  entity_name     TEXT NOT NULL,              -- ministry / authority name
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  relationship_type TEXT DEFAULT 'regulatory',-- regulatory | procurement | partnership | reporting
  notes           TEXT,
  next_follow_up  TEXT,
  owner_id        TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TEXT,
  updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS government_submissions (
  id               TEXT PRIMARY KEY DEFAULT '',
  relation_id      TEXT REFERENCES government_relations(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  submission_type  TEXT DEFAULT 'report',     -- report | permit | tender | correspondence | renewal
  due_date         TEXT,
  submitted_date   TEXT,
  status           TEXT DEFAULT 'pending',    -- pending | submitted | acknowledged | approved | rejected
  document_id      TEXT REFERENCES documents(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TEXT,
  updated_at       TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAFE MIGRATIONS — run on existing databases to add new columns
-- These use ALTER TABLE so they are safe to run even if columns already exist.
-- setup-local-db.js will silently skip "already exists" errors.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE roster_attendance ADD COLUMN IF NOT EXISTS clock_in TEXT;
ALTER TABLE roster_attendance ADD COLUMN IF NOT EXISTS clock_out TEXT;
ALTER TABLE roster_attendance ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;
ALTER TABLE roster_attendance ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'office';

ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS half_day INTEGER DEFAULT 0;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS basic_salary REAL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'full_time';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS position_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS joining_date TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_sign_in_at TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- ── Asset migrations (Phase 4 expansion) ──────────────────────────────────────
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS code TEXT;

ALTER TABLE asset_locations ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE assets ADD COLUMN IF NOT EXISTS vendor_id TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS account_reference_number TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS used_by TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS salvage_value REAL DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS useful_life_years INTEGER DEFAULT 5;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depreciation_method TEXT DEFAULT 'straight_line';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_depreciation_date TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS modified_by TEXT;

ALTER TABLE asset_movements ADD COLUMN IF NOT EXISTS from_company_id TEXT;
ALTER TABLE asset_movements ADD COLUMN IF NOT EXISTS to_company_id TEXT;
ALTER TABLE asset_movements ADD COLUMN IF NOT EXISTS from_asset_id TEXT;
ALTER TABLE asset_movements ADD COLUMN IF NOT EXISTS to_asset_id TEXT;
ALTER TABLE asset_movements ADD COLUMN IF NOT EXISTS asset_condition TEXT;

-- ── Fleet migrations (Phase 5 expansion) ──────────────────────────────────────
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS registration_issue_date TEXT;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS operating_card_number TEXT;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS operating_card_issue_date TEXT;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS operating_card_expiry_date TEXT;

ALTER TABLE fleet_drivers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE fleet_drivers ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE fleet_pilots ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE fleet_pilots ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE fleet_drones ADD COLUMN IF NOT EXISTS registration_date TEXT;

-- ── ERP project tracking columns (Phase 18 addition) ─────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS section       TEXT DEFAULT 'current';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status        TEXT DEFAULT 'in_progress';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress      INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority      TEXT DEFAULT 'medium';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date    TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date      TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS department_id TEXT;

-- ── project_members created_at (missed in original schema) ──────────────────
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS created_at TEXT;

-- (boards are created by employees at runtime — no seeded defaults)

-- ── Invoice file paths + exchange rate ───────────────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_receipt_path TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_screenshot_path TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate        REAL;

-- ── Drop broken DEFAULT '' from primary key columns ───────────────────────────
-- Explicit id (randomUUID) is required on every INSERT. Never rely on DEFAULT.
ALTER TABLE projects           ALTER COLUMN id DROP DEFAULT;
ALTER TABLE project_lists      ALTER COLUMN id DROP DEFAULT;
ALTER TABLE project_cards      ALTER COLUMN id DROP DEFAULT;
ALTER TABLE project_members    ALTER COLUMN id DROP DEFAULT;
ALTER TABLE project_card_members ALTER COLUMN id DROP DEFAULT;
ALTER TABLE invoices           ALTER COLUMN id DROP DEFAULT;
ALTER TABLE leave_requests     ALTER COLUMN id DROP DEFAULT;
ALTER TABLE leave_balances     ALTER COLUMN id DROP DEFAULT;
ALTER TABLE roster_attendance  ALTER COLUMN id DROP DEFAULT;
ALTER TABLE notifications      ALTER COLUMN id DROP DEFAULT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id  ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status   ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates    ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_roster_attendance_date  ON roster_attendance(date);
CREATE INDEX IF NOT EXISTS idx_roster_attendance_user  ON roster_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_project_cards_list      ON project_cards(list_id);
CREATE INDEX IF NOT EXISTS idx_project_cards_project   ON project_cards(project_id);
CREATE INDEX IF NOT EXISTS idx_project_lists_project   ON project_lists(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user           ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status         ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_device_raw_log          ON device_attendance_raw(import_log_id);
CREATE INDEX IF NOT EXISTS idx_device_raw_date         ON device_attendance_raw(date);
CREATE INDEX IF NOT EXISTS idx_todos_user              ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_status           ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category         ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_status   ON fleet_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_projects_section        ON projects(section);
CREATE INDEX IF NOT EXISTS idx_projects_status         ON projects(status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 18 — Device Integration (Face Recognition / iVMS-4200)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Maps HIKVISION device numeric Person IDs to ERP employee records
CREATE TABLE IF NOT EXISTS device_id_mapping (
  id          TEXT PRIMARY KEY,
  device_id   INTEGER NOT NULL,
  device_name TEXT,
  employee_id TEXT,
  profile_id  TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT,
  updated_at  TEXT,
  UNIQUE (device_id)
);

-- Stores every raw row from face-device XLS exports (staging table)
CREATE TABLE IF NOT EXISTS device_attendance_raw (
  id            TEXT PRIMARY KEY,
  import_log_id TEXT REFERENCES device_import_log(id) ON DELETE SET NULL,
  device_name   TEXT,
  department    TEXT,
  date          TEXT,
  shift         TEXT,
  timetable     TEXT,
  check_in      TEXT,
  check_out     TEXT,
  profile_id    TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  employee_id   TEXT,
  full_name     TEXT,
  matched       INTEGER DEFAULT 0,
  created_at    TEXT
);

-- Tracks every XLS import batch from the face recognition device
CREATE TABLE IF NOT EXISTS device_import_log (
  id            TEXT PRIMARY KEY,
  imported_by   TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  filename      TEXT,
  total_records INTEGER DEFAULT 0,
  matched       INTEGER DEFAULT 0,
  unmatched     INTEGER DEFAULT 0,
  skipped       INTEGER DEFAULT 0,
  date_from     TEXT,
  date_to       TEXT,
  created_at    TEXT
);
