// src/features/results/components/skipped-table.tsx
"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { buildSkippedColumns } from "../columns";
import type { SkippedRow } from "@/types/crm-record";

export function SkippedTable({ skipped }: { skipped: SkippedRow[] }) {
  const fields = useMemo(
    () => (skipped.length > 0 ? Object.keys(skipped[0].originalRow) : []),
    [skipped]
  );
  const columns = useMemo(() => buildSkippedColumns(fields), [fields]);

  return <DataTable columns={columns} data={skipped} maxHeight="480px" />;
}