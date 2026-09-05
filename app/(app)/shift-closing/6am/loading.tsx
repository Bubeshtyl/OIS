import { Skeleton } from "@/components/ui/skeleton";

export default function SixAmLoading() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">6 AM</h1>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}
