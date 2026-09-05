import { Suspense } from "react";
import { AddStaffButton } from "@/components/staff/staff-admin";
import { StaffAdminContent } from "@/components/staff/staff-admin-content";
import { PageHeader } from "@/components/shared/page-blocks";
import { Skeleton } from "@/components/ui/skeleton";

function StaffAdminSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56 rounded-lg" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Staff Management" action={<AddStaffButton />} />
      <Suspense fallback={<StaffAdminSkeleton />}>
        <StaffAdminContent />
      </Suspense>
    </div>
  );
}
