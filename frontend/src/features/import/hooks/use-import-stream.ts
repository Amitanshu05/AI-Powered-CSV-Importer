// src/features/import/hooks/use-import-stream.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { importRowsStream, type ImportProgressEvent } from "../api/import-rows-stream";
import type { RawCsvRow } from "@/types/crm-record";

export function useImportStream() {
  const [progress, setProgress] = useState<ImportProgressEvent | null>(null);

  const mutation = useMutation({
    mutationFn: (rows: RawCsvRow[]) =>
      importRowsStream(rows, (event) => setProgress(event)),
    onMutate: () => setProgress(null),
  });

  const reset = useCallback(() => {
    setProgress(null);
    mutation.reset();
  }, [mutation]);

  return { ...mutation, reset, progress };
}