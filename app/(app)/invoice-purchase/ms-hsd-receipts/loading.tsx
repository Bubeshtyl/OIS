import { PageHeader } from "@/components/shared/page-blocks";
import { Skeleton } from "@/components/ui/skeleton";

export default function MsHsdReceiptsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="MS / HSD Receipts" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
