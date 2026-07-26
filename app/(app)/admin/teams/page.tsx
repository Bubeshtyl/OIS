import { TeamsAdmin } from "@/components/admin/teams-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { getTeamConfiguration } from "@/lib/actions/teams";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const { teams, systemUsers } = await getTeamConfiguration();

  return (
    <div>
      <PageHeader
        title="Teams"
        subtitle="Configure ticket teams, Telegram groups, and manager logins in one place."
      />
      <TeamsAdmin teams={teams} systemUsers={systemUsers} />
    </div>
  );
}
