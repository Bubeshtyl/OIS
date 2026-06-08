"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  REPORT_LABELS,
  REPORT_TYPES,
  type ReportType,
} from "@/lib/reports/config";
import { cn } from "@/lib/utils";

export function ReportTypeList({ activeReport }: { activeReport: ReportType }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectReport(report: ReportType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("report", report);
    router.push(`/reports?${params.toString()}`);
  }

  return (
    <nav className="space-y-1">
      {REPORT_TYPES.map((report) => {
        const active = report === activeReport;
        return (
          <button
            key={report}
            type="button"
            onClick={() => selectReport(report)}
            className={cn(
              "w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {REPORT_LABELS[report]}
          </button>
        );
      })}
    </nav>
  );
}
