// src/features/upload/utils/parse-csv.ts
import Papa from "papaparse";
import type { RawCsvRow } from "@/types/crm-record";

export interface ParseCsvResult {
  rows: RawCsvRow[];
  fields: string[];
}

// checklist.md Phase 5 mentions testing up to 1000+ rows for virtualization;
// we warn a bit above that so normal large files aren't nagged, but genuinely
// huge ones get a heads-up before hitting BATCH_SIZE=20 batching on the backend.
const LARGE_CSV_ROW_WARNING_THRESHOLD = 5000;

export function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
}

export function isLargeCsv(rowCount: number): boolean {
  return rowCount >= LARGE_CSV_ROW_WARNING_THRESHOLD;
}

export const LARGE_CSV_THRESHOLD = LARGE_CSV_ROW_WARNING_THRESHOLD;

export function parseCsvFile(file: File): Promise<ParseCsvResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields ?? [];
        resolve({ rows: results.data, fields });
      },
      error: (error) => {
        reject(new Error(error.message || "Failed to parse CSV file."));
      },
    });
  });
}