import { PageHeader } from "@/components/shared/page-blocks";
import { Skeleton } from "@/components/ui/skeleton";

export default function StaffLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Staff Management" />
      <Skeleton className="h-10 w-56 rounded-lg" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
