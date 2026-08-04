import Link from "next/link";
import { TicketsList } from "@/components/tickets/tickets-list";
import { PageHeader } from "@/components/shared/page-blocks";
import { Button } from "@/components/ui/button";
import { getTicketSettings } from "@/lib/actions/settings";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import { getActiveTeams } from "@/lib/teams/service";
import { listTickets } from "@/lib/tickets/service";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const session = await requireTenantSession();
  const [tickets, teams, settings] = await Promise.all([
    listTickets(session.tenantId),
    getActiveTeams(session.tenantId),
    getTicketSettings(session.tenantId),
  ]);

  const canCreate = await hasPermission(session, "tickets:manage");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tickets"
        action={
          canCreate ? (
            <Button render={<Link href="/tickets/new" />} nativeButton={false}>
              + New Ticket
            </Button>
          ) : undefined
        }
      />
      <TicketsList tickets={tickets} teams={teams} settings={settings} />
    </div>
  );
}
