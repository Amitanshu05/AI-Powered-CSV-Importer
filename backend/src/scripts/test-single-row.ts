// PHASE 2 — "single row, dumb version first."
// This file is deliberately NOT AIProviderService. Per architecture.md §2 and the
// Phase 3 checklist item ("Extract into AIProviderService"), the interface/abstraction
// is a Phase 3 concern. Right now the only goal is: prove one row can go
// raw CSV row -> Gemini -> structured JSON -> Zod validation, end to end.
// This script is meant to be deleted (or left as a manual smoke-test) once
// AIProviderService exists.
//
// Run with: npm run test:single-row

import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { CrmRecordSchema } from "../schemas/crm-record.schema";
import { buildSingleRowPrompt, CRM_RECORD_RESPONSE_SCHEMA } from "../prompts/crm-extraction.prompt";

// Intentionally messy: different column names than our CRM fields, multiple emails,
// multiple phone numbers, and a status column that isn't one of our enum values verbatim —
// this is the actual hard part of the assignment (ambiguous columns, not clean ones).
const SAMPLE_ROW: Record<string, string> = {
  "Full Name": "Ananya Rao",
  "Contact Email": "ananya.rao@example.com / a.rao.alt@gmail.com",
  "Phone": "+91 98765 43210, alt: 98765 00000",
  "Lead Stage": "Follow up - interested, wants a callback next week",
  "Project": "Eden Park Phase 2",
  "Assigned To": "owner@groweasy.ai",
  "City": "Bengaluru",
  "Submitted On": "13/05/2026 14:20",
  "Comments": "Asked about EMI options and possession timeline",
};

// Pulled forward from Phase 3 (architecture.md §5: "batch level: retry with
// exponential backoff, max 2-3 attempts") because gemini-3.5-flash is currently
// returning persistent 503 "high demand" errors — a documented, temporary,
// server-side capacity issue on Google's end, not a bug in our code. This is
// scoped to ONE call, not the full batch-level retry system Phase 3 will build.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetryAndFallback(
  ai: GoogleGenAI,
  prompt: string
): Promise<{ text: string; modelUsed: string }> {
  // Try the primary model first, then fall back to a second stable model if the
  // primary is still overloaded after retries. Both are current, non-preview,
  // non-retired models as of today.
const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];  const maxAttemptsPerModel = 3;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: CRM_RECORD_RESPONSE_SCHEMA,
          },
        });

        if (!response.text) {
          throw new Error("Gemini returned no text content");
        }

        return { text: response.text, modelUsed: model };
      } catch (err: any) {
        const status = err?.status;
        const isRetryable = status === 503 || status === 429;

        logger.warn(
          { model, attempt, status, message: err?.message },
          isRetryable ? "Retryable error — will retry/fallback" : "Non-retryable error"
        );

        if (!isRetryable) {
          throw err; // don't retry things like 400 bad request, 401 auth, etc.
        }

        const isLastAttemptForThisModel = attempt === maxAttemptsPerModel;
        if (!isLastAttemptForThisModel) {
          const backoffMs = attempt * 2000; // 2s, 4s, 6s
          logger.info({ backoffMs }, "Waiting before retry");
          await sleep(backoffMs);
        }
      }
    }
    logger.warn({ model }, "Exhausted retries for this model, trying next fallback model");
  }

  throw new Error("All models exhausted retries — Gemini appears fully unavailable right now");
}

async function main() {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const prompt = buildSingleRowPrompt(SAMPLE_ROW);

  logger.info({ row: SAMPLE_ROW }, "Sending single row to Gemini");

  const { text: rawText, modelUsed } = await generateWithRetryAndFallback(ai, prompt);

  logger.info({ rawText, modelUsed }, "Raw Gemini output");

  // Defense-in-depth only: because we set responseMimeType "application/json" +
  // responseSchema above (Gemini's actual structured-output mode), Gemini should never
  // wrap output in ```json fences — that failure mode belongs to plain-text prompting,
  // not this mode. Stripping anyway costs nothing and guards against a future change
  // to this call (e.g. someone removing responseSchema) silently reintroducing it.
  const cleanedText = rawText.trim().replace(/^```json\s*|^```\s*|```$/g, "").trim();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleanedText);
  } catch (err) {
    // This is exactly the failure mode architecture.md §2 warns about:
    // structured-output mode reduces malformed JSON, it doesn't guarantee zero.
    logger.error({ err, rawText }, "Gemini output was not valid JSON");
    process.exit(1);
  }

  // Real, observed failure mode: Gemini sometimes OMITS a key entirely for fields
  // it considers "not applicable" instead of explicitly writing null. Our schema
  // uses `.nullable()` (matches contract.md's CrmRecord type exactly — a key that
  // must be present, valued string OR null) — it does not accept a missing key.
  // Rather than weaken crm-record.schema.ts (which must stay identical to
  // contract.md), we normalize the AI's raw output here: fill any missing field
  // with null before validation. This is normalization of untrusted AI output,
  // not a relaxation of what "valid" means.
  const CRM_RECORD_FIELD_NAMES = Object.keys(CRM_RECORD_RESPONSE_SCHEMA.properties);

  if (typeof parsedJson !== "object" || parsedJson === null || Array.isArray(parsedJson)) {
    logger.error({ parsedJson }, "Gemini output was valid JSON but not an object");
    process.exit(1);
  }

  const normalizedJson: Record<string, unknown> = { ...(parsedJson as Record<string, unknown>) };
  for (const field of CRM_RECORD_FIELD_NAMES) {
    if (!(field in normalizedJson)) {
      normalizedJson[field] = null;
    }
  }

  // The actual enforcement point — never trust the model's output blindly,
  // even though we asked for a schema-shaped response.
  const result = CrmRecordSchema.safeParse(normalizedJson);

  if (!result.success) {
    logger.error({ issues: result.error.issues, normalizedJson }, "Zod validation FAILED");
    process.exit(1);
  }

  logger.info(
    { crmRecord: result.data, modelUsed },
    "✅ Zod validation PASSED — single row works end-to-end"
  );
}

main().catch((err) => {
  logger.error({ err }, "Unhandled error in test-single-row script");
  process.exit(1);
});