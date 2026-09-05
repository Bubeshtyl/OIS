import { NewTicketForm } from "@/components/tickets/new-ticket-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { requireTenantSession } from "@/lib/auth/permissions";
import { getActiveQuestionsOrdered } from "@/lib/questions/service";
import { getActiveTeams } from "@/lib/teams/service";


export default async function NewTicketPage() {
  const session = await requireTenantSession();
  const [teams, questions] = await Promise.all([
    getActiveTeams(session.tenantId),
    getActiveQuestionsOrdered(session.tenantId),
  ]);

  return (
    <div className="max-w-lg space-y-4">
      <PageHeader title="New Ticket" />
      <NewTicketForm
        teams={teams}
        questions={questions}
        defaultRequesterName={session.name}
      />
    </div>
  );
}
