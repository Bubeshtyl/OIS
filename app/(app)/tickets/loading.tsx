import { PageHeader } from "@/components/shared/page-blocks";
import { Skeleton } from "@/components/ui/skeleton";

export default function TicketsLoading() {
  return (
    <div className="space-y-4">
      <PageHeader title="Tickets" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
