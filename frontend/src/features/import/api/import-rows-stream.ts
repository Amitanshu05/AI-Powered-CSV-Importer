// src/features/import/api/import-rows-stream.ts
import { env } from "@/config/env";
import { ImportRequestError } from "./import-rows";
import type {
  ImportRequestBody,
  ImportSuccessResponse,
  RawCsvRow,
} from "@/types/crm-record";

export interface ImportProgressEvent {
  batchesCompleted: number;
  totalBatches: number;
  rowsProcessed: number;
  totalRows: number;
}

// The native EventSource API only supports GET with no body, but contract.md's
// streaming endpoint needs a POST body (the parsed rows) — so this manually
// reads and parses the text/event-stream response via fetch's ReadableStream.
export async function importRowsStream(
  rows: RawCsvRow[],
  onProgress: (event: ImportProgressEvent) => void
): Promise<ImportSuccessResponse["data"]> {
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}/api/import/stream`, {
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

  if (!response.ok || !response.body) {
    throw new ImportRequestError(
      "The server did not return a streamable response.",
      "INVALID_RESPONSE"
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? ""; // keep the last, possibly-incomplete frame

    for (const frame of frames) {
      const parsed = parseSseFrame(frame);
      if (!parsed.event || !parsed.data) continue;

      if (parsed.event === "progress") {
        onProgress(JSON.parse(parsed.data) as ImportProgressEvent);
      } else if (parsed.event === "done") {
        return JSON.parse(parsed.data) as ImportSuccessResponse["data"];
      } else if (parsed.event === "error") {
        const err = JSON.parse(parsed.data) as { message: string; code: string };
        throw new ImportRequestError(err.message, err.code);
      }
    }
  }

  throw new ImportRequestError(
    "The import stream ended without a result.",
    "INVALID_RESPONSE"
  );
}

function parseSseFrame(frame: string): { event: string | null; data: string | null } {
  let event: string | null = null;
  let data: string | null = null;
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data = line.slice(5).trim();
  }
  return { event, data };
}