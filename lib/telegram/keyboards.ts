import type { Team } from "@/lib/db/schema";
import type { InlineKeyboardButton, InlineKeyboardMarkup } from "@/lib/telegram/types";

const PAGE_SIZE = 8;

type NavList = "team" | "choice";

function buildNavRow(list: NavList, page: number, totalPages: number): InlineKeyboardButton[][] {
  if (totalPages <= 1) return [];

  const row: InlineKeyboardButton[] = [];
  if (page > 0) {
    row.push({ text: "◀ Prev", callback_data: `nav:${list}:${page - 1}` });
  }
  row.push({ text: `${page + 1}/${totalPages}`, callback_data: "noop" });
  if (page < totalPages - 1) {
    row.push({ text: "Next ▶", callback_data: `nav:${list}:${page + 1}` });
  }
  return [row];
}

export function buildTeamKeyboard(teams: Team[], page = 0): InlineKeyboardMarkup {
  const totalPages = Math.max(1, Math.ceil(teams.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const rows = teams
    .slice(start, start + PAGE_SIZE)
    .map((team) => [{ text: team.name, callback_data: `t:${team.id}` }]);

  return { inline_keyboard: [...rows, ...buildNavRow("team", page, totalPages)] };
}

export function buildChoiceKeyboard(choices: string[], page = 0): InlineKeyboardMarkup {
  const totalPages = Math.max(1, Math.ceil(choices.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const rows = choices
    .slice(start, start + PAGE_SIZE)
    .map((choice, i) => [{ text: choice, callback_data: `a:${start + i}` }]);

  return { inline_keyboard: [...rows, ...buildNavRow("choice", page, totalPages)] };
}

export function buildConfirmKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Confirm ✅", callback_data: "c:yes" },
        { text: "Cancel ✖", callback_data: "c:no" },
      ],
    ],
  };
}

export type ParsedCallbackData =
  | { type: "team"; teamId: string }
  | { type: "answer"; choiceIndex: number }
  | { type: "confirm"; value: "yes" | "no" }
  | { type: "nav"; list: NavList; page: number }
  | { type: "noop" };

export function parseCallbackData(data: string): ParsedCallbackData | null {
  if (data === "noop") {
    return { type: "noop" };
  }

  if (data.startsWith("t:")) {
    const teamId = data.slice(2);
    return teamId ? { type: "team", teamId } : null;
  }

  if (data.startsWith("a:")) {
    const choiceIndex = Number(data.slice(2));
    return Number.isInteger(choiceIndex) ? { type: "answer", choiceIndex } : null;
  }

  if (data.startsWith("c:")) {
    const value = data.slice(2);
    return value === "yes" || value === "no" ? { type: "confirm", value } : null;
  }

  if (data.startsWith("nav:")) {
    const [, list, pageStr] = data.split(":");
    const page = Number(pageStr);
    if ((list === "team" || list === "choice") && Number.isInteger(page) && page >= 0) {
      return { type: "nav", list, page };
    }
    return null;
  }

  return null;
}
