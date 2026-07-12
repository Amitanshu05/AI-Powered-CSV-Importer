"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ResultsSummaryProps {
  totalImported: number;
  totalSkipped: number;
}

export function ResultsSummary({ totalImported, totalSkipped }: ResultsSummaryProps) {
  const total = totalImported + totalSkipped;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Total Rows</p>
          <p className="text-2xl font-semibold">{total}</p>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border border-emerald-200 bg-emerald-50/60 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Imported</p>
            <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{totalImported}</p>
          </div>
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </CardContent>
      </Card>
      <Card className="rounded-2xl border border-red-200 bg-red-50/60 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-red-700 dark:text-red-400">Skipped</p>
            <p className="text-2xl font-semibold text-red-700 dark:text-red-400">{totalSkipped}</p>
          </div>
          <XCircle className="h-6 w-6 text-red-500" />
        </CardContent>
      </Card>
    </div>
  );
}