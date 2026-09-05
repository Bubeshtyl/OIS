import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-blocks";
import { ReceivePageContent } from "@/components/transactions/receive-page-content";
import { Skeleton } from "@/components/ui/skeleton";

function ReceiveListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

export default function ReceivePage({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    page?: string;
  }>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title="Stock Received" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/receive/bpcl"
          className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          <p className="font-medium">BPCL</p>
        </Link>
        <Link
          href="/receive/other"
          className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          <p className="font-medium">Other dealers</p>
        </Link>
      </div>
      <Suspense fallback={<ReceiveListSkeleton />}>
        <ReceivePageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
