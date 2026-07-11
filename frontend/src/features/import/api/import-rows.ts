// src/features/import/api/import-rows.ts
import { env } from "@/config/env";
import type {
  ImportRequestBody,
  ImportResponse,
  ImportSuccessResponse,
  RawCsvRow,
} from "@/types/crm-record";

// Distinguishes contract-level errors (INVALID_PAYLOAD, AI_PROVIDER_ERROR,
// EMPTY_ROWS from contract.md §5) from transport-level failures (network down,
// server returned non-JSON). Both surface as this one error type so the UI
// only has to handle one shape.
export class ImportRequestError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "ImportRequestError";
    this.code = code;
  }
}

export async function importRows(
  rows: RawCsvRow[]
): Promise<ImportSuccessResponse["data"]> {
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows } satisfies ImportRequestBody),
    });
  } catch {
    throw new ImportRequestError(
      "Could not reach the import server. Check your connection and try again.",
      "NETWORK_ERROR"
    );
  }

  let body: ImportResponse;
  try {
    body = await response.json();
  } catch {
    throw new ImportRequestError(
      "The server returned an unexpected response.",
      "INVALID_RESPONSE"
    );
  }

  if (!body.success) {
    // contract.md §2: partial/row-level failures never reach here — those
    // come back as success:true with entries in `skipped`. This branch is
    // only for request-level failures (bad payload, empty rows, AI provider down).
    throw new ImportRequestError(body.error.message, body.error.code);
  }

  return body.data;
}