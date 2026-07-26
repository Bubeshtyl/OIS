"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DailySalesFilters } from "@/components/daily-sales/daily-sales-filters";
import { PageHeader } from "@/components/shared/page-blocks";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DailySalesFilters as DailySalesFiltersState } from "@/lib/daily-sales/filters";
import { formatInr } from "@/lib/format";
import type { DailySalesReportRow } from "@/lib/queries/daily-sales";
import { cn } from "@/lib/utils";

function filenameFromDisposition(header: string | null) {
  if (!header) return null;
  const match = header.match(/filename="([^"]+)"/);
  return match?.[1] ?? null;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Format wall-clock timestamps stored as UTC components (no TZ shift). */
function formatWallDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad2(date.getUTCDate())}-${pad2(date.getUTCMonth() + 1)}-${date.getUTCFullYear()} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
}

function formatQty(value: string | number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString("en-IN", {
    maximumFractionDigits: 3,
  });
}

export function DailySalesReportView({
  filters,
  products,
  mopTypes,
  rows,
  page,
  pageSize,
  total,
  totalPages,
}: {
  filters: DailySalesFiltersState;
  products: string[];
  mopTypes: string[];
  rows: DailySalesReportRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [exportReady, setExportReady] = useState(false);

  useEffect(() => {
    if (isPending) {
      setExportReady(false);
      return;
    }
    setExportReady(filters.applied && total > 0);
  }, [isPending, filters.applied, total]);

  function navigate(href: string) {
    setExportReady(false);
    startTransition(() => {
      router.push(href);
    });
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    const query = params.toString();
    navigate(query ? `${pathname}?${query}` : pathname);
  }

  async function exportExcel() {
    if (!exportReady || exporting || isPending || !filters.applied) return;
    setExporting(true);
    try {
      const response = await fetch(
        `/api/daily-sales/export?${searchParams.toString()}`
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        filenameFromDisposition(
          response.headers.get("Content-Disposition")
        ) ?? "daily-sales.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${total.toLocaleString("en-IN")} rows to Excel`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export Excel"
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Sales Report" />

      <DailySalesFilters
        key={searchParams.toString()}
        initialFilters={filters}
        products={products}
        mopTypes={mopTypes}
        isPending={isPending}
        canExport={exportReady && !isPending}
        exporting={exporting}
        onExport={exportExcel}
        onNavigate={navigate}
      />

      {isPending ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border bg-background px-6 py-12 text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium tracking-tight">Loading results…</p>
            <p className="text-sm text-muted-foreground">
              Fetching daily sales for your filters.
            </p>
          </div>
        </div>
      ) : !filters.applied ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/30 px-6 py-12 text-center">
          <div className="max-w-sm space-y-1">
            <p className="font-medium tracking-tight">No data loaded yet</p>
            <p className="text-sm text-muted-foreground">
              Set your filters above and click Apply to fetch daily sales rows.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="border-b-0 bg-sidebar hover:bg-sidebar data-[state=selected]:bg-sidebar">
                  <TableHead className="font-bold text-sidebar-foreground">
                    Receipt No
                  </TableHead>
                  <TableHead className="font-bold text-sidebar-foreground">
                    Start
                  </TableHead>
                  <TableHead className="font-bold text-sidebar-foreground">
                    End
                  </TableHead>
                  <TableHead className="font-bold text-sidebar-foreground">
                    Product
                  </TableHead>
                  <TableHead className="text-right font-bold text-sidebar-foreground">
                    Amount
                  </TableHead>
                  <TableHead className="text-right font-bold text-sidebar-foreground">
                    Volume (L)
                  </TableHead>
                  <TableHead className="text-right font-bold text-sidebar-foreground">
                    Rate/L
                  </TableHead>
                  <TableHead className="font-bold text-sidebar-foreground">
                    MOP
                  </TableHead>
                  <TableHead className="font-bold text-sidebar-foreground">
                    DSM
                  </TableHead>
                  <TableHead className="text-right font-bold text-sidebar-foreground">
                    Bay
                  </TableHead>
                  <TableHead className="text-right font-bold text-sidebar-foreground">
                    Nozzle
                  </TableHead>
                  <TableHead className="text-right font-bold text-sidebar-foreground">
                    Discount
                  </TableHead>
                  <TableHead className="text-right font-bold text-sidebar-foreground">
                    Net Amount
                  </TableHead>
                  <TableHead className="font-bold text-sidebar-foreground">
                    Vehicle
                  </TableHead>
                  <TableHead className="font-bold text-sidebar-foreground">
                    Segment
                  </TableHead>
                  <TableHead className="font-bold text-sidebar-foreground">
                    Mobile
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={16}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No rows match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow
                      key={row.receiptNo}
                      className={cn(
                        "border-border/60 hover:bg-sky-50/80 dark:hover:bg-sky-950/30",
                        index % 2 === 0
                          ? "bg-background"
                          : "bg-slate-50 dark:bg-slate-900/50"
                      )}
                    >
                      <TableCell className="font-medium whitespace-nowrap">
                        {row.receiptNo}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatWallDateTime(row.startDate)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatWallDateTime(row.endDate)}
                      </TableCell>
                      <TableCell>{row.product}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatInr(row.amount)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatQty(row.volumeLitre)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatInr(row.ratePerLtr)}
                      </TableCell>
                      <TableCell>{row.mopType}</TableCell>
                      <TableCell>{row.dsmName}</TableCell>
                      <TableCell className="text-right">
                        {row.bayNo ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.nozzleNo ?? "—"}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatInr(row.discountAmount)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatInr(row.netAmount)}
                      </TableCell>
                      <TableCell>{row.vehicleNo ?? "—"}</TableCell>
                      <TableCell>{row.vehicleSegment ?? "—"}</TableCell>
                      <TableCell>{row.mobileNo ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              {total === 0
                ? "0"
                : `${((page - 1) * pageSize + 1).toLocaleString("en-IN")}–${Math.min(page * pageSize, total).toLocaleString("en-IN")}`}{" "}
              of {total.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending || page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending || page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
