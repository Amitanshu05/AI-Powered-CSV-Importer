// src/features/results/components/imported-table.tsx
"use client";

import { DataTable } from "@/components/data-table";
import { importedColumns } from "../columns";
import type { CrmRecord } from "@/types/crm-record";

export function ImportedTable({ records }: { records: CrmRecord[] }) {
  return <DataTable columns={importedColumns} data={records} maxHeight="480px" />;
}