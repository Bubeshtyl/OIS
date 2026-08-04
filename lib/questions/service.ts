import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { ticketQuestions } from "@/lib/db/schema";
import type { TicketAnswer, TicketQuestionQueueItem } from "@/lib/db/schema";

export async function getActiveQuestionsOrdered(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(ticketQuestions)
    .where(
      and(
        eq(ticketQuestions.tenantId, tenantId),
        eq(ticketQuestions.isActive, true)
      )
    )
    .orderBy(asc(ticketQuestions.order));
}

/**
 * Walks the queue from the front, skipping any conditional question whose
 * parent answer has no matching (or empty) branch in choicesByParent. Returns
 * the next question to ask — with its choices resolved to that branch — and
 * the still-unresolved remainder of the queue.
 */
export function resolveNextQuestion(
  queue: TicketQuestionQueueItem[],
  answers: TicketAnswer[]
): { question: TicketQuestionQueueItem | null; rest: TicketQuestionQueueItem[] } {
  let rest = queue;

  while (rest.length > 0) {
    const [head, ...tail] = rest;

    if (!head.dependsOnQuestionId) {
      return { question: head, rest: tail };
    }

    const parentAnswer = answers.find((a) => a.questionId === head.dependsOnQuestionId);
    const branchChoices = parentAnswer
      ? head.choicesByParent?.[parentAnswer.answer]
      : undefined;

    if (branchChoices && branchChoices.length > 0) {
      return { question: { ...head, choices: branchChoices }, rest: tail };
    }

    rest = tail;
  }

  return { question: null, rest: [] };
}
