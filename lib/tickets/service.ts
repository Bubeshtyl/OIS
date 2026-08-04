import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  ticketSettings,
  tickets,
  type Ticket,
  type TicketAnswer,
  type TicketStatus,
} from "@/lib/db/schema";
import { formatTicketNumberWithSettings } from "@/lib/tickets/format";

export async function formatTicketNumber(
  tenantId: string,
  seq: number
): Promise<string> {
  const db = getDb();
  const [settings] = await db
    .select()
    .from(ticketSettings)
    .where(eq(ticketSettings.tenantId, tenantId))
    .limit(1);

  return formatTicketNumberWithSettings(
    seq,
    settings?.prefix ?? "JCK",
    settings?.paddingWidth ?? 6
  );
}

export async function createTicket(input: {
  tenantId: string;
  teamId: string;
  answers: TicketAnswer[];
  requesterName: string;
  requesterTelegramUserId?: string | null;
  requesterTelegramChatId?: string | null;
  requesterUsername?: string | null;
  createdByUserId?: string | null;
}): Promise<Ticket> {
  const db = getDb();
  const [ticket] = await db
    .insert(tickets)
    .values({
      tenantId: input.tenantId,
      teamId: input.teamId,
      answers: input.answers,
      requesterName: input.requesterName,
      requesterTelegramUserId: input.requesterTelegramUserId ?? null,
      requesterTelegramChatId: input.requesterTelegramChatId ?? null,
      requesterUsername: input.requesterUsername ?? null,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning();
  return ticket;
}

export async function markTicketNotified(
  tenantId: string,
  ticketId: string
): Promise<void> {
  const db = getDb();
  await db
    .update(tickets)
    .set({ notifiedAt: new Date() })
    .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)));
}

export async function listTickets(
  tenantId: string,
  filters?: {
    teamId?: string;
    status?: TicketStatus;
  }
) {
  const db = getDb();
  return db.query.tickets.findMany({
    where: (ticket, { eq: eqOp, and: andOp }) => {
      const conditions = [eqOp(ticket.tenantId, tenantId)];
      if (filters?.teamId) conditions.push(eqOp(ticket.teamId, filters.teamId));
      if (filters?.status) conditions.push(eqOp(ticket.status, filters.status));
      return andOp(...conditions);
    },
    with: { team: true },
    orderBy: (ticket, { desc }) => [desc(ticket.createdAt)],
  });
}

export async function getRecentTicketsForRequester(
  tenantId: string,
  requesterTelegramChatId: string,
  limit = 10
) {
  const db = getDb();
  return db.query.tickets.findMany({
    where: (ticket, { eq: eqOp, and: andOp }) =>
      andOp(
        eqOp(ticket.tenantId, tenantId),
        eqOp(ticket.requesterTelegramChatId, requesterTelegramChatId)
      ),
    with: { team: true },
    orderBy: (ticket, { desc }) => [desc(ticket.createdAt)],
    limit,
  });
}

export async function getTicketById(tenantId: string, id: string) {
  const db = getDb();
  return db.query.tickets.findFirst({
    where: (ticket, { eq: eqOp, and: andOp }) =>
      andOp(eqOp(ticket.id, id), eqOp(ticket.tenantId, tenantId)),
    with: { team: true },
  });
}

export async function updateTicketStatus(
  tenantId: string,
  id: string,
  status: TicketStatus,
  resolutionNote?: string
): Promise<void> {
  const db = getDb();
  await db
    .update(tickets)
    .set({
      status,
      resolutionNote: resolutionNote ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)));
}
