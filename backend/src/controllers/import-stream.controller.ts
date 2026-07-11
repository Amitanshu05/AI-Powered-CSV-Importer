import { Request, Response } from "express";
import { ImportRequestSchema } from "../schemas/crm-record.schema";
import { processRowsStreaming } from "../services/batch.service";
import { logger } from "../config/logger";

// POST /api/import/stream — contract.md §2.5.
// Once headers are written as text/event-stream, a normal JSON error response
// can no longer be sent. So: request-shape errors (before streaming starts) are
// still plain JSON, exactly like import.controller.ts; anything that goes wrong
// AFTER streaming starts is sent as an `error` SSE event instead of an HTTP
// error status, since the status code is already committed.
export async function importStreamController(req: Request, res: Response) {
  if (Array.isArray(req.body?.rows) && req.body.rows.length === 0) {
    return res.status(400).json({
      success: false,
      error: { message: "The rows array cannot be empty", code: "EMPTY_ROWS" },
    });
  }

  const parseResult = ImportRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    const issueSummary = parseResult.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return res.status(400).json({
      success: false,
      error: { message: `Invalid request payload (${issueSummary})`, code: "INVALID_PAYLOAD" },
    });
  }

  const { rows } = parseResult.data;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    // Prevents any reverse-proxy (e.g. on Render) from buffering the whole
    // stream until completion, which would defeat the purpose of streaming.
    "X-Accel-Buffering": "no",
  });

  const writeEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    logger.info({ rowCount: rows.length }, "Streaming import request received");

    const result = await processRowsStreaming(rows, (progress) => {
      writeEvent("progress", progress);
    });

    logger.info(
      { totalImported: result.totalImported, totalSkipped: result.totalSkipped },
      "Streaming import request completed"
    );

    writeEvent("done", {
      imported: result.imported,
      skipped: result.skipped,
      totalImported: result.totalImported,
      totalSkipped: result.totalSkipped,
    });
  } catch (err) {
    logger.error({ err }, "Unexpected error in importStreamController");
    writeEvent("error", { message: "AI provider error", code: "AI_PROVIDER_ERROR" });
  } finally {
    res.end();
  }
}