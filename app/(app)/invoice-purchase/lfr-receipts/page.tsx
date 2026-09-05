import Link from "next/link";
import { Suspense } from "react";
import { LfrReceiptsContent } from "@/components/lfr/lfr-receipts-content";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { PageHeader } from "@/components/shared/page-blocks";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  defaultRangeEnd,
  defaultRangeStart,
  isValidDateString,
  normalizeDateRange,
} from "@/lib/date-range";
import { getIstTodayString } from "@/lib/timezone";
import { cn } from "@/lib/utils";

function LfrTableSkeleton() {
  return <Skeleton className="h-80 w-full rounded-xl" />;
}

export default async function LfrReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const today = getIstTodayString();
  const defaultStart = defaultRangeStart(today);
  const defaultEnd = defaultRangeEnd(today);
  const { start, end } = normalizeDateRange(
    isValidDateString(params.start) ? params.start : defaultStart,
    isValidDateString(params.end) ? params.end : defaultEnd
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="LFR Receipts" />
        <div className="flex flex-wrap items-center gap-2">
          <PageToolbar
            startDate={start}
            endDate={end}
            defaultStart={defaultStart}
            defaultEnd={defaultEnd}
          />
          <Link
            href="/invoice-purchase/lfr-receipts/new"
            className={cn(buttonVariants({ variant: "default" }), "shrink-0")}
          >
            + Add invoice
          </Link>
        </div>
      </div>

      <Suspense fallback={<LfrTableSkeleton />}>
        <LfrReceiptsContent start={start} end={end} />
      </Suspense>
    </div>
  );
}
