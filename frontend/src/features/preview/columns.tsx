// src/features/preview/columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import type { RawCsvRow } from "@/types/crm-record";
import { buildSafeColumns } from "@/lib/csv-columns";

export function buildPreviewColumns(fields: string[]): ColumnDef<RawCsvRow>[] {
  return buildSafeColumns(fields).map(({ field, label, id }) => ({
    id,
    header: label,
    // accessorFn (not accessorKey) so headers with dots, or blank/duplicate
    // headers, can never be misread as a nested path or collide.
    accessorFn: (row) => row[field],
    cell: ({ getValue }) => {
      const value = getValue<string>();
      return value && value.trim() !== "" ? (
        value
      ) : (
        <span className="italic text-muted-foreground">—</span>
      );
    },
  }));
}