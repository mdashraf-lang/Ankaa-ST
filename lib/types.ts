export type UserRole =
  | "admin"
  | "ceo"
  | "md"
  | "cto"
  | "hr"
  | "finance"
  | "coo"
  | "hod"
  | "team_member"
  | "trainee"
  | "collaborator"

export interface Profile {
  id: string
  email: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  joining_date: string | null
  date_of_birth: string | null
  gender: string | null
  phone_number: string | null
  emergency_number: string | null
  department_id: string | null
  position_title: string | null
  employee_id: string | null
  contract_type: "full_time" | "part_time" | "contractor" | "intern" | null
  basic_salary: number | null
  status: "active" | "inactive" | "on_leave" | "terminated"
  last_sign_in_at: string | null
  created_at: string
}

export interface Department {
  id: string
  name: string
  company: string | null
  head_id: string | null
  created_at: string
}

export interface LeaveRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  leave_type:
    | "annual"
    | "sick"
    | "maternity"
    | "paternity"
    | "emergency"
    | "unpaid"
    | "remote_work"
    | "official_trip"
    | "other"
    | "official_meeting"
  total_working_days: number | null
  reason: string
  description: string | null
  status: string
  created_at: string
}

export interface LeaveBalance {
  id: string
  user_id: string
  annual_leave_days: number
  sick_leave_days: number
  emergency_leave_days: number
  maternity_leave_days: number
  paternity_leave_days: number
  other_leave_days: number
}

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "remote"
  | "on_leave"
  | "holiday"

export interface AttendanceLog {
  id: string
  user_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  status: AttendanceStatus
  late_minutes: number
  location_type: "office" | "remote" | "field" | null
}

export interface PayrollPeriod {
  id: string
  month: number
  year: number
  status: "draft" | "processing" | "approved" | "paid"
  created_at: string
}

export interface PayrollRecord {
  id: string
  period_id: string
  user_id: string
  full_name: string
  position_title: string | null
  department: string | null
  basic_salary: number
  housing_allowance: number
  transport_allowance: number
  other_allowances: number
  gross_salary: number
  gosi_employee: number | null
  gosi_employer: number | null
  other_deductions: number
  net_salary: number | null
  working_days: number | null
  status: "pending" | "approved" | "paid"
}

export interface ERPProject {
  id: string
  name: string
  description: string | null
  section: "current" | "expected" | "research" | "closing"
  status: "pending" | "in_progress" | "completed"
  start_date: string
  end_date: string | null
  progress: number
  department_id: string | null
  created_at: string
}

export interface ProjectTask {
  id: string
  project_id: string
  title: string
  start_date: string | null
  end_date: string | null
  progress: number
  parent_id: string | null
  assignee_id: string | null
  status: "not_started" | "in_progress" | "completed" | "blocked"
}

export interface ProjectRisk {
  id: string
  project_id: string
  title: string
  level: "low" | "medium" | "high" | "critical"
  owner: string | null
  status: "open" | "mitigated" | "closed"
  mitigation: string | null
  created_at: string
}

export interface ChangeRequest {
  id: string
  project_id: string
  title: string
  requester: string
  status: "pending" | "approved" | "rejected"
  impact: "low" | "medium" | "high"
  description: string | null
  created_at: string
}

export interface ActionItem {
  id: string
  project_id: string
  title: string
  assignee_id: string | null
  due_date: string | null
  status: "open" | "in_progress" | "completed"
  created_at: string
}

export interface Tender {
  id: string
  title: string
  reference_number: string
  client_name: string
  tender_value: number | null
  currency: string
  submission_deadline: string
  status:
    | "open"
    | "in_progress"
    | "submitted"
    | "under_review"
    | "awarded"
    | "rejected"
    | "cancelled"
  priority: "low" | "medium" | "high" | "critical"
  created_at: string
}

export interface TenderAssignment {
  id: string
  tender_id: string
  user_id: string
  full_name: string | null
  progress: number
  status: "assigned" | "in_progress" | "completed"
  due_date: string | null
}

export interface TenderSubmission {
  id: string
  tender_id: string
  version: string
  type: string
  submitted_by: string
  submitted_at: string
  file_url: string | null
}

export interface AssetCompany {
  id: string
  name: string
  code: string | null
  description: string | null
  created_at: string
}

export interface AssetVendor {
  id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
  updated_at: string | null
}

export interface AssetCategory {
  id: string
  name: string
  code: string | null
  description: string | null
  created_at: string
}

export interface AssetLocation {
  id: string
  name: string
  floor: string | null
  building: string | null
  address: string | null
  created_at: string
}

export interface Asset {
  id: string
  asset_id: string | null
  name: string
  condition: "new" | "good" | "fair" | "poor" | "newly_purchased"
  status: "available" | "assigned" | "maintenance" | "retired"
  purchase_date: string | null
  purchase_price: number | null
  current_value: number | null
  salvage_value: number | null
  useful_life_years: number | null
  depreciation_method: "straight_line" | "reducing_balance" | "none" | null
  last_depreciation_date: string | null
  category_id: string | null
  company_id: string | null
  location_id: string | null
  vendor_id: string | null
  assigned_to: string | null
  parent_id: string | null
  serial_number: string | null
  barcode: string | null
  account_reference_number: string | null
  quantity: number
  used_by: string | null
  warranty_expiry: string | null
  image_url: string | null
  notes: string | null
  description: string | null
  created_by: string | null
  modified_by: string | null
  created_at: string
  updated_at: string | null
}

export interface AssetAttachment {
  id: string
  asset_id: string
  file_url: string | null
  file_name: string | null
  description: string | null
  uploaded_by: string | null
  uploaded_at: string | null
}

export interface AssetMovement {
  id: string
  asset_id: string
  from_location: string | null
  to_location: string | null
  from_company_id: string | null
  to_company_id: string | null
  from_asset_id: string | null
  to_asset_id: string | null
  asset_condition: string | null
  moved_by: string | null
  moved_at: string
  notes: string | null
}

export interface FleetVehicle {
  id: string
  category: "ankaa" | "gis" | "taqa"
  vehicle_name: string
  model: string | null
  license_plate_number: string | null
  license_plate_alphabets: string | null
  color: string | null
  year: number | null
  status: "available" | "in_use" | "maintenance" | "retired"
  mileage: number
  fuel_type: string | null
  registration_issue_date: string | null
  registration_expiry_date: string | null
  insurance_expiry_date: string | null
  operating_card_number: string | null
  operating_card_issue_date: string | null
  operating_card_expiry_date: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface FleetVehicleImage {
  id: string
  vehicle_id: string
  image_url: string
  created_at: string
}

export interface FleetVehicleAssignment {
  id: string
  vehicle_id: string
  driver_id: string
  cc_recipient_id: string | null
  start_condition: "excellent" | "good" | "fair" | "poor" | "other"
  start_condition_note: string | null
  end_condition: string | null
  end_condition_note: string | null
  return_notes: string | null
  start_mileage: number | null
  end_mileage: number | null
  assignment_date: string | null
  assignment_time: string | null
  return_date: string | null
  return_time: string | null
  is_active: number
  created_at: string
  updated_at: string | null
}

export interface FleetVehicleMaintenance {
  id: string
  vehicle_id: string
  issue_type: string | null
  oil_change_details: string | null
  status: "pending" | "in_progress" | "completed" | "cancelled"
  reported_date: string | null
  completion_date: string | null
  cost: number | null
  notes: string | null
  parts_replaced: string | null
  created_at: string
  updated_at: string | null
}

export interface FleetVehicleMaintenanceBill {
  id: string
  maintenance_id: string
  file_url: string | null
  file_name: string | null
  bill_date: string | null
  description: string | null
  uploaded_at: string | null
}

export interface FleetVehicleBill {
  id: string
  vehicle_id: string | null
  bill_number: string | null
  bill_date: string | null
  amount: number | null
  file_url: string | null
  file_name: string | null
  description: string | null
  mileage: number | null
  created_at: string
  updated_at: string | null
}

export interface FleetDriver {
  id: string
  user_id: string | null
  name: string
  phone: string | null
  email: string | null
  address: string | null
  license_number: string | null
  license_expiry: string | null
  category: string | null
  status: "active" | "on_trip" | "off_duty" | "inactive"
  joined_date: string | null
  created_at: string
  updated_at: string | null
}

export interface FleetDrone {
  id: string
  drone_name: string
  model: string | null
  registration_number: string | null
  category: "ankaa" | "gis" | "taqa"
  status: "available" | "in_use" | "maintenance" | "retired"
  flight_hours: number
  registration_date: string | null
  last_maintenance: string | null
  next_maintenance: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface FleetDroneAssignment {
  id: string
  drone_id: string
  pilot_id: string
  start_condition: "good" | "fair" | "poor" | string
  start_condition_note: string | null
  end_condition: string | null
  end_condition_note: string | null
  start_flight_hours: number
  end_flight_hours: number | null
  assignment_date: string | null
  return_date: string | null
  is_active: number
  start_location: string | null
  end_location: string | null
  created_at: string
  updated_at: string | null
}

export interface FleetDroneMaintenance {
  id: string
  drone_id: string
  maintenance_type: "routine" | "repair" | "battery" | "calibration" | "firmware" | "other"
  description: string | null
  maintenance_date: string | null
  completed_date: string | null
  cost: number | null
  performed_by: string | null
  flight_hours_at_maintenance: number
  status: "pending" | "completed"
  notes: string | null
  created_at: string
}

export interface FleetPilot {
  id: string
  user_id: string | null
  name: string
  phone: string | null
  email: string | null
  address: string | null
  drone_category: "small" | "medium" | "large"
  total_flight_hours: number
  license_number: string | null
  license_expiry: string | null
  status: "active" | "on_mission" | "off_duty" | "inactive"
  created_at: string
  updated_at: string | null
}

export interface FleetFlightLog {
  id: string
  pilot_id: string | null
  drone_id: string | null
  mission_name: string
  start_time: string | null
  end_time: string | null
  flight_duration: number
  start_location: string | null
  end_location: string | null
  flight_path: string | null
  status: "completed" | "aborted" | "incident" | "in_progress"
  weather_conditions: string | null
  wind_speed: number | null
  temperature: number | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface FleetTrip {
  id: string
  vehicle_id: string | null
  driver_id: string | null
  requested_by: string | null
  purpose: string | null
  destination: string | null
  departure: string | null
  return_time: string | null
  mileage_start: number | null
  mileage_end: number | null
  status: "pending" | "approved" | "active" | "completed" | "cancelled"
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface Invoice {
  id: string
  user_id: string
  name: string
  amount: number | null
  transaction_date: string | null
  status: "paid" | "unpaid"
  expense_category:
    | "fuel"
    | "materials"
    | "transportation"
    | "food"
    | "others"
    | null
  cost_center: string | null
  description: string | null
  currency: string | null
  bill_number: string | null
  paid_by: string | null
  fuel_amount: number | null
  materials_amount: number | null
  transportation_amount: number | null
  food_amount: number | null
  others_amount: number | null
  created_at: string
  updated_at?: string | null
}

export interface MeetingRoom {
  id: string
  name: string
  capacity: number
  floor: string | null
  amenities: string[]
  is_active: boolean
}

export interface RoomBooking {
  id: string
  room_id: string
  booked_by: string
  title: string
  start_time: string
  end_time: string
  attendees_count: number
  status: "confirmed" | "cancelled" | "pending"
}

export interface Todo {
  id: number
  user_id: string
  task: string
  is_complete: boolean
  due_date: string | null
  priority: "low" | "medium" | "high"
  notes: string | null
}

export interface KanbanCard {
  id: string
  list_id: string
  project_id: string
  title: string
  description: string | null
  position: number
  completed: boolean
  due_date: string | null
  priority: "low" | "medium" | "high" | "urgent" | null
  labels: string[]
  assignees?: { user_id: string; full_name: string | null }[]
}

export interface KanbanList {
  id: string
  project_id: string
  title: string
  position: number
  cards?: KanbanCard[]
}

export interface KanbanProject {
  id: string
  name: string
  description: string | null
  lists?: KanbanList[]
}

export interface OrgChartNode {
  id: string
  title: string | null
  user_id: string | null
  parent_id: string | null
  department: string | null
  is_c_level: boolean
  is_head_of_department: boolean
  can_direct_approve: boolean
  full_name?: string | null
  avatar_url?: string | null
}

export interface CostCenter {
  id: string
  name: string
  code: string | null
  description: string | null
  active: boolean
}

export interface Notification {
  id: number
  user_id: string
  notification_type: string
  viewed_at: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string | null
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

export interface Holiday {
  id: string
  name: string
  date: string
  type: "public" | "optional" | "company"
}
