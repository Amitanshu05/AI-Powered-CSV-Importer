import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { logger } from "../config/logger";
import {
  buildBatchPrompt,
  CRM_BATCH_RESPONSE_SCHEMA,
  CRM_RECORD_FIELD_NAMES,
} from "../prompts/crm-extraction.prompt";

// Interface first, Gemini implementation second — per architecture.md §2:
// "Abstracts the actual LLM SDK behind an interface. If Gemini has an outage or we
// want to compare providers, it's a config change, not a rewrite." Any calling code
// (BatchService) depends on THIS interface, never on GoogleGenAI directly.
export interface AIProvider {
  /**
   * Sends a batch of raw CSV rows to the AI and returns the raw parsed JSON array
   * it produced — same length/order as the input. This is UNVALIDATED output;
   * callers (BatchService) must still run it through Zod. AIProviderService's job
   * ends at "got valid JSON back from the model," not "the JSON is semantically correct."
   */
  extractBatch(rows: Record<string, string>[]): Promise<unknown[]>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Strip a ```json fence if present. Defense-in-depth only — see comment at the call
// site below for why this shouldn't normally trigger with responseSchema in use.
function stripCodeFence(text: string): string {
  return text.trim().replace(/^```json\s*|^```\s*|```$/g, "").trim();
}

export class GeminiAIProvider implements AIProvider {
  private ai: GoogleGenAI;
  private readonly maxAttemptsPerModel = 3;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async extractBatch(rows: Record<string, string>[]): Promise<unknown[]> {
    const prompt = buildBatchPrompt(rows);

    // Model names come from env (config), not hardcoded here — see decisions.md #11
    // and env.ts comments for why, after hitting two live model retirements in one day.
    const modelsToTry = [env.GEMINI_PRIMARY_MODEL, env.GEMINI_FALLBACK_MODEL];

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= this.maxAttemptsPerModel; attempt++) {
        try {
          const response = await this.ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: CRM_BATCH_RESPONSE_SCHEMA,
            },
          });

          if (!response.text) {
            throw new Error("Gemini returned no text content");
          }

          // Defense-in-depth only: responseSchema + responseMimeType "application/json"
          // (Gemini's real structured-output mode) should never wrap output in fences —
          // that failure mode belongs to plain-text prompting. Stripping anyway costs
          // nothing and guards against a future change to this call silently
          // reintroducing it.
          const cleanedText = stripCodeFence(response.text);

          let parsedJson: unknown;
          try {
            parsedJson = JSON.parse(cleanedText);
          } catch (parseErr) {
            // This IS a real failure worth retrying — malformed JSON from the model
            // is rare with structured output but not impossible (architecture.md §2).
            throw Object.assign(new Error("Gemini output was not valid JSON"), {
              cause: parseErr,
              rawText: response.text,
            });
          }

          if (!Array.isArray(parsedJson)) {
            throw new Error("Gemini output was valid JSON but not an array");
          }

          if (parsedJson.length !== rows.length) {
            // Real, possible failure mode: model returns wrong element count.
            // Treat as retryable — a fresh attempt is more useful than silently
            // misaligning row N's output with row N+1's input.
            throw new Error(
              `Gemini returned ${parsedJson.length} records for ${rows.length} input rows — count mismatch`
            );
          }

          // Same normalization as Phase 2: fill any missing key with null before
          // validation, since Gemini sometimes omits a key instead of writing null.
          // Applied per-element here since this is now an array.
          const normalized = parsedJson.map((item) => {
            if (typeof item !== "object" || item === null || Array.isArray(item)) {
              return item; // let Zod validation catch and report this per-row later
            }
            const normalizedItem: Record<string, unknown> = { ...(item as Record<string, unknown>) };
            for (const field of CRM_RECORD_FIELD_NAMES) {
              if (!(field in normalizedItem)) {
                normalizedItem[field] = null;
              }
            }
            return normalizedItem;
          });

          logger.info(
            { model, batchSize: rows.length },
            "Batch extraction succeeded"
          );

          return normalized;
        } catch (err: any) {
          const status = err?.status;
          const isRetryable =
            status === 503 || status === 429 || err.message?.includes("not valid JSON") ||
            err.message?.includes("count mismatch") || err.message?.includes("not an array");

          logger.warn(
            { model, attempt, status, message: err?.message },
            isRetryable ? "Retryable batch error — will retry/fallback" : "Non-retryable batch error"
          );

          if (!isRetryable) {
            throw err; // e.g. 400 bad request, 401 auth — retrying won't help
          }

          const isLastAttemptForThisModel = attempt === this.maxAttemptsPerModel;
          if (!isLastAttemptForThisModel) {
            const backoffMs = attempt * 2000; // 2s, 4s
            await sleep(backoffMs);
          }
        }
      }
      logger.warn({ model }, "Exhausted retries for this model, trying next fallback model");
    }

    throw new Error(
      `All configured models (${modelsToTry.join(", ")}) exhausted retries for this batch`
    );
  }
}

// Ready-to-use singleton — stateless (no per-request data held), matches
// architecture.md §3's stateless design. BatchService imports this, not the class.
export const aiProvider: AIProvider = new GeminiAIProvider();