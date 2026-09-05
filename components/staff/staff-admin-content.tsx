import { StaffAdmin } from "@/components/staff/staff-admin";
import { requireTenantSession } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import { getStaffMembers } from "@/lib/actions/staff";

export async function StaffAdminContent() {
  const session = await requireTenantSession();
  await requirePermission(session, "staff:read");
  const staff = await getStaffMembers();

  return <StaffAdmin staff={staff} />;
}
