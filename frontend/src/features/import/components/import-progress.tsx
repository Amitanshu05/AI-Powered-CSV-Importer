// src/features/import/components/import-progress.tsx
"use client";

import { Loader2 } from "lucide-react";
import { isLargeCsv } from "@/features/upload/utils/parse-csv";
import { cardSurface, cardPadding } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface ImportProgressProps {
  rowCount: number;
}

export function ImportProgress({ rowCount }: ImportProgressProps) {
  const large = isLargeCsv(rowCount);

  return (
    <div className={cn(cardSurface, cardPadding, "flex flex-col items-center justify-center gap-3 text-center")}>
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Processing {rowCount} rows…</p>
        <p className="text-xs text-muted-foreground">
          {large
            ? "Rows are sent to AI in batches — larger files take longer since each batch is a separate AI call."
            : "Rows are sent to AI and validated — this usually takes a few seconds."}
        </p>
      </div>
    </div>
  );
}