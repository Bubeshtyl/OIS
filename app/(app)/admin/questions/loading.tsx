import { Skeleton } from "@/components/ui/skeleton";

export default function QuestionsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="min-h-[28rem] space-y-2">
        <div className="mb-4 flex justify-end">
          <Skeleton className="h-11 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
