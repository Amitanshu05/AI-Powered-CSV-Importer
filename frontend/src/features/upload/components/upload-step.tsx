// src/features/upload/components/upload-step.tsx
"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Dropzone } from "./dropzone";
import { parseCsvFile } from "../utils/parse-csv";
import { cardSurface, cardPadding } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { RawCsvRow } from "@/types/crm-record";

interface UploadStepProps {
  onParsed: (rows: RawCsvRow[], fields: string[], fileName: string) => void;
}

export function UploadStep({ onParsed }: UploadStepProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setParseError(null);
    setIsParsing(true);
    try {
      const { rows, fields } = await parseCsvFile(file);
      if (rows.length === 0) {
        setParseError("This CSV file has no data rows.");
        return;
      }
      onParsed(rows, fields, file.name);
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Could not read this CSV file."
      );
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className={cn(cardSurface, cardPadding, "space-y-5")}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Upload a CSV</h2>
        <p className="text-sm text-muted-foreground">
          Parsed in your browser first — nothing is sent to AI until you confirm.
        </p>
      </div>

      <Dropzone onFileSelected={handleFileSelected} disabled={isParsing} />

      {isParsing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading file…
        </div>
      )}

      {parseError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}
    </div>
  );
}