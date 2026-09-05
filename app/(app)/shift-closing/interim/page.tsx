import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-blocks";
import { InterimShiftClosingContent } from "@/components/shift-closing/interim-shift-closing-content";
import { Skeleton } from "@/components/ui/skeleton";

/** Sized to approximate the calculator so Suspense swap does not spike CLS. */
function InterimContentSkeleton() {
  return (
    <div className="min-h-[42rem] space-y-6">
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function InterimShiftClosingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Interim Shift Closing" />
      <Suspense fallback={<InterimContentSkeleton />}>
        <InterimShiftClosingContent />
      </Suspense>
    </div>
  );
}
