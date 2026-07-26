import Link from "next/link";
import { TicketsList } from "@/components/tickets/tickets-list";
import { PageHeader } from "@/components/shared/page-blocks";
import { Button } from "@/components/ui/button";
import { getTicketSettings } from "@/lib/actions/settings";
import { hasPermission } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import { getActiveTeams } from "@/lib/teams/service";
import { listTickets } from "@/lib/tickets/service";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const [session, tickets, teams, settings] = await Promise.all([
    getSession(),
    listTickets(),
    getActiveTeams(),
    getTicketSettings(),
  ]);

  const canCreate =
    session.isLoggedIn &&
    (await hasPermission(session.role, "tickets:manage"));

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
