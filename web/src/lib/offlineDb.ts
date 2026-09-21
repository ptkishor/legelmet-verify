import Dexie, { type Table } from "dexie";
import type { SyncStatus, InspectionResult } from "@/types/database";

export interface OfflineInspection {
  id?: number; // local auto-increment key
  client_uuid: string; // UUIDv4 for server idempotency
  application_id: string;
  instrument_id: string;
  officer_id: string;
  checklist: Record<string, boolean>;
  readings: {
    loads: Array<{
      test_load_kg: number;
      indicated_kg: number;
      error_g: number;
      mpe_g: number;
      status: "pass" | "fail";
    }>;
    eccentricity_error_g?: number;
    repeatability_error_g?: number;
  };
  photos: string[];
  latitude: number | null;
  longitude: number | null;
  result: InspectionResult;
  remarks: string;
  inspected_at: string;
  offline_created_at: string;
  sync_status: SyncStatus;
  sync_error?: string | null;
  // Metadata for offline display
  instrument_digital_id?: string;
  shop_name?: string;
  instrument_category?: string;
}

export interface CachedApplication {
  id: string;
  application_no: string;
  instrument_id: string;
  applicant_id: string;
  type: string;
  status: string;
  scheduled_at: string | null;
  remarks: string | null;
  created_at: string;
  // Embedded instrument
  digital_id: string;
  shop_name: string;
  category: string;
  make: string;
  model: string;
  serial_no: string;
  capacity: string;
  district: string;
  state: string;
}

export class LegalMetOfflineDatabase extends Dexie {
  inspections!: Table<OfflineInspection, number>;
  cachedApplications!: Table<CachedApplication, string>;

  constructor() {
    super("LegalMetOfflineDB");
    this.version(1).stores({
      inspections: "++id, client_uuid, application_id, instrument_id, officer_id, sync_status, inspected_at",
      cachedApplications: "id, application_no, digital_id, district, state, status",
    });
  }
}

export const offlineDb = new LegalMetOfflineDatabase();
