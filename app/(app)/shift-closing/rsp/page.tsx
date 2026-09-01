import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-blocks";
import { RspLedgerContent } from "@/components/shift-closing/rsp-ledger-content";
import { Skeleton } from "@/components/ui/skeleton";

function RspLedgerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48 rounded-lg" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

export default function RspLedgerPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="RSP Ledger" />
      <Suspense fallback={<RspLedgerSkeleton />}>
        <RspLedgerContent />
      </Suspense>
    </div>
  );
}
