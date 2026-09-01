import { Suspense } from "react";
import { AccessAdminContent } from "@/components/admin/access-admin-content";
import { PageHeader } from "@/components/shared/page-blocks";
import { Skeleton } from "@/components/ui/skeleton";

function AccessAdminSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56 rounded-lg" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export default function AdminAccessPage() {
  return (
    <div>
      <PageHeader title="Roles & Access" />
      <Suspense fallback={<AccessAdminSkeleton />}>
        <AccessAdminContent />
      </Suspense>
    </div>
  );
}
