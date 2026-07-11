// src/features/results/components/results-view.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResultsSummary } from "./results-summary";
import { ImportedTable } from "./imported-table";
import { SkippedTable } from "./skipped-table";
import { cardSurface } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { ImportSuccessResponse } from "@/types/crm-record";

interface ResultsViewProps {
  data: ImportSuccessResponse["data"];
  onStartOver: () => void;
}

export function ResultsView({ data, onStartOver }: ResultsViewProps) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  return (
    <div className="space-y-6">
      <ResultsSummary
        totalImported={data.totalImported}
        totalSkipped={data.totalSkipped}
      />

      <div className="flex items-center justify-between gap-4">
        {/* Tabs */}
        <div
          className={cn(
            cardSurface,
            "inline-flex items-center gap-1 p-1 shadow-sm"
          )}
        >
          <button
            onClick={() => setTab("imported")}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
              tab === "imported"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Imported ({data.totalImported})
          </button>

          <button
            onClick={() => setTab("skipped")}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
              tab === "skipped"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Skipped ({data.totalSkipped})
          </button>
        </div>

        {/* Action */}
        <Button
          variant="outline"
          size="sm"
          onClick={onStartOver}
          className="shadow-sm hover:shadow-md transition-all duration-200"
        >
          Import another file
        </Button>
      </div>

      {/* Content */}
      {tab === "imported" ? (
        data.imported.length > 0 ? (
          <ImportedTable records={data.imported} />
        ) : (
          <p
            className={cn(
              cardSurface,
              "px-6 py-10 text-center text-sm text-muted-foreground"
            )}
          >
            No rows were imported.
          </p>
        )
      ) : data.skipped.length > 0 ? (
        <SkippedTable skipped={data.skipped} />
      ) : (
        <p
          className={cn(
            cardSurface,
            "px-6 py-10 text-center text-sm text-muted-foreground"
          )}
        >
          No rows were skipped — everything imported cleanly.
        </p>
      )}
    </div>
  );
}