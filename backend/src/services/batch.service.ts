import pLimit from "p-limit";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { aiProvider } from "./ai-provider.service";
import { CrmRecordSchema, type CrmRecord } from "../schemas/crm-record.schema";

export interface SkippedRow {
  originalRow: Record<string, string>;
  reason: string;
}

export interface ImportResult {
  imported: CrmRecord[];
  skipped: SkippedRow[];
  totalImported: number;
  totalSkipped: number;
}

// Splits rows into fixed-size chunks. Simple row-count chunking (not a true token
// estimate) — good enough per architecture.md §2 ("must be chunked" to stay under
// a model's token ceiling); BATCH_SIZE is deliberately conservative (default 20)
// so even rows with long free-text fields stay well under any model's limit.
function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

// FIX (decisions.md #16): the prompt used to tell the AI "if no date, use the
// current date" — the model was structurally forced to fabricate a value, since
// created_at also wasn't nullable in the schema. Both are now fixed at the source
// (prompt + schema), but per architecture.md §2 ("never trust the model's output
// blindly"), the ACTUAL fallback decision belongs here, in our own code — not left
// to the model even after the fix. If the AI honestly reports null (no date found
// in the row), WE decide what happens next: use the current processing time as an
// honest "we don't know the original date, so we're timestamping when this was
// imported" fallback — not something the AI silently invented and labeled as fact.
function applyCreatedAtFallback(rawRecord: Record<string, unknown>): Record<string, unknown> {
  if (rawRecord.created_at === null || rawRecord.created_at === undefined || rawRecord.created_at === "") {
    return { ...rawRecord, created_at: new Date().toISOString() };
  }
  return rawRecord;
}

// FIX (decisions.md #16): contract.md specifies mobile_without_country_code as
// digits only, no formatting. The prompt asks the AI for this, but per the same
// "never trust blindly" principle, we enforce it ourselves rather than relying on
// the model to consistently strip spaces/dashes on its own.
function normalizePhoneDigitsOnly(rawRecord: Record<string, unknown>): Record<string, unknown> {
  const phone = rawRecord.mobile_without_country_code;
  if (typeof phone === "string" && phone.length > 0) {
    return { ...rawRecord, mobile_without_country_code: phone.replace(/\D/g, "") };
  }
  return rawRecord;
}

// Applies both normalization fixes above to one raw AI record, before Zod validation
// ever sees it. Order doesn't matter between these two — they touch different fields.
function normalizeAiRecord(rawRecord: unknown): unknown {
  if (typeof rawRecord !== "object" || rawRecord === null || Array.isArray(rawRecord)) {
    return rawRecord; // not an object — let Zod validation catch and report this
  }
  let normalized = rawRecord as Record<string, unknown>;
  normalized = applyCreatedAtFallback(normalized);
  normalized = normalizePhoneDigitsOnly(normalized);
  return normalized;
}

// ROW LEVEL fault isolation (architecture.md §5): validate + apply skip rules to
// one batch's results, matching each output record back to its original row by
// index (AIProviderService guarantees output.length === input.length, or throws).
// contract.md rule: "Any newline inside crm_note must be escaped (\n) so the record
// stays a single CSV row if exported later." The PROMPT already asks the AI to do
// this — but per architecture.md §2 ("never trust the model's output blindly"),
// that's a request, not a guarantee. This enforces it in code regardless of whether
// the AI actually complied.
function escapeNewlinesInNote(record: CrmRecord): CrmRecord {
  if (record.crm_note && /\r\n|\n|\r/.test(record.crm_note)) {
    return { ...record, crm_note: record.crm_note.replace(/\r\n|\n|\r/g, "\\n") };
  }
  return record;
}

function processRowsInChunk(
  chunk: Record<string, string>[],
  rawResults: unknown[]
): { imported: CrmRecord[]; skipped: SkippedRow[] } {
  const imported: CrmRecord[] = [];
  const skipped: SkippedRow[] = [];

  for (let i = 0; i < chunk.length; i++) {
    const originalRow = chunk[i];

    // Normalize BEFORE validation — fills created_at fallback, strips phone
    // formatting. This is the actual enforcement point for decisions.md #16.
    const normalizedRecord = normalizeAiRecord(rawResults[i]);

    // The actual enforcement point — never trust the model's output blindly,
    // even after AIProviderService's own normalization pass and the fixes above.
    const result = CrmRecordSchema.safeParse(normalizedRecord);

    if (!result.success) {
      const issueSummary = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      skipped.push({
        originalRow,
        reason: `AI output failed validation (${issueSummary})`,
      });
      continue;
    }

    const record = result.data;

    // contract.md rule: "A row with no email AND no mobile number must be
    // skipped, not returned." Checked on the EXTRACTED output, since the AI is
    // what determines whether an email/mobile was actually found in the row.
    if (record.email === null && record.mobile_without_country_code === null) {
      skipped.push({
        originalRow,
        reason: "No email or mobile number found",
      });
      continue;
    }

    imported.push(escapeNewlinesInNote(record));
  }

  return { imported, skipped };
}

// BATCH LEVEL fault isolation (architecture.md §5): if an entire batch call fails
// even after AIProviderService's own internal retries/fallback are exhausted,
// every row in that batch goes to skipped with a reason — this does NOT fail the
// whole request (contract.md: "Partial AI/batch failures do NOT fail the whole
// request").
async function processOneChunk(
  chunk: Record<string, string>[]
): Promise<{ imported: CrmRecord[]; skipped: SkippedRow[] }> {
  try {
    const rawResults = await aiProvider.extractBatch(chunk);
    return processRowsInChunk(chunk, rawResults);
  } catch (err: any) {
    logger.error(
      { err: err?.message, chunkSize: chunk.length },
      "Entire batch failed after all retries — skipping every row in this batch"
    );
    return {
      imported: [],
      skipped: chunk.map((row) => ({
        originalRow: row,
        reason: "AI processing failed for this batch after retries",
      })),
    };
  }
}

/**
 * Processes ALL rows from a CSV import: chunks them, runs a limited number of
 * chunks concurrently (BATCH_CONCURRENCY), and merges results. This is the main
 * entry point Phase 4's controller will call.
 */
export async function processRows(rows: Record<string, string>[]): Promise<ImportResult> {
  const chunks = chunkArray(rows, env.BATCH_SIZE);
  const limit = pLimit(env.BATCH_CONCURRENCY);

  logger.info(
    { totalRows: rows.length, chunkCount: chunks.length, batchSize: env.BATCH_SIZE, concurrency: env.BATCH_CONCURRENCY },
    "Starting batch processing"
  );

  const chunkResults = await Promise.all(
    chunks.map((chunk) => limit(() => processOneChunk(chunk)))
  );

  const imported: CrmRecord[] = [];
  const skipped: SkippedRow[] = [];

  for (const result of chunkResults) {
    imported.push(...result.imported);
    skipped.push(...result.skipped);
  }

  logger.info(
    { totalImported: imported.length, totalSkipped: skipped.length },
    "Batch processing complete"
  );

  return {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
  };
}