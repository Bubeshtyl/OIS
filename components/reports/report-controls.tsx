"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/layout/date-range-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ReportType } from "@/lib/reports/config";

function filenameFromDisposition(header: string | null) {
  if (!header) return null;
  const match = header.match(/filename="([^"]+)"/);
  return match?.[1] ?? null;
}

export function ReportControls({
  report,
  startDate,
  endDate,
  defaultStart,
  defaultEnd,
}: {
  report: ReportType;
  startDate: string;
  endDate: string;
  defaultStart: string;
  defaultEnd: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exporting, setExporting] = useState(false);

  function generateReport() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("report", report);
    params.set("start", startDate);
    params.set("end", endDate);
    router.push(`/reports?${params.toString()}`);
  }

  async function exportExcel() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("start", startDate);
      params.set("end", endDate);

      const response = await fetch(`/api/reports/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        filenameFromDisposition(
          response.headers.get("Content-Disposition")
        ) ?? `ois-reports-${startDate}-to-${endDate}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Reports exported to Excel");
    } catch {
      toast.error("Failed to export reports");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Date Range</Label>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          defaultStart={defaultStart}
          defaultEnd={defaultEnd}
          extraParams={{ report }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Button type="button" className="w-full" onClick={generateReport}>
          Generate Report
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={exportExcel}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            "Export Excel"
          )}
        </Button>
      </div>
    </div>
  );
}
