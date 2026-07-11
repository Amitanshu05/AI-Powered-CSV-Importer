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

export interface StreamProgress {
  batchesCompleted: number;
  totalBatches: number;
  rowsProcessed: number;
  totalRows: number;
}

export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export function applyCreatedAtFallback(rawRecord: Record<string, unknown>): Record<string, unknown> {
  if (rawRecord.created_at === null || rawRecord.created_at === undefined || rawRecord.created_at === "") {
    return { ...rawRecord, created_at: new Date().toISOString() };
  }
  return rawRecord;
}

export function normalizePhoneDigitsOnly(rawRecord: Record<string, unknown>): Record<string, unknown> {
  const phone = rawRecord.mobile_without_country_code;
  if (typeof phone === "string" && phone.length > 0) {
    return { ...rawRecord, mobile_without_country_code: phone.replace(/\D/g, "") };
  }
  return rawRecord;
}

function normalizeAiRecord(rawRecord: unknown): unknown {
  if (typeof rawRecord !== "object" || rawRecord === null || Array.isArray(rawRecord)) {
    return rawRecord;
  }
  let normalized = rawRecord as Record<string, unknown>;
  normalized = applyCreatedAtFallback(normalized);
  normalized = normalizePhoneDigitsOnly(normalized);
  return normalized;
}

export function escapeNewlinesInNote(record: CrmRecord): CrmRecord {
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
    const normalizedRecord = normalizeAiRecord(rawResults[i]);
    const result = CrmRecordSchema.safeParse(normalizedRecord);

    if (!result.success) {
      const issueSummary = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      skipped.push({ originalRow, reason: `AI output failed validation (${issueSummary})` });
      continue;
    }

    const record = result.data;

    if (record.email === null && record.mobile_without_country_code === null) {
      skipped.push({ originalRow, reason: "No email or mobile number found" });
      continue;
    }

    imported.push(escapeNewlinesInNote(record));
  }

  return { imported, skipped };
}

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

async function processAllChunks(
  rows: Record<string, string>[],
  onChunkComplete?: (progress: StreamProgress) => void
): Promise<ImportResult> {
  const chunks = chunkArray(rows, env.BATCH_SIZE);
  const limit = pLimit(env.BATCH_CONCURRENCY);
  const totalBatches = chunks.length;
  const totalRows = rows.length;

  logger.info(
    { totalRows, chunkCount: totalBatches, batchSize: env.BATCH_SIZE, concurrency: env.BATCH_CONCURRENCY },
    "Starting batch processing"
  );

  const imported: CrmRecord[] = [];
  const skipped: SkippedRow[] = [];
  let batchesCompleted = 0;
  let rowsProcessed = 0;

  await Promise.all(
    chunks.map((chunk) =>
      limit(async () => {
        const result = await processOneChunk(chunk);
        imported.push(...result.imported);
        skipped.push(...result.skipped);
        batchesCompleted += 1;
        rowsProcessed += chunk.length;
        onChunkComplete?.({ batchesCompleted, totalBatches, rowsProcessed, totalRows });
      })
    )
  );

  logger.info({ totalImported: imported.length, totalSkipped: skipped.length }, "Batch processing complete");

  return { imported, skipped, totalImported: imported.length, totalSkipped: skipped.length };
}

export async function processRows(rows: Record<string, string>[]): Promise<ImportResult> {
  return processAllChunks(rows);
}

export async function processRowsStreaming(
  rows: Record<string, string>[],
  onProgress: (progress: StreamProgress) => void
): Promise<ImportResult> {
  return processAllChunks(rows, onProgress);
}