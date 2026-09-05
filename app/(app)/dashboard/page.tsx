import { Suspense } from "react";
import type { DashboardLocation } from "@/components/dashboard/dashboard-location-tabs";
import { DashboardPageContent } from "@/components/dashboard/dashboard-page-content";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { PageHeader } from "@/components/shared/page-blocks";
import { Skeleton } from "@/components/ui/skeleton";
import { parseStockDisplayUnit } from "@/lib/format";
import {
  defaultRangeEnd,
  defaultRangeStart,
  isValidDateString,
  normalizeDateRange,
} from "@/lib/date-range";
import { getIstTodayString } from "@/lib/timezone";

function parseDashboardLocation(value?: string): DashboardLocation {
  if (value === "depot" || value === "manager") return value;
  return "all";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    location?: string;
    unit?: string;
  }>;
}) {
  const params = await searchParams;
  const today = getIstTodayString();
  const defaultStart = defaultRangeStart(today);
  const defaultEnd = defaultRangeEnd(today);
  const { start, end } = normalizeDateRange(
    isValidDateString(params.start) ? params.start : defaultStart,
    isValidDateString(params.end) ? params.end : defaultEnd
  );
  const location = parseDashboardLocation(params.location);
  const unit = parseStockDisplayUnit(params.unit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <PageHeader
            title="Dashboard"
            subtitle="Overview of oil inventory and movement"
          />
        </div>
        <PageToolbar
          startDate={start}
          endDate={end}
          defaultStart={defaultStart}
          defaultEnd={defaultEnd}
          extraParams={location !== "all" ? { location } : undefined}
        />
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardPageContent
          start={start}
          end={end}
          location={location}
          unit={unit}
        />
      </Suspense>
    </div>
  );
}
