"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cardSurface } from "@/lib/ui";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  maxHeight?: string;
}

const ROW_HEIGHT = 49;

export function DataTable<TData>({
  columns,
  data,
  maxHeight = "420px",
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <div ref={parentRef} className={cn(cardSurface, "overflow-auto")} style={{ maxHeight }}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="whitespace-nowrap py-3.5 font-semibold text-foreground">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                No rows.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {paddingTop > 0 && <tr style={{ height: `${paddingTop}px` }} aria-hidden="true" />}
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <TableRow key={row.id} className="transition-colors duration-200 hover:bg-muted/40">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
              {paddingBottom > 0 && <tr style={{ height: `${paddingBottom}px` }} aria-hidden="true" />}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}