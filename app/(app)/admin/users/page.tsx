import { UsersAdmin } from "@/components/admin/users-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { getAllUsers } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getAllUsers();

  return (
    <div>
      <PageHeader title="Users" />
      <UsersAdmin users={users} />
    </div>
  );
}
