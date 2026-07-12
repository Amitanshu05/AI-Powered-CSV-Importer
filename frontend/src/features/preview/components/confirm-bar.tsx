"use client";

import { AlertTriangle, FileSpreadsheet, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isLargeCsv,
  LARGE_CSV_THRESHOLD,
} from "@/features/upload/utils/parse-csv";
import { cardSurface } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface ConfirmBarProps {
  fileName: string;
  rowCount: number;
  onConfirm: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export function ConfirmBar({ fileName, rowCount, onConfirm, onReset, disabled }: ConfirmBarProps) {
  const large = isLargeCsv(rowCount);

  return (
    <div className="space-y-3">
      <div className={cn(cardSurface, "flex flex-wrap items-center justify-between gap-3 px-6 py-5")}>
        <div className="flex items-center gap-2 text-sm">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{fileName}</span>
          <span className="text-muted-foreground">
            · {rowCount} row{rowCount === 1 ? "" : "s"} found
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onReset} disabled={disabled} className="cursor-pointer transition-colors duration-200">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Start over
          </Button>
          <Button
            onClick={onConfirm}
            disabled={disabled}
            className="cursor-pointer px-6 py-5 font-medium shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-110"
          >
            Confirm Import
          </Button>
        </div>
      </div>

      {large && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-3 text-sm text-amber-800 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This file has {rowCount} rows ({LARGE_CSV_THRESHOLD}+ triggers this notice). Large files
            take longer since rows are sent to AI in batches — you can still proceed.
          </span>
        </div>
      )}
    </div>
  );
}