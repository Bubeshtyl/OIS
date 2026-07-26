import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  ticketSettings,
  tickets,
  type Ticket,
  type TicketAnswer,
  type TicketStatus,
} from "@/lib/db/schema";
import { formatTicketNumberWithSettings } from "@/lib/tickets/format";

export async function formatTicketNumber(seq: number): Promise<string> {
  const db = getDb();
  const [settings] = await db
    .select()
    .from(ticketSettings)
    .where(eq(ticketSettings.id, 1))
    .limit(1);

  return formatTicketNumberWithSettings(
    seq,
    settings?.prefix ?? "JCK",
    settings?.paddingWidth ?? 6
  );
}

export async function createTicket(input: {
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

export async function markTicketNotified(ticketId: string): Promise<void> {
  const db = getDb();
  await db
    .update(tickets)
    .set({ notifiedAt: new Date() })
    .where(eq(tickets.id, ticketId));
}

export async function listTickets(filters?: {
  teamId?: string;
  status?: TicketStatus;
}) {
  const db = getDb();
  return db.query.tickets.findMany({
    where: (ticket, { eq: eqOp, and }) => {
      const conditions = [];
      if (filters?.teamId) conditions.push(eqOp(ticket.teamId, filters.teamId));
      if (filters?.status) conditions.push(eqOp(ticket.status, filters.status));
      return conditions.length ? and(...conditions) : undefined;
    },
    with: { team: true },
    orderBy: (ticket, { desc }) => [desc(ticket.createdAt)],
  });
}

export async function getRecentTicketsForRequester(
  requesterTelegramChatId: string,
  limit = 10
) {
  const db = getDb();
  return db.query.tickets.findMany({
    where: (ticket, { eq: eqOp }) =>
      eqOp(ticket.requesterTelegramChatId, requesterTelegramChatId),
    with: { team: true },
    orderBy: (ticket, { desc }) => [desc(ticket.createdAt)],
    limit,
  });
}

export async function getTicketById(id: string) {
  const db = getDb();
  return db.query.tickets.findFirst({
    where: (ticket, { eq: eqOp }) => eqOp(ticket.id, id),
    with: { team: true },
  });
}

export async function updateTicketStatus(
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
    .where(eq(tickets.id, id));
}
