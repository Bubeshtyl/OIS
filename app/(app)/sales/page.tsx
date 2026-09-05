import { Suspense } from "react";
import { TransactionPageContent } from "@/components/transactions/transaction-page-content";
import { Skeleton } from "@/components/ui/skeleton";

function SalesListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

export default function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    recordedBy?: string;
    page?: string;
  }>;
}) {
  return (
    <Suspense fallback={<SalesListSkeleton />}>
      <TransactionPageContent
        pageKind="consumption"
        permission="sales:write"
        searchParams={searchParams}
      />
    </Suspense>
  );
}
