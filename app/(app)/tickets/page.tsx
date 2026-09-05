import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-blocks";
import { TicketsPageContent } from "@/components/tickets/tickets-page-content";
import { Skeleton } from "@/components/ui/skeleton";

function TicketsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export default function TicketsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Tickets" />
      <Suspense fallback={<TicketsListSkeleton />}>
        <TicketsPageContent />
      </Suspense>
    </div>
  );
}
