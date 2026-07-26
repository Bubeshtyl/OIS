import { sendMessage } from "@/lib/telegram/client";
import { formatTicketNumber, markTicketNotified } from "@/lib/tickets/service";
import type { Team, Ticket } from "@/lib/db/schema";

export async function notifyTeam(team: Team, ticket: Ticket): Promise<void> {
  const ticketNumber = await formatTicketNumber(ticket.ticketSeq);
  const qa = ticket.answers
    .map((entry) => `${entry.prompt}: ${entry.answer}`)
    .join("\n");

  const text = [
    `🆕 New Ticket ${ticketNumber}`,
    qa || "(no additional details)",
    "",
    `From: ${ticket.requesterName}${
      ticket.requesterUsername ? ` (@${ticket.requesterUsername})` : ""
    }`,
  ].join("\n");

  const sent = await sendMessage(team.telegramChatId, text);
  if (sent) {
    await markTicketNotified(ticket.id);
  } else {
    console.error(`Failed to notify team ${team.id} for ticket ${ticket.id}`);
  }
}
