// src/app/page.tsx
"use client";

import { useState } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadStep } from "@/features/upload/components/upload-step";
import { PreviewTable } from "@/features/preview/components/preview-table";
import { ConfirmBar } from "@/features/preview/components/confirm-bar";
import { ImportProgress } from "@/features/import/components/import-progress";
import { useImportMutation } from "@/features/import/hooks/use-import-mutation";
import { ImportRequestError } from "@/features/import/api/import-rows";
import { ResultsView } from "@/features/results/components/results-view";
import type { RawCsvRow } from "@/types/crm-record";

interface ParsedFile {
  rows: RawCsvRow[];
  fields: string[];
  fileName: string;
}

export default function Home() {
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const importMutation = useImportMutation();

  const handleParsed = (rows: RawCsvRow[], fields: string[], fileName: string) => {
    importMutation.reset();
    setParsed({ rows, fields, fileName });
  };

  const handleReset = () => {
    importMutation.reset();
    setParsed(null);
  };

  const handleConfirm = () => {
    if (!parsed) return;
    importMutation.mutate(parsed.rows);
  };

  const errorMessage = (() => {
    if (!importMutation.isError) return null;
    const err = importMutation.error;
    return err instanceof ImportRequestError
      ? err.message
      : "Something went wrong while importing. Please try again.";
  })();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 sm:px-8 sm:py-16">
      <div className="mb-10 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          GrowEasy CSV Importer
        </h1>
        <p className="text-base text-muted-foreground">
          Upload a CSV, review it, and import structured leads into your CRM.
        </p>
      </div>

      {!parsed && !importMutation.isSuccess && (
        <UploadStep onParsed={handleParsed} />
      )}

      {parsed && !importMutation.isSuccess && (
        <div className="space-y-6">
          <ConfirmBar
            fileName={parsed.fileName}
            rowCount={parsed.rows.length}
            onConfirm={handleConfirm}
            onReset={handleReset}
            disabled={importMutation.isPending}
          />

          {errorMessage && (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive shadow-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleConfirm} className="shrink-0">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          )}

          {importMutation.isPending ? (
            <ImportProgress rowCount={parsed.rows.length} />
          ) : (
            <PreviewTable rows={parsed.rows} fields={parsed.fields} />
          )}
        </div>
      )}

      {importMutation.isSuccess && importMutation.data && (
        <ResultsView data={importMutation.data} onStartOver={handleReset} />
      )}
    </main>
  );
}