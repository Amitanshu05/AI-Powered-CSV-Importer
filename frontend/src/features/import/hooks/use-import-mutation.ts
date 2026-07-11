// src/features/import/hooks/use-import-mutation.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { importRows } from "../api/import-rows";
import type { RawCsvRow } from "@/types/crm-record";

export function useImportMutation() {
  return useMutation({
    mutationFn: (rows: RawCsvRow[]) => importRows(rows),
  });
}