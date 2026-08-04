import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-blocks";
import { TicketStatusForm } from "@/components/tickets/ticket-status-form";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import { getTicketSettings } from "@/lib/actions/settings";
import { getTicketById } from "@/lib/tickets/service";
import { formatTicketNumberWithSettings } from "@/lib/tickets/format";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireTenantSession();
  const [ticket, settings] = await Promise.all([
    getTicketById(session.tenantId, id),
    getTicketSettings(session.tenantId),
  ]);

  if (!ticket) {
    notFound();
  }

  const ticketNumber = formatTicketNumberWithSettings(
    ticket.ticketSeq,
    settings.prefix,
    settings.paddingWidth
  );
  const canManage = await hasPermission(session, "tickets:manage");

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={ticketNumber}
        subtitle={`${ticket.team.name} · ${formatDateTime(ticket.createdAt)}`}
      />

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          From: {ticket.requesterName}
          {ticket.requesterUsername ? ` (@${ticket.requesterUsername})` : ""}
        </p>
        {ticket.answers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No additional details.</p>
        ) : (
          <dl className="space-y-3">
            {ticket.answers.map((entry, index) => (
              <div key={index}>
                <dt className="text-sm font-medium">{entry.prompt}</dt>
                <dd className="text-sm text-muted-foreground">{entry.answer}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {canManage ? (
        <TicketStatusForm
          key={`${ticket.status}-${ticket.resolutionNote ?? ""}`}
          ticket={ticket}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Status: {ticket.status}</p>
      )}
    </div>
  );
}
