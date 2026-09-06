"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import {
  getDailyRsp,
  getMachineSlipEntries,
  saveDailyRsp,
  saveMachineSlipEntries,
  type MachineSlipItem,
} from "@/lib/shift-closing/service";

const LEDGER_PATHS = [
  "/shift-closing/rsp",
  "/shift-closing/ledger",
  "/shift-closing/6am",
  "/shift-closing/interim",
  "/shift-closing/upcoming",
] as const;

function revalidateShiftClosingPaths() {
  for (const path of LEDGER_PATHS) {
    revalidatePath(path);
  }
}

export type SixAmActionState = {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
};

const rspSchema = z.object({
  priceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  hsdPrice: z.string().min(1, "HSD price is required"),
  msPrice: z.string().min(1, "MS price is required"),
  speedPrice: z.string().min(1, "SPEED price is required"),
});

export async function saveDailyRspAction(input: {
  priceDate: string;
  hsdPrice: string;
  msPrice: string;
  speedPrice: string;
}): Promise<SixAmActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false, error: "Permission denied." };
    }

    const parsed = rspSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid RSP price data.",
      };
    }

    const saved = await saveDailyRsp(
      session.tenantId,
      session.userId,
      parsed.data
    );
    revalidateShiftClosingPaths();

    return {
      success: true,
      message: "Daily RSP prices saved successfully.",
      data: saved,
    };
  } catch (err: unknown) {
    console.error("saveDailyRspAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save RSP prices.",
    };
  }
}

export async function saveMachineSlipEntriesAction(input: {
  entryDate: string;
  entries: MachineSlipItem[];
}): Promise<SixAmActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false, error: "Permission denied." };
    }

    if (!input.entryDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)) {
      return { success: false, error: "Invalid entry date." };
    }

    if (!input.entries || input.entries.length === 0) {
      return { success: false, error: "Please provide at least one reading." };
    }

    const saved = await saveMachineSlipEntries(
      session.tenantId,
      session.userId,
      input
    );

    revalidateShiftClosingPaths();

    return {
      success: true,
      message: `Saved ${saved.length} machine slip readings successfully.`,
      data: saved,
    };
  } catch (err: unknown) {
    console.error("saveMachineSlipEntriesAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to save machine slip entries.",
    };
  }
}

export async function fetchSixAmDataForDateAction(dateStr: string) {
  try {
    const session = await requireTenantSession();
    const [rsp, slips] = await Promise.all([
      getDailyRsp(session.tenantId, dateStr),
      getMachineSlipEntries(session.tenantId, dateStr),
    ]);

    return { rsp, slips };
  } catch (err: unknown) {
    console.error("fetchSixAmDataForDateAction error:", err);
    return { rsp: null, slips: [] };
  }
}
