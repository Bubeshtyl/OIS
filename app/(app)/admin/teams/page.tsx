import { TeamsAdmin } from "@/components/admin/teams-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { getTeamConfiguration } from "@/lib/actions/teams";


export default async function AdminTeamsPage() {
  const { teams, systemUsers, roleOptions } = await getTeamConfiguration();

  return (
    <div>
      <PageHeader
        title="Teams"
        subtitle="Configure ticket teams, Telegram groups, and manager logins in one place."
      />
      <TeamsAdmin
        teams={teams}
        systemUsers={systemUsers}
        roleOptions={roleOptions}
      />
    </div>
  );
}
