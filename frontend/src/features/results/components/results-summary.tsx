// src/features/results/components/results-summary.tsx
"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ResultsSummaryProps {
  totalImported: number;
  totalSkipped: number;
}

export function ResultsSummary({ totalImported, totalSkipped }: ResultsSummaryProps) {
  const total = totalImported + totalSkipped;
  const cardClass = "rounded-2xl border border-border/60 shadow-sm";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className={cardClass}>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Total Rows</p>
          <p className="text-2xl font-semibold">{total}</p>
        </CardContent>
      </Card>
      <Card className={cardClass}>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">Imported</p>
            <p className="text-2xl font-semibold text-emerald-600">{totalImported}</p>
          </div>
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </CardContent>
      </Card>
      <Card className={cardClass}>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-muted-foreground">Skipped</p>
            <p className="text-2xl font-semibold text-destructive">{totalSkipped}</p>
          </div>
          <XCircle className="h-6 w-6 text-destructive" />
        </CardContent>
      </Card>
    </div>
  );
}