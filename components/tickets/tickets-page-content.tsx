import Link from "next/link";
import { TicketsList } from "@/components/tickets/tickets-list";
import { Button } from "@/components/ui/button";
import { getTicketSettings } from "@/lib/actions/settings";
import { hasCachedPermission } from "@/lib/auth/session-access";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import { getActiveTeams } from "@/lib/teams/service";
import { listTickets } from "@/lib/tickets/service";

export async function TicketsPageContent() {
  const session = await requireTenantSession();
  const cachedCreate = hasCachedPermission(session, "tickets:manage");

  const [tickets, teams, settings, canCreate] = await Promise.all([
    listTickets(session.tenantId),
    getActiveTeams(session.tenantId),
    getTicketSettings(session.tenantId),
    cachedCreate === null
      ? hasPermission(session, "tickets:manage")
      : Promise.resolve(cachedCreate),
  ]);

  return (
    <>
      {canCreate ? (
        <div className="flex justify-end">
          <Button render={<Link href="/tickets/new" />} nativeButton={false}>
            + New Ticket
          </Button>
        </div>
      ) : null}
      <TicketsList tickets={tickets} teams={teams} settings={settings} />
    </>
  );
}
