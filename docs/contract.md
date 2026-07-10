# Contract — GrowEasy CSV Importer

This is the frozen source of truth for how frontend and backend talk to each other.
If you need to change something here, update this file FIRST, then code.

---

## 1. CRM Record Schema (Zod, backend `schemas/crm-record.schema.ts`)

```ts
import { z } from "zod";

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
  created_at: z.string().nullable(),       // nullable at AI-output validation boundary;
                                             // backend guarantees a real value by the
                                             // time a record reaches this API's response
                                             // (see note below) — see decisions.md #16
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  country_code: z.string().nullable(),
  mobile_without_country_code: z.string().nullable(),  // digits only, enforced in code
                                                          // regardless of AI output — decisions.md #16
  company: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  lead_owner: z.string().nullable(),
  crm_status: CrmStatusEnum.nullable(),
  crm_note: z.string().nullable(),
  data_source: DataSourceEnum.nullable(),  // blank/null if no confident match
  possession_time: z.string().nullable(),
  description: z.string().nullable(),
});

export type CrmRecord = z.infer<typeof CrmRecordSchema>;
```

**Rules the AI must follow (re-stated here so schema + prompt never drift apart):**
- `crm_status` — one of the 4 enum values, or `null`. Never invent a new value.
- `data_source` — one of the 5 enum values, or `null` if no confident match.
- `created_at` — if a date exists in the source row, must work with `new Date(created_at)`
  in JS. If NO date exists in the source, the AI must output `null` (never invent a
  date) — the backend then fills the current processing timestamp as a fallback
  before the record is returned, so every record in the API response has a real,
  non-null `created_at` in practice. See decisions.md #16 for why this fallback lives
  in backend code, not the AI prompt.
- `mobile_without_country_code` — digits only, no spaces/dashes/formatting. The AI is
  asked to do this in the prompt, but the backend also strips non-digit characters in
  code regardless of AI compliance (decisions.md #16).
- If multiple emails exist → first one in `email`, rest appended into `crm_note`.
- If multiple mobile numbers exist → first one in `mobile_without_country_code`, rest appended into `crm_note`.
- Any newline inside `crm_note` must be escaped (`\n`) so the record stays a single CSV row if exported later. Enforced in code (`batch.service.ts`), not just prompted.
- A row with **no email AND no mobile number** must be skipped, not returned.

---

## 2. API Endpoints

### `POST /api/import`

**Request body** (JSON — frontend has already parsed the CSV locally, sends structured rows):

```ts
{
  rows: Record<string, string>[]   // raw parsed CSV rows, headers as keys, values as strings
}
```

**Response body (success):**

```ts
{
  success: true,
  data: {
    imported: CrmRecord[],
    skipped: {
      originalRow: Record<string, string>,
      reason: string              // e.g. "No email or mobile number found"
    }[],
    totalImported: number,
    totalSkipped: number
  }
}
```

**Response body (failure — request-level, e.g. bad payload):**

```ts
{
  success: false,
  error: {
    message: string,
    code: string                  // e.g. "INVALID_PAYLOAD", "AI_PROVIDER_ERROR"
  }
}
```

Notes:
- This endpoint is stateless — no session, no DB write. Everything needed is in the request; everything produced is in the response.
- Partial AI/batch failures do NOT fail the whole request — any row that couldn't be processed after retries goes into `skipped` with a reason, not into an HTTP error.
- HTTP error responses (4xx/5xx) are reserved for request-level problems: malformed payload, missing file, AI provider totally unreachable after retries.

### `GET /api/health` (basic, for deployment sanity checks)

```ts
{ status: "ok" }
```

---

## 3. Frontend-Owned Responsibilities (never touches backend)

- Reading the raw CSV file (drag & drop / file picker)
- Parsing CSV → array of row objects (PapaParse)
- Rendering the pre-AI preview table
- Holding parsed rows in local state between "Preview" and "Confirm"

## 4. Backend-Owned Responsibilities (never touches raw CSV file)

- Receiving already-parsed row JSON only
- Batching, prompting, and validating AI output
- Normalizing AI output before validation (created_at fallback, phone digit-stripping,
  newline escaping — decisions.md #16)
- Returning `imported` / `skipped` per the shape above

---

## 5. Error Codes Reference

| Code | Meaning |
|---|---|
| `INVALID_PAYLOAD` | Request body doesn't match expected shape |
| `AI_PROVIDER_ERROR` | AI provider unreachable/failed after all retries |
| `EMPTY_ROWS` | `rows` array was empty |

---

*Last updated: Phase 3 (created_at nullability + phone/newline normalization). Update this file whenever the actual shape changes during build, and note the change in `decisions.md` if it reflects a design shift.*