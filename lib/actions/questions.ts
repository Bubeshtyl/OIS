"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidateQuestionPages } from "@/lib/actions/revalidate";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db";
import { ticketQuestions } from "@/lib/db/schema";
import type { ActionState } from "@/lib/actions/inventory";

function parseChoiceList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((choice) => choice.trim())
    .filter(Boolean);
}

const questionSchema = z
  .object({
    id: z.string().uuid().optional(),
    order: z.coerce.number().int().positive(),
    prompt: z.string().min(1),
    answerType: z.enum(["TEXT", "CHOICE"]),
    choices: z.string().optional(),
    dependsOnQuestionId: z.string().uuid().optional(),
    choicesByParent: z.string().optional(),
    isActive: z.coerce.boolean(),
  })
  .refine(
    (data) => {
      if (data.answerType !== "CHOICE" || data.dependsOnQuestionId) return true;
      return parseChoiceList(data.choices).length >= 2;
    },
    { message: "Choice questions need at least 2 comma-separated choices." }
  )
  .refine((data) => !data.dependsOnQuestionId || data.answerType === "CHOICE", {
    message: "Conditional questions must be Choice type.",
  })
  .refine((data) => !data.dependsOnQuestionId || data.dependsOnQuestionId !== data.id, {
    message: "A question cannot depend on itself.",
  });

export async function saveQuestionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();
  if (!(await hasPermission(session.role, "questions:manage"))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = questionSchema.safeParse({
    id: formData.get("id") || undefined,
    order: formData.get("order"),
    prompt: formData.get("prompt"),
    answerType: formData.get("answerType"),
    choices: formData.get("choices") || undefined,
    dependsOnQuestionId: formData.get("dependsOnQuestionId") || undefined,
    choicesByParent: formData.get("choicesByParent") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check all required fields.",
    };
  }

  const db = getDb();

  let dependsOnQuestionId: string | null = null;
  let choices: string[] | null = null;
  let choicesByParent: Record<string, string[]> | null = null;

  if (parsed.data.dependsOnQuestionId) {
    const [parent] = await db
      .select()
      .from(ticketQuestions)
      .where(eq(ticketQuestions.id, parsed.data.dependsOnQuestionId))
      .limit(1);

    if (!parent || parent.answerType !== "CHOICE") {
      return { success: false, error: "Parent question must be an existing Choice question." };
    }
    if (parent.order >= parsed.data.order) {
      return {
        success: false,
        error: "A conditional question must come after its parent question (higher order).",
      };
    }

    let rawMap: Record<string, string> = {};
    try {
      rawMap = parsed.data.choicesByParent ? JSON.parse(parsed.data.choicesByParent) : {};
    } catch {
      return { success: false, error: "Invalid sub-choice mapping." };
    }

    const map: Record<string, string[]> = {};
    for (const choice of parent.choices ?? []) {
      const list = parseChoiceList(rawMap[choice]);
      if (list.length > 0) map[choice] = list;
    }
    if (Object.keys(map).length === 0) {
      return {
        success: false,
        error: "Add at least one sub-choice list for a parent answer.",
      };
    }

    dependsOnQuestionId = parent.id;
    choicesByParent = map;
  } else if (parsed.data.answerType === "CHOICE") {
    choices = parseChoiceList(parsed.data.choices);
  }

  const values = {
    order: parsed.data.order,
    prompt: parsed.data.prompt,
    answerType: parsed.data.answerType,
    choices,
    dependsOnQuestionId,
    choicesByParent,
    isActive: parsed.data.isActive,
  };

  if (parsed.data.id) {
    await db
      .update(ticketQuestions)
      .set(values)
      .where(eq(ticketQuestions.id, parsed.data.id));
  } else {
    await db.insert(ticketQuestions).values(values);
  }

  revalidateQuestionPages();
  return { success: true, message: "Question saved." };
}

export async function getAllQuestions() {
  const session = await requireSession();
  if (!(await hasPermission(session.role, "questions:manage"))) {
    return [];
  }

  const db = getDb();
  return db
    .select()
    .from(ticketQuestions)
    .orderBy(ticketQuestions.order);
}
