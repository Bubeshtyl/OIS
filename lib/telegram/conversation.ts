import {
  answerCallbackQuery,
  editMessageReplyMarkup,
  sendMessage,
} from "@/lib/telegram/client";
import {
  buildChoiceKeyboard,
  buildConfirmKeyboard,
  buildTeamKeyboard,
  parseCallbackData,
} from "@/lib/telegram/keyboards";
import {
  deleteSession,
  getSession,
  isSessionStale,
  upsertSession,
} from "@/lib/telegram/session";
import { notifyTeam } from "@/lib/telegram/notify";
import type {
  TelegramCallbackQuery,
  TelegramMessage,
  TelegramUpdate,
} from "@/lib/telegram/types";
import { getActiveQuestionsOrdered, resolveNextQuestion } from "@/lib/questions/service";
import { getActiveTeams, getTeamById } from "@/lib/teams/service";
import {
  createTicket,
  formatTicketNumber,
  getRecentTicketsForRequester,
} from "@/lib/tickets/service";
import { formatTicketNumberWithSettings } from "@/lib/tickets/format";
import { getTicketSettings } from "@/lib/actions/settings";
import type {
  TelegramSession,
  TicketAnswer,
  TicketQuestionQueueItem,
  TicketStatus,
} from "@/lib/db/schema";

const MAX_TEXT_LENGTH = 1000;
const MAX_CODE_ATTEMPTS = 5;
const MY_TICKETS_LIMIT = 10;

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function requesterName(from: { first_name: string; last_name?: string }) {
  return [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
}

async function promptTeamSelection(chatId: string) {
  const activeTeams = await getActiveTeams();
  if (activeTeams.length === 0) {
    await sendMessage(
      chatId,
      "No teams are configured yet. Please contact the administrator."
    );
    await deleteSession(chatId);
    return;
  }

  await upsertSession(chatId, {
    step: "AWAITING_TEAM",
    teamId: null,
    questionQueue: [],
    answers: [],
  });

  await sendMessage(
    chatId,
    "Which team should handle your request?",
    buildTeamKeyboard(activeTeams)
  );
}

async function startFlow(chatId: string, message: TelegramMessage) {
  await deleteSession(chatId);

  const from = message.from;
  await upsertSession(chatId, {
    step: "AWAITING_TEAM",
    teamId: null,
    questionQueue: [],
    answers: [],
    codeAttempts: 0,
    telegramUserId: from ? String(from.id) : "",
    telegramUsername: from?.username ?? null,
    telegramFirstName: from?.first_name ?? null,
    telegramLastName: from?.last_name ?? null,
  });

  const settings = await getTicketSettings();
  const accessCode = settings.accessCode?.trim();

  if (accessCode) {
    await upsertSession(chatId, { step: "AWAITING_ACCESS_CODE" });
    await sendMessage(chatId, "Please enter the access code to continue.");
    return;
  }

  await promptTeamSelection(chatId);
}

async function cancelFlow(chatId: string) {
  await deleteSession(chatId);
  await sendMessage(chatId, "Cancelled.");
}

async function listMyTickets(chatId: string) {
  const [tickets, settings] = await Promise.all([
    getRecentTicketsForRequester(chatId, MY_TICKETS_LIMIT),
    getTicketSettings(),
  ]);

  if (tickets.length === 0) {
    await sendMessage(
      chatId,
      "You haven't created any tickets yet. Send /start to create one."
    );
    return;
  }

  const lines = tickets.map((ticket) => {
    const number = formatTicketNumberWithSettings(
      ticket.ticketSeq,
      settings.prefix,
      settings.paddingWidth
    );
    return `${number} — ${ticket.team.name} — ${STATUS_LABELS[ticket.status]}`;
  });

  await sendMessage(
    chatId,
    `Your last ${tickets.length} ticket(s):\n${lines.join("\n")}`
  );
}

async function askCurrentQuestion(chatId: string, session: TelegramSession) {
  const current = session.questionQueue[0];
  if (!current) return;

  if (current.answerType === "CHOICE" && current.choices) {
    await sendMessage(chatId, current.prompt, buildChoiceKeyboard(current.choices, 0));
  } else {
    await sendMessage(chatId, current.prompt);
  }
}

async function sendConfirmationSummary(
  chatId: string,
  session: TelegramSession,
  teamName: string
) {
  const lines = [
    `Team: ${teamName}`,
    ...session.answers.map((entry) => `${entry.prompt}: ${entry.answer}`),
  ];
  await sendMessage(
    chatId,
    `Here's what you're submitting:\n${lines.join("\n")}`,
    buildConfirmKeyboard()
  );
}

async function advanceAfterAnswer(
  chatId: string,
  session: TelegramSession,
  answer: TicketAnswer,
  teamName: string
) {
  const updatedAnswers = [...session.answers, answer];
  const { question, rest } = resolveNextQuestion(
    session.questionQueue.slice(1),
    updatedAnswers
  );

  if (!question) {
    const updated = await upsertSession(chatId, {
      step: "AWAITING_CONFIRMATION",
      questionQueue: [],
      answers: updatedAnswers,
    });
    await sendConfirmationSummary(chatId, updated, teamName);
    return;
  }

  const updated = await upsertSession(chatId, {
    questionQueue: [question, ...rest],
    answers: updatedAnswers,
  });
  await askCurrentQuestion(chatId, updated);
}

async function handleMessage(message: TelegramMessage) {
  const chatId = String(message.chat.id);
  const text = message.text?.trim() ?? "";

  if (text === "/start") {
    await startFlow(chatId, message);
    return;
  }

  if (text === "/cancel") {
    await cancelFlow(chatId);
    return;
  }

  if (text === "/mytickets") {
    await listMyTickets(chatId);
    return;
  }

  let session = await getSession(chatId);

  if (session && isSessionStale(session)) {
    await deleteSession(chatId);
    session = null;
  }

  if (!session) {
    await sendMessage(chatId, "Send /start to open a new ticket.");
    return;
  }

  if (session.step === "AWAITING_ACCESS_CODE") {
    const settings = await getTicketSettings();
    const accessCode = settings.accessCode?.trim();

    if (!accessCode || text === accessCode) {
      await promptTeamSelection(chatId);
      return;
    }

    const attempts = session.codeAttempts + 1;
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await deleteSession(chatId);
      await sendMessage(chatId, "Too many incorrect attempts. Send /start to try again.");
      return;
    }

    await upsertSession(chatId, { codeAttempts: attempts });
    await sendMessage(chatId, "Incorrect code. Please try again.");
    return;
  }

  if (session.step !== "AWAITING_ANSWER") {
    await sendMessage(chatId, "Please tap one of the buttons above.");
    return;
  }

  const current = session.questionQueue[0];
  if (!current || current.answerType !== "TEXT") {
    await sendMessage(chatId, "Please tap one of the buttons above.");
    return;
  }

  if (!text || text.length > MAX_TEXT_LENGTH) {
    await sendMessage(
      chatId,
      `Please send a reply between 1 and ${MAX_TEXT_LENGTH} characters.`
    );
    return;
  }

  const team = session.teamId ? await getTeamById(session.teamId) : null;
  if (!team) {
    await sendMessage(chatId, "Something went wrong. Please /start again.");
    await deleteSession(chatId);
    return;
  }

  await advanceAfterAnswer(
    chatId,
    session,
    { questionId: current.id, prompt: current.prompt, answerType: "TEXT", answer: text },
    team.name
  );
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  await answerCallbackQuery(callbackQuery.id);

  const chat = callbackQuery.message?.chat;
  if (!chat || !callbackQuery.data) return;
  const chatId = String(chat.id);

  let session = await getSession(chatId);
  if (session && isSessionStale(session)) {
    await deleteSession(chatId);
    session = null;
  }

  if (!session) {
    await sendMessage(chatId, "No pending ticket found — send /start to create a new one.");
    return;
  }

  const parsed = parseCallbackData(callbackQuery.data);
  if (!parsed) return;

  if (parsed.type === "noop") return;

  if (parsed.type === "nav") {
    const messageId = callbackQuery.message?.message_id;
    if (!messageId) return;

    if (parsed.list === "team" && session.step === "AWAITING_TEAM") {
      const activeTeams = await getActiveTeams();
      await editMessageReplyMarkup(chatId, messageId, buildTeamKeyboard(activeTeams, parsed.page));
      return;
    }

    if (parsed.list === "choice" && session.step === "AWAITING_ANSWER") {
      const current = session.questionQueue[0];
      if (current?.answerType === "CHOICE" && current.choices) {
        await editMessageReplyMarkup(
          chatId,
          messageId,
          buildChoiceKeyboard(current.choices, parsed.page)
        );
      }
      return;
    }

    return;
  }

  if (session.step === "AWAITING_ACCESS_CODE") {
    await sendMessage(chatId, "Please type the access code to continue.");
    return;
  }

  if (session.step === "AWAITING_TEAM") {
    if (parsed.type !== "team") {
      await sendMessage(chatId, "Please tap one of the team buttons above.");
      return;
    }

    const team = await getTeamById(parsed.teamId);
    if (!team || !team.isActive) {
      await sendMessage(chatId, "That team is no longer available. Please /start again.");
      await deleteSession(chatId);
      return;
    }

    const questions = await getActiveQuestionsOrdered();
    const rawQueue: TicketQuestionQueueItem[] = questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      answerType: q.answerType,
      choices: q.choices ?? null,
      dependsOnQuestionId: q.dependsOnQuestionId ?? null,
      choicesByParent: q.choicesByParent ?? null,
    }));
    const { question, rest } = resolveNextQuestion(rawQueue, []);

    if (!question) {
      const updated = await upsertSession(chatId, {
        step: "AWAITING_CONFIRMATION",
        teamId: team.id,
        questionQueue: [],
        answers: [],
      });
      await sendConfirmationSummary(chatId, updated, team.name);
      return;
    }

    const updated = await upsertSession(chatId, {
      step: "AWAITING_ANSWER",
      teamId: team.id,
      questionQueue: [question, ...rest],
      answers: [],
    });
    await askCurrentQuestion(chatId, updated);
    return;
  }

  if (session.step === "AWAITING_ANSWER") {
    const current = session.questionQueue[0];
    if (
      parsed.type !== "answer" ||
      !current ||
      current.answerType !== "CHOICE" ||
      !current.choices ||
      parsed.choiceIndex < 0 ||
      parsed.choiceIndex >= current.choices.length
    ) {
      await sendMessage(chatId, "Please tap one of the buttons above.");
      return;
    }

    const team = session.teamId ? await getTeamById(session.teamId) : null;
    if (!team) {
      await sendMessage(chatId, "Something went wrong. Please /start again.");
      await deleteSession(chatId);
      return;
    }

    await advanceAfterAnswer(
      chatId,
      session,
      {
        questionId: current.id,
        prompt: current.prompt,
        answerType: "CHOICE",
        answer: current.choices[parsed.choiceIndex],
      },
      team.name
    );
    return;
  }

  if (session.step === "AWAITING_CONFIRMATION") {
    if (parsed.type !== "confirm") {
      await sendMessage(chatId, "Please tap Confirm or Cancel above.");
      return;
    }

    if (parsed.value === "no") {
      await deleteSession(chatId);
      await sendMessage(chatId, "Cancelled. Send /start to open a new ticket.");
      return;
    }

    if (!session.teamId) {
      await sendMessage(chatId, "Something went wrong. Please /start again.");
      await deleteSession(chatId);
      return;
    }

    const team = await getTeamById(session.teamId);
    if (!team) {
      await sendMessage(chatId, "Something went wrong. Please /start again.");
      await deleteSession(chatId);
      return;
    }

    const from = {
      first_name: session.telegramFirstName ?? "",
      last_name: session.telegramLastName ?? undefined,
    };

    const ticket = await createTicket({
      teamId: session.teamId,
      answers: session.answers,
      requesterTelegramUserId: session.telegramUserId,
      requesterTelegramChatId: chatId,
      requesterName: requesterName(from) || session.telegramUsername || "Telegram user",
      requesterUsername: session.telegramUsername,
    });

    await deleteSession(chatId);

    const ticketNumber = await formatTicketNumber(ticket.ticketSeq);
    await sendMessage(
      chatId,
      `Ticket ${ticketNumber} created. The ${team.name} team has been notified.`
    );

    await notifyTeam(team, ticket);
    return;
  }
}

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.message) {
    await handleMessage(update.message);
    return;
  }

  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }
}
