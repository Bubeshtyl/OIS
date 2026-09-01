import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-blocks";
import { InterimShiftClosingContent } from "@/components/shift-closing/interim-shift-closing-content";
import { Skeleton } from "@/components/ui/skeleton";

function InterimContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
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
