"use server";

import { z } from "zod";
import { revalidateTicketPages } from "@/lib/actions/revalidate";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import { getActiveQuestionsOrdered } from "@/lib/questions/service";
import { getActiveTeams } from "@/lib/teams/service";
import {
  createTicket,
  formatTicketNumber,
  updateTicketStatus,
} from "@/lib/tickets/service";
import { notifyTeam } from "@/lib/telegram/notify";
import type { ActionState } from "@/lib/actions/inventory";
import type { TicketAnswer } from "@/lib/db/schema";

export async function createTicketAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "tickets:manage"))) {
    return { success: false, error: "You do not have permission." };
  }

  const teamIdParsed = z.string().uuid().safeParse(formData.get("teamId"));
  const requesterNameParsed = z
    .string()
    .trim()
    .min(1)
    .max(200)
    .safeParse(formData.get("requesterName"));

  if (!teamIdParsed.success || !requesterNameParsed.success) {
    return { success: false, error: "Please check all required fields." };
  }

  const activeTeams = await getActiveTeams(session.tenantId);
  const team = activeTeams.find((t) => t.id === teamIdParsed.data);
  if (!team) {
    return { success: false, error: "Please choose a valid team." };
  }

  const questions = await getActiveQuestionsOrdered(session.tenantId);
  const answers: TicketAnswer[] = [];

  for (const question of questions) {
    const raw = formData.get(`q_${question.id}`);
    const value = typeof raw === "string" ? raw.trim() : "";

    if (!value) {
      return { success: false, error: `Please answer: ${question.prompt}` };
    }

    if (question.answerType === "CHOICE") {
      if (!question.choices?.includes(value)) {
        return {
          success: false,
          error: `Please choose a valid option for: ${question.prompt}`,
        };
      }
    } else if (value.length > 1000) {
      return {
        success: false,
        error: `${question.prompt} must be 1000 characters or fewer.`,
      };
    }

    answers.push({
      questionId: question.id,
      prompt: question.prompt,
      answerType: question.answerType,
      answer: value,
    });
  }

  const ticket = await createTicket({
    tenantId: session.tenantId,
    teamId: team.id,
    answers,
    requesterName: requesterNameParsed.data,
    createdByUserId: session.userId,
  });

  revalidateTicketPages();

  const ticketNumber = await formatTicketNumber(session.tenantId, ticket.ticketSeq);
  await notifyTeam(team, ticket);

  return { success: true, message: `Ticket ${ticketNumber} created.` };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  resolutionNote: z.string().optional(),
});

export async function updateTicketStatusAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "tickets:manage"))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = statusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    resolutionNote: formData.get("resolutionNote") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Please check all required fields." };
  }

  await updateTicketStatus(
    session.tenantId,
    parsed.data.id,
    parsed.data.status,
    parsed.data.resolutionNote
  );
  revalidateTicketPages();
  return { success: true, message: "Ticket updated." };
}
