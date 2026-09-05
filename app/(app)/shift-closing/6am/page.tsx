import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-blocks";
import { SixAmClosingContent } from "@/components/shift-closing/six-am-closing-content";
import { Skeleton } from "@/components/ui/skeleton";

function SixAmContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

export default function SixAmShiftClosingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="6 AM" />
      <Suspense fallback={<SixAmContentSkeleton />}>
        <SixAmClosingContent />
      </Suspense>
    </div>
  );
}
