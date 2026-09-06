import {
  getDailyRsp,
  getMachineSlipEntries,
} from "@/lib/shift-closing/service";
import { getIstTodayString, isAtOrAfterIstHour } from "@/lib/timezone";

export const UPCOMING_PREREQ_HOUR_IST = 10;

export type UpcomingPrerequisiteKind = "rsp" | "six-am";

export type UpcomingPrerequisites = {
  dateStr: string;
  /** True when local IST time is at/after the gate hour. */
  requiresCheck: boolean;
  hasRsp: boolean;
  hasSixAmClosing: boolean;
  missing: UpcomingPrerequisiteKind[];
  ok: boolean;
};

export async function getUpcomingPrerequisites(
  tenantId: string,
  options?: { dateStr?: string; now?: Date }
): Promise<UpcomingPrerequisites> {
  const dateStr = options?.dateStr ?? getIstTodayString();
  const now = options?.now ?? new Date();
  const requiresCheck = isAtOrAfterIstHour(UPCOMING_PREREQ_HOUR_IST, now);

  if (!requiresCheck) {
    return {
      dateStr,
      requiresCheck: false,
      hasRsp: true,
      hasSixAmClosing: true,
      missing: [],
      ok: true,
    };
  }

  const [rsp, slips] = await Promise.all([
    getDailyRsp(tenantId, dateStr),
    getMachineSlipEntries(tenantId, dateStr),
  ]);

  const hasRsp = Boolean(rsp?.hsdPrice && rsp?.msPrice && rsp?.speedPrice);
  const hasSixAmClosing = slips.length > 0;
  const missing: UpcomingPrerequisiteKind[] = [];
  if (!hasRsp) missing.push("rsp");
  if (!hasSixAmClosing) missing.push("six-am");

  return {
    dateStr,
    requiresCheck: true,
    hasRsp,
    hasSixAmClosing,
    missing,
    ok: missing.length === 0,
  };
}

export function upcomingPrerequisitesErrorMessage(
  prerequisites: UpcomingPrerequisites
): string {
  const parts: string[] = [];
  if (!prerequisites.hasRsp) parts.push("today's RSP");
  if (!prerequisites.hasSixAmClosing) parts.push("today's 6AM closing");
  if (parts.length === 0) {
    return "Complete 6AM closing and RSP before recording Upcoming.";
  }
  return `After 10:00 AM IST, record ${parts.join(" and ")} before filling Upcoming.`;
}
