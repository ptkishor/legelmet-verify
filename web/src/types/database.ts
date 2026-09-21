/**
 * Database type definitions for Supabase.
 *
 * In a production project you'd run `supabase gen types typescript`
 * to auto-generate this from your schema. For our hackathon prototype,
 * we define them manually so the frontend has type safety from day one.
 *
 * These types will be expanded in Phase 1 (SQL migrations).
 * For now we have the skeleton so that imports don't break.
 */

export type UserRole =
  | "business_owner"
  | "metrology_officer"
  | "gatc_user"
  | "admin"
  | "citizen";

export type InstrumentStatus =
  | "pending"
  | "verified"
  | "expired"
  | "rejected"
  | "suspended";

export type ApplicationType =
  | "new_verification"
  | "re_verification"
  | "post_repair";

export type ApplicationStatus =
  | "submitted"
  | "assigned"
  | "scheduled"
  | "inspected"
  | "approved"
  | "rejected";

export type InspectionResult = "pass" | "fail";

export type ComplaintStatus = "open" | "assigned" | "resolved" | "rejected";

export type SyncStatus = "pending" | "syncing" | "synced" | "conflict";

/* ────────────────────────────────────────────────
 * Row types — one per table in our schema.
 * These mirror the SQL tables defined in Phase 1.
 * ──────────────────────────────────────────────── */

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  jurisdiction_state: string | null;
  jurisdiction_district: string | null;
  designation: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Instrument {
  id: string;
  digital_id: string;
  category: string;
  make: string;
  model: string;
  serial_no: string;
  capacity: string | null;
  accuracy_class: string | null;
  manufacture_year: number | null;
  owner_id: string;
  shop_name: string | null;
  address: string | null;
  district: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  nameplate_photo_url: string | null;
  status: InstrumentStatus;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  application_no: string;
  instrument_id: string;
  applicant_id: string;
  type: ApplicationType;
  status: ApplicationStatus;
  assigned_officer_id: string | null;
  scheduled_at: string | null;
  documents: Record<string, unknown> | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  application_id: string;
  instrument_id: string;
  officer_id: string;
  checklist: Record<string, unknown>;
  readings: Record<string, unknown>;
  photos: string[];
  latitude: number | null;
  longitude: number | null;
  result: InspectionResult;
  remarks: string | null;
  inspected_at: string;
  offline_created_at: string | null;
  sync_status: SyncStatus;
  client_uuid: string;
}

export interface TestReport {
  id: string;
  instrument_id: string;
  gatc_user_id: string;
  test_data: Record<string, unknown>;
  report_url: string | null;
  result: string;
  tested_at: string;
}

export interface Certificate {
  id: string;
  certificate_no: string;
  instrument_id: string;
  inspection_id: string;
  issued_by: string;
  issued_at: string;
  valid_till: string;
  pdf_url: string | null;
  signature_hash: string;
  is_revoked: boolean;
  revoked_reason: string | null;
}

export interface Complaint {
  id: string;
  complaint_no: string;
  instrument_id: string;
  citizen_name: string;
  citizen_contact: string | null;
  description: string;
  photo_url: string | null;
  status: ComplaintStatus;
  assigned_officer_id: string | null;
  resolution_remarks: string | null;
  created_at: string;
}

export interface OwnershipHistory {
  id: string;
  instrument_id: string;
  from_owner_id: string | null;
  to_owner_id: string;
  transferred_at: string;
  remarks: string | null;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

/* ────────────────────────────────────────────────
 * Supabase Database type — used by createClient<Database>()
 * ──────────────────────────────────────────────── */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      instruments: { Row: Instrument; Insert: Partial<Instrument>; Update: Partial<Instrument> };
      applications: { Row: Application; Insert: Partial<Application>; Update: Partial<Application> };
      inspections: { Row: Inspection; Insert: Partial<Inspection>; Update: Partial<Inspection> };
      test_reports: { Row: TestReport; Insert: Partial<TestReport>; Update: Partial<TestReport> };
      certificates: { Row: Certificate; Insert: Partial<Certificate>; Update: Partial<Certificate> };
      complaints: { Row: Complaint; Insert: Partial<Complaint>; Update: Partial<Complaint> };
      ownership_history: { Row: OwnershipHistory; Insert: Partial<OwnershipHistory>; Update: Partial<OwnershipHistory> };
      audit_log: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
    };
    Views: Record<string, never>;
    Functions: {
      get_instrument_verification: {
        Args: { p_digital_id: string };
        Returns: Record<string, unknown>;
      };
      compute_risk_score: {
        Args: { p_instrument_id: string };
        Returns: {
          total_score: number;
          risk_band: string;
          factors: Array<{ factor: string; points: number }>;
        }[];
      };
      get_my_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      instrument_status: InstrumentStatus;
      application_type: ApplicationType;
      application_status: ApplicationStatus;
      inspection_result: InspectionResult;
      complaint_status: ComplaintStatus;
      sync_status: SyncStatus;
    };
  };
}

