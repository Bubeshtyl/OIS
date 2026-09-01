import { StaffAdmin, AddStaffButton } from "@/components/staff/staff-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { getStaffMembers } from "@/lib/actions/staff";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "staff:read"))) {
    redirect("/");
  }

  const staff = await getStaffMembers();

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Management" action={<AddStaffButton />} />
      <StaffAdmin staff={staff} />
    </div>
  );
}
