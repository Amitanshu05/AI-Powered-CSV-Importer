// Single source of truth for "what we tell the AI to do."
// Kept separate from any AI-provider code (Gemini today, maybe OpenAI/Claude later —
// see architecture.md §2, AIProviderService) so the PROMPT can be unit-tested/reused
// independent of which SDK is calling it. Also kept separate from crm-record.schema.ts:
// the schema says what shape is valid, this file says what the model should try to do
// to produce that shape. Two different concerns, same as request-validation vs AI-output
// docs in contract.md.

export const CRM_EXTRACTION_SYSTEM_PROMPT = `
You are a data-extraction engine for a real-estate CRM called GrowEasy.

You will receive ONE row from an arbitrary CSV export (Facebook Lead Ads, Google Ads,
a manually built spreadsheet, another CRM's export, etc). Column names are NOT fixed —
they vary between sources. Your job is to intelligently map whatever columns exist onto
the fixed GrowEasy CRM fields below, using your judgment about what each column likely means.

## Output fields (all optional/nullable except created_at)
- created_at: lead creation date/time. You MUST output this as a valid ISO 8601 string
  in the exact format "YYYY-MM-DDTHH:mm:ssZ" (e.g. "2026-05-13T14:20:00Z"). Do NOT
  output ambiguous formats like "13/05/2026" or "05/13/2026" — these are unreliable
  across JS engines. If the source has no date, use the current date/time in this
  same ISO format. This value must always work with JavaScript's \`new Date(created_at)\`.
- name: lead's full name.
- email: primary email address.
- country_code: phone country code (e.g. "+91").
- mobile_without_country_code: phone number WITHOUT the country code.
- company: company/organization name.
- city, state, country: location fields.
- lead_owner: whoever owns/is assigned this lead (often an email or name).
- crm_status: MUST be exactly one of GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD,
  SALE_DONE, or null. Never invent a new value. If the source has a status/stage column
  that doesn't map cleanly, use your best judgment or leave it null — do not guess wildly.
- crm_note: free text for remarks, follow-up notes, extra emails, extra phone numbers,
  or anything useful that doesn't fit another field.
- data_source: MUST be exactly one of leads_on_demand, meridian_tower, eden_park,
  varah_swamy, sarjapur_plots, or null if nothing in the row confidently matches one
  of these. Do not guess — leave null rather than force a match.
- possession_time: property possession timeframe, if present (real estate context).
- description: any other descriptive text about the lead.

## Rules you MUST follow
1. If the row has multiple email addresses: put the first in "email", append the rest
   into "crm_note" (clearly labeled, e.g. "Other emails: a@x.com, b@x.com").
2. If the row has multiple phone numbers: put the first in "mobile_without_country_code",
   append the rest into "crm_note" the same way.
3. Never fabricate a value for crm_status or data_source outside their allowed enums —
   null is always a valid, preferred answer over a guess.
4. Escape any newline inside crm_note as "\\n" — the record must remain a single CSV row
   if exported later. Never emit a literal newline character in any field.
5. You MUST include every single field listed above in your JSON output, every time,
   with no exceptions. Never omit a field. If a field doesn't apply or you can't find
   a confident value for it, you MUST still include it with an explicit null — do not
   skip it. A missing field is treated as an error, not as "not applicable."

Here is the row (as JSON, column-name: value pairs from the original CSV):
`.trim();

/**
 * Builds the full prompt for a single CSV row.
 * Kept as a plain function (not a class) — Phase 2 only needs "prompt in, string out."
 */
export function buildSingleRowPrompt(rawRow: Record<string, string>): string {
  return `${CRM_EXTRACTION_SYSTEM_PROMPT}\n\n${JSON.stringify(rawRow, null, 2)}`;
}

/**
 * JSON Schema (Gemini's responseSchema format, NOT a Zod schema) mirroring
 * CrmRecordSchema field-for-field. Gemini's structured-output mode wants a
 * plain JSON Schema object here, not a Zod instance — so this is a deliberate,
 * commented-as-such duplication of crm-record.schema.ts's shape. If contract.md's
 * schema changes, this must change too (same rule as the schema file's own comment).
 */
export const CRM_RECORD_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    created_at: { type: "string" },
    name: { type: "string", nullable: true },
    email: { type: "string", nullable: true },
    country_code: { type: "string", nullable: true },
    mobile_without_country_code: { type: "string", nullable: true },
    company: { type: "string", nullable: true },
    city: { type: "string", nullable: true },
    state: { type: "string", nullable: true },
    country: { type: "string", nullable: true },
    lead_owner: { type: "string", nullable: true },
    crm_status: {
      type: "string",
      nullable: true,
      enum: ["GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE"],
    },
    crm_note: { type: "string", nullable: true },
    data_source: {
      type: "string",
      nullable: true,
      enum: ["leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots"],
    },
    possession_time: { type: "string", nullable: true },
    description: { type: "string", nullable: true },
  },
  required: [
    "created_at",
    "name",
    "email",
    "country_code",
    "mobile_without_country_code",
    "company",
    "city",
    "state",
    "country",
    "lead_owner",
    "crm_status",
    "crm_note",
    "data_source",
    "possession_time",
    "description",
  ],
} as const;