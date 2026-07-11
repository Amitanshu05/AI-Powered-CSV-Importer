// src/features/import/components/import-progress.tsx
"use client";

import { Loader2 } from "lucide-react";
import { cardSurface, cardPadding } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { ImportProgressEvent } from "../api/import-rows-stream";

interface ImportProgressProps {
  rowCount: number;
  progress: ImportProgressEvent | null;
}

export function ImportProgress({ rowCount, progress }: ImportProgressProps) {
  const percent = progress
    ? Math.round((progress.rowsProcessed / progress.totalRows) * 100)
    : 0;

  return (
    <div className={cn(cardSurface, cardPadding, "flex flex-col items-center justify-center gap-4 text-center")}>
      {progress ? (
        <>
          <div className="w-full max-w-sm">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Batch {progress.batchesCompleted} of {progress.totalBatches}
              </span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <p className="text-sm font-medium">
            Processed {progress.rowsProcessed} of {progress.totalRows} rows…
          </p>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium">Starting import of {rowCount} rows…</p>
        </>
      )}
    </div>
  );
}