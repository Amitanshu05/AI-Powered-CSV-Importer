// src/types/crm-record.ts

export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

export interface CrmRecord {
  created_at: string | null;
  name: string | null;
  email: string | null;
  country_code: string | null;
  mobile_without_country_code: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lead_owner: string | null;
  crm_status: CrmStatus | null;
  crm_note: string | null;
  data_source: DataSource | null;
  possession_time: string | null;
  description: string | null;
}

// A raw parsed CSV row — headers as keys, values always strings.
// This is what PapaParse gives us and exactly what POST /api/import expects.
export type RawCsvRow = Record<string, string>;

export interface SkippedRow {
  originalRow: RawCsvRow;
  reason: string;
}

export interface ImportSuccessResponse {
  success: true;
  data: {
    imported: CrmRecord[];
    skipped: SkippedRow[];
    totalImported: number;
    totalSkipped: number;
  };
}

export interface ImportErrorResponse {
  success: false;
  error: {
    message: string;
    code: "INVALID_PAYLOAD" | "AI_PROVIDER_ERROR" | "EMPTY_ROWS" | string;
  };
}

export type ImportResponse = ImportSuccessResponse | ImportErrorResponse;

export interface ImportRequestBody {
  rows: RawCsvRow[];
}