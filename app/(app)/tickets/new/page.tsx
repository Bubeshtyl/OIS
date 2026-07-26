import { NewTicketForm } from "@/components/tickets/new-ticket-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { getSession } from "@/lib/auth/session";
import { getActiveQuestionsOrdered } from "@/lib/questions/service";
import { getActiveTeams } from "@/lib/teams/service";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  const [session, teams, questions] = await Promise.all([
    getSession(),
    getActiveTeams(),
    getActiveQuestionsOrdered(),
  ]);

  return (
    <div className="max-w-lg space-y-4">
      <PageHeader title="New Ticket" />
      <NewTicketForm
        teams={teams}
        questions={questions}
        defaultRequesterName={session.isLoggedIn ? session.name : ""}
      />
    </div>
  );
}
