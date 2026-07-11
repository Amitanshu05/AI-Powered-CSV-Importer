// src/features/preview/components/preview-table.tsx
"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { buildPreviewColumns } from "../columns";
import type { RawCsvRow } from "@/types/crm-record";

const PREVIEW_ROW_CAP = 100;

interface PreviewTableProps {
  rows: RawCsvRow[];
  fields: string[];
}

export function PreviewTable({ rows, fields }: PreviewTableProps) {
  const columns = useMemo(() => buildPreviewColumns(fields), [fields]);
  const visibleRows = useMemo(() => rows.slice(0, PREVIEW_ROW_CAP), [rows]);

  return (
    <div className="space-y-2">
      <DataTable columns={columns} data={visibleRows} />
      {rows.length > PREVIEW_ROW_CAP && (
        <p className="text-xs text-muted-foreground">
          Showing first {PREVIEW_ROW_CAP} of {rows.length} rows. All{" "}
          {rows.length} rows will be imported when you confirm.
        </p>
      )}
    </div>
  );
}