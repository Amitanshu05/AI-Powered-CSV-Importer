import { z } from "zod";

// IMPORTANT: this file must always match docs/contract.md exactly.
// If you change one, change the other in the same commit.

export const CrmStatusEnum = z.enum([
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
]);

export const DataSourceEnum = z.enum([
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
]);

export const CrmRecordSchema = z.object({
  // NOTE: nullable here (was previously non-nullable) — see decisions.md #16.
  // The AI is allowed to say "no date found" (null) instead of being structurally
  // forced to invent one. batch.service.ts fills a real fallback timestamp in code
  // when this comes back null, so the FINAL record returned to the frontend still
  // always has a usable created_at — the nullability exists at the AI-output
  // validation boundary, not in what the API ultimately returns.
  created_at: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  country_code: z.string().nullable(),
  mobile_without_country_code: z.string().nullable(),
  company: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  lead_owner: z.string().nullable(),
  crm_status: CrmStatusEnum.nullable(),
  crm_note: z.string().nullable(),
  data_source: DataSourceEnum.nullable(),
  possession_time: z.string().nullable(),
  description: z.string().nullable(),
});

export type CrmRecord = z.infer<typeof CrmRecordSchema>;

// Request body shape for POST /api/import
export const ImportRequestSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1, "rows cannot be empty"),
});

export type ImportRequest = z.infer<typeof ImportRequestSchema>;