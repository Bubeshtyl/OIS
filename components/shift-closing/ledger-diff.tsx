"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function flattenValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((item, index) => `${index + 1}. ${flattenValue(item)}`)
      .join("\n");
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function flattenObject(
  obj: Record<string, unknown> | null | undefined,
  prefix = ""
): Array<{ field: string; value: string }> {
  if (!obj) return [];
  const rows: Array<{ field: string; value: string }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      key !== "nozzleReadings" &&
      key !== "paymentBreakdown" &&
      key !== "cashDenominations"
    ) {
      rows.push(
        ...flattenObject(value as Record<string, unknown>, field)
      );
      continue;
    }
    rows.push({ field, value: flattenValue(value) });
  }

  return rows;
}

function buildRows(
  current: Record<string, unknown> | null | undefined,
  proposed: Record<string, unknown> | null | undefined
) {
  const currentRows = flattenObject(current);
  const proposedRows = flattenObject(proposed);
  const fields = new Set([
    ...currentRows.map((r) => r.field),
    ...proposedRows.map((r) => r.field),
  ]);

  return Array.from(fields).map((field) => {
    const before =
      currentRows.find((r) => r.field === field)?.value ?? "—";
    const after =
      proposedRows.find((r) => r.field === field)?.value ?? "—";
    return { field, before, after, changed: before !== after };
  });
}

export function LedgerDiff({
  current,
  proposed,
}: {
  current: Record<string, unknown> | null | undefined;
  proposed: Record<string, unknown> | null | undefined;
}) {
  const rows = buildRows(current, proposed);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No comparable fields.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Field</TableHead>
          <TableHead>Current</TableHead>
          <TableHead>Proposed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.field} className={row.changed ? "bg-amber-50/60 dark:bg-amber-950/20" : undefined}>
            <TableCell className="font-medium text-xs">{row.field}</TableCell>
            <TableCell className="whitespace-pre-wrap text-xs tabular-nums">
              {row.before}
            </TableCell>
            <TableCell className="whitespace-pre-wrap text-xs tabular-nums">
              {row.after}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
