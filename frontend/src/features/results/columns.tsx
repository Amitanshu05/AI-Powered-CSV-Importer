// src/features/results/columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { buildSafeColumns } from "@/lib/csv-columns";
import type { CrmRecord, RawCsvRow, SkippedRow } from "@/types/crm-record";

function EmptyCell() {
  return <span className="italic text-muted-foreground">—</span>;
}

const STATUS_COLOR: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  SALE_DONE:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  DID_NOT_CONNECT:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  BAD_LEAD:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
};

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export const importedColumns: ColumnDef<CrmRecord>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ getValue }) => getValue<string | null>() ?? <EmptyCell />,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ getValue }) => getValue<string | null>() ?? <EmptyCell />,
  },
  {
    id: "mobile",
    header: "Mobile",
    cell: ({ row }) => {
      const { country_code, mobile_without_country_code } = row.original;
      if (!mobile_without_country_code) return <EmptyCell />;
      return country_code
        ? `+${country_code} ${mobile_without_country_code}`
        : mobile_without_country_code;
    },
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ getValue }) => getValue<string | null>() ?? <EmptyCell />,
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ getValue }) => getValue<string | null>() ?? <EmptyCell />,
  },
  {
    accessorKey: "state",
    header: "State",
    cell: ({ getValue }) => getValue<string | null>() ?? <EmptyCell />,
  },
  {
    accessorKey: "country",
    header: "Country",
    cell: ({ getValue }) => getValue<string | null>() ?? <EmptyCell />,
  },
  {
    accessorKey: "lead_owner",
    header: "Lead Owner",
    cell: ({ getValue }) => getValue<string | null>() ?? <EmptyCell />,
  },
  {
    accessorKey: "crm_status",
    header: "Status",
    cell: ({ getValue }) => {
      const value = getValue<string | null>();
      if (!value) return <EmptyCell />;
      return (
        <Badge variant="outline" className={STATUS_COLOR[value] ?? ""}>
          {humanize(value)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "data_source",
    header: "Data Source",
    cell: ({ getValue }) => {
      const value = getValue<string | null>();
      return value ? <Badge variant="outline">{value}</Badge> : <EmptyCell />;
    },
  },
  {
    accessorKey: "possession_time",
    header: "Possession",
    cell: ({ getValue }) => getValue<string | null>() ?? <EmptyCell />,
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ getValue }) => {
      const value = getValue<string | null>();
      if (!value) return <EmptyCell />;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
    },
  },
  {
    accessorKey: "crm_note",
    header: "Note",
    cell: ({ getValue }) => {
      const value = getValue<string | null>();
      if (!value) return <EmptyCell />;
      return (
        <span className="block max-w-[220px] truncate" title={value}>
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ getValue }) => {
      const value = getValue<string | null>();
      if (!value) return <EmptyCell />;
      return (
        <span className="block max-w-[220px] truncate" title={value}>
          {value}
        </span>
      );
    },
  },
];

// Skipped rows keep whatever raw CSV headers the file had — dynamic, like
// preview/columns.tsx — plus a fixed "Reason Skipped" column up front.
export function buildSkippedColumns(fields: string[]): ColumnDef<SkippedRow>[] {
  const reasonColumn: ColumnDef<SkippedRow> = {
    id: "reason",
    header: "Reason Skipped",
    cell: ({ row }) => (
      <Badge variant="destructive" className="whitespace-nowrap">
        {row.original.reason}
      </Badge>
    ),
  };

  const originalRowColumns: ColumnDef<SkippedRow>[] = buildSafeColumns(fields).map(
    ({ field, label, id }) => ({
      id,
      header: label,
      accessorFn: (row: SkippedRow) => (row.originalRow as RawCsvRow)[field],
      cell: ({ getValue }) => {
        const value = getValue<string>();
        return value && value.trim() !== "" ? value : <EmptyCell />;
      },
    })
  );

  return [reasonColumn, ...originalRowColumns];
}