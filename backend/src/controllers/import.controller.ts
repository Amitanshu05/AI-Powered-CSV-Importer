import { Request, Response, NextFunction } from "express";
import { ImportRequestSchema } from "../schemas/crm-record.schema";
import { processRows } from "../services/batch.service";
import { AppError } from "../config/app-error";
import { logger } from "../config/logger";

// POST /api/import
// Contract: docs/contract.md §2. This controller's only job is HTTP concerns
// (parse request, validate shape, shape response) — all actual business logic
// (batching, AI calls, retries, skip rules) lives in batch.service.ts. Keeping
// this thin is deliberate: controllers should be easy to skim and verify against
// contract.md at a glance, not where real logic hides.
export async function importController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Specific EMPTY_ROWS check before the general schema validation, so an
    // empty array gets a more useful error code than the generic INVALID_PAYLOAD
    // Zod would otherwise produce for it — per contract.md's error codes table,
    // these are two distinct, meaningful cases for a client to handle differently.
    if (Array.isArray(req.body?.rows) && req.body.rows.length === 0) {
      throw new AppError("The rows array cannot be empty", 400, "EMPTY_ROWS");
    }

    const parseResult = ImportRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      const issueSummary = parseResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new AppError(
        `Invalid request payload (${issueSummary})`,
        400,
        "INVALID_PAYLOAD"
      );
    }

    const { rows } = parseResult.data;

    logger.info({ rowCount: rows.length }, "Import request received");

    // This is stateless end-to-end (architecture.md §3): no session, no DB write.
    // processRows already handles batch-level and row-level fault isolation
    // internally (architecture.md §5) — a partial AI failure does NOT throw here,
    // it comes back as entries in `skipped` with reasons. This function should
    // only throw for genuinely unexpected errors (e.g. a programming bug), not
    // for normal AI/data quality issues.
    const result = await processRows(rows);

    logger.info(
      { totalImported: result.totalImported, totalSkipped: result.totalSkipped },
      "Import request completed"
    );

    // Response shape matches contract.md §2 exactly.
    res.status(200).json({
      success: true,
      data: {
        imported: result.imported,
        skipped: result.skipped,
        totalImported: result.totalImported,
        totalSkipped: result.totalSkipped,
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }
    // Genuinely unexpected failure (not a normal per-row/per-batch AI issue,
    // those are already handled inside processRows) — e.g. a bug, or the AI
    // provider being totally unreachable in a way that escaped its own retries.
    logger.error({ err }, "Unexpected error in importController");
    return next(new AppError("AI provider error", 502, "AI_PROVIDER_ERROR"));
  }
}