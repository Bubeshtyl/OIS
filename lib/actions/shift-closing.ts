"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import {
  getDailyRsp,
  getMachineSlipEntries,
  getSixAmStatus,
  saveDailyRsp,
  saveMachineSlipEntries,
  saveInterimShiftClosing,
  type MachineSlipItem,
  type SaveInterimShiftClosingInput,
} from "@/lib/shift-closing/service";
import { getStaffById } from "@/lib/staff/service";

export type ShiftClosingActionState = {
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
}): Promise<ShiftClosingActionState> {
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

    const saved = await saveDailyRsp(session.tenantId, session.userId, parsed.data);
    revalidatePath("/shift-closing/6am");
    revalidatePath("/shift-closing/interim");

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
}): Promise<ShiftClosingActionState> {
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

    revalidatePath("/shift-closing/6am");
    revalidatePath("/shift-closing/interim");

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
        err instanceof Error ? err.message : "Failed to save machine slip entries.",
    };
  }
}

export async function checkSixAmStatusAction(dateStr: string) {
  try {
    const session = await requireTenantSession();
    return await getSixAmStatus(session.tenantId, dateStr);
  } catch (err: unknown) {
    console.error("checkSixAmStatusAction error:", err);
    return {
      hasRsp: false,
      hasSlipEntry: false,
      isReady: false,
      dateStr,
      rspPrices: null,
      slipEntriesCount: 0,
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

    return {
      rsp,
      slips,
    };
  } catch (err: unknown) {
    console.error("fetchSixAmDataForDateAction error:", err);
    return { rsp: null, slips: [] };
  }
}

export async function closeInterimShiftAction(
  input: SaveInterimShiftClosingInput
): Promise<ShiftClosingActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false, error: "Permission denied." };
    }

    // Gating check: ensure 6 AM entries exist for shift date
    const dateStr = (input.shiftDate || new Date()).toISOString().slice(0, 10);
    const sixAmStatus = await getSixAmStatus(session.tenantId, dateStr);
    if (!sixAmStatus.hasRsp || !sixAmStatus.hasSlipEntry) {
      const missing = [];
      if (!sixAmStatus.hasRsp) missing.push("RSP fuel prices");
      if (!sixAmStatus.hasSlipEntry) missing.push("6 AM slip entry readings");
      return {
        success: false,
        error: `Cannot close shift: Please complete the 6 AM entry first (${missing.join(" and ")} missing for ${dateStr}).`,
      };
    }

    if (!input.staffId) {
      return { success: false, error: "Select a staff member." };
    }

    const staff = await getStaffById(session.tenantId, input.staffId);
    if (!staff) {
      return { success: false, error: "Selected staff member not found." };
    }
    if (!staff.isActive) {
      return { success: false, error: "Selected staff member is inactive." };
    }

    const saved = await saveInterimShiftClosing(
      session.tenantId,
      session.userId,
      input
    );

    revalidatePath("/shift-closing/interim");

    return {
      success: true,
      message: `Shift for ${input.pumpName} closed and recorded successfully.`,
      data: saved,
    };
  } catch (err: unknown) {
    console.error("closeInterimShiftAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to record interim shift closing.",
    };
  }
}
