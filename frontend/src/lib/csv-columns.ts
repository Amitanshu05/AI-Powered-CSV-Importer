// src/lib/csv-columns.ts
// CSV headers from real-world files are not guaranteed to be clean: they can
// be blank (trailing empty column) or duplicated (same header twice). Both
// break TanStack Table, which requires every column to have a non-empty,
// unique id. This function only affects the DISPLAY id/label — it never
// renames or drops actual row data; accessorFn always reads the exact
// original field name.
export interface SafeColumn {
  field: string; // original CSV header, used to read the real data
  label: string; // safe display label
  id: string; // guaranteed non-empty, guaranteed unique
}

export function buildSafeColumns(fields: string[]): SafeColumn[] {
  const seenLabels = new Map<string, number>();
  return fields.map((field, index) => {
    const trimmed = field.trim();
    const label = trimmed === "" ? `Column ${index + 1}` : trimmed;
    const count = seenLabels.get(label) ?? 0;
    seenLabels.set(label, count + 1);
    const id = count === 0 ? `col_${index}` : `col_${index}_${count}`;
    return { field, label, id };
  });
}