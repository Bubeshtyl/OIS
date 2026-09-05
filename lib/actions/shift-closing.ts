"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  isSystemAdminForSession,
  requireTenantSession,
} from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import type { ShiftClosingEntityType } from "@/lib/db/schema";
import {
  approveEditRequest,
  cancelEditRequest,
  countPendingEditRequests,
  createEditRequest,
  getEditRequestById,
  getInterimShiftClosingById,
  getPendingEditRequests,
  listDailyRspPrices,
  listInterimShiftClosings,
  listMachineSlipEntriesRange,
  rejectEditRequest,
} from "@/lib/shift-closing/ledger";
import {
  getDailyRsp,
  getMachineSlipEntries,
  saveDailyRsp,
  saveMachineSlipEntries,
  saveInterimShiftClosing,
  type MachineSlipItem,
  type SaveInterimShiftClosingInput,
} from "@/lib/shift-closing/service";
import type { ShiftClosingProposedData } from "@/lib/shift-closing/types";
import type { ShiftClosingPendingBadgeCounts } from "@/lib/shift-closing/ledger";
import { getStaffById } from "@/lib/staff/service";

const LEDGER_PATHS = [
  "/shift-closing/rsp",
  "/shift-closing/ledger",
  "/shift-closing/6am",
  "/shift-closing/interim",
] as const;

function revalidateShiftClosingPaths() {
  for (const path of LEDGER_PATHS) {
    revalidatePath(path);
  }
}

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
        err instanceof Error ? err.message : "Failed to save machine slip entries.",
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

    revalidateShiftClosingPaths();

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

export async function listRspLedgerAction(filters?: {
  from?: string;
  to?: string;
}) {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false as const, error: "Permission denied." };
    }
    const rows = await listDailyRspPrices(session.tenantId, filters ?? {});
    return { success: true as const, data: rows };
  } catch (err: unknown) {
    console.error("listRspLedgerAction error:", err);
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to load RSP ledger.",
    };
  }
}

export async function listShiftClosingLedgerAction(input?: {
  type?: "slips" | "interim";
  from?: string;
  to?: string;
  machineNumber?: string;
  pumpNumber?: number;
}) {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false as const, error: "Permission denied." };
    }

    const type = input?.type ?? "slips";
    if (type === "interim") {
      const rows = await listInterimShiftClosings(session.tenantId, {
        from: input?.from,
        to: input?.to,
        pumpNumber: input?.pumpNumber,
      });
      return { success: true as const, type: "interim" as const, data: rows };
    }

    const rows = await listMachineSlipEntriesRange(session.tenantId, {
      from: input?.from,
      to: input?.to,
      machineNumber: input?.machineNumber,
    });
    return { success: true as const, type: "slips" as const, data: rows };
  } catch (err: unknown) {
    console.error("listShiftClosingLedgerAction error:", err);
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to load ledger.",
    };
  }
}

export async function getShiftClosingDetailAction(
  type: "interim",
  id: string
) {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false as const, error: "Permission denied." };
    }

    if (type === "interim") {
      const detail = await getInterimShiftClosingById(session.tenantId, id);
      if (!detail) {
        return { success: false as const, error: "Entry not found." };
      }
      return { success: true as const, data: detail };
    }

    return { success: false as const, error: "Unsupported detail type." };
  } catch (err: unknown) {
    console.error("getShiftClosingDetailAction error:", err);
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to load entry.",
    };
  }
}

export async function listPendingEditRequestsAction(filters?: {
  entityType?: ShiftClosingEntityType;
}) {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false as const, error: "Permission denied." };
    }

    const rows = await getPendingEditRequests(session.tenantId, {
      status: "pending",
      entityType: filters?.entityType,
    });
    return { success: true as const, data: rows };
  } catch (err: unknown) {
    console.error("listPendingEditRequestsAction error:", err);
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to load requests.",
    };
  }
}

const editRequestSchema = z.object({
  entityType: z.enum([
    "daily_rsp",
    "machine_slip_entry",
    "interim_shift_closing",
  ]),
  entityId: z.string().uuid(),
  proposedData: z.record(z.string(), z.unknown()),
  note: z.string().optional(),
});

export async function submitShiftClosingEditRequestAction(input: {
  entityType: ShiftClosingEntityType;
  entityId: string;
  proposedData: ShiftClosingProposedData;
  note?: string;
}): Promise<ShiftClosingActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false, error: "Permission denied." };
    }

    const parsed = editRequestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid edit request.",
      };
    }

    await createEditRequest(session.tenantId, session.userId, {
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      proposedData: input.proposedData,
      note: parsed.data.note,
    });

    revalidateShiftClosingPaths();
    return {
      success: true,
      message: "Edit request submitted for admin approval.",
    };
  } catch (err: unknown) {
    console.error("submitShiftClosingEditRequestAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to submit edit request.",
    };
  }
}

export async function approveShiftClosingEditAction(
  requestId: string,
  reviewNote?: string
): Promise<ShiftClosingActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminForSession(session))) {
      return { success: false, error: "Only admins can approve edits." };
    }

    await approveEditRequest(
      session.tenantId,
      session.userId,
      requestId,
      reviewNote
    );
    revalidateShiftClosingPaths();
    return { success: true, message: "Edit request approved and applied." };
  } catch (err: unknown) {
    console.error("approveShiftClosingEditAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to approve edit request.",
    };
  }
}

export async function rejectShiftClosingEditAction(
  requestId: string,
  reviewNote?: string
): Promise<ShiftClosingActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminForSession(session))) {
      return { success: false, error: "Only admins can reject edits." };
    }

    await rejectEditRequest(
      session.tenantId,
      session.userId,
      requestId,
      reviewNote
    );
    revalidateShiftClosingPaths();
    return { success: true, message: "Edit request rejected." };
  } catch (err: unknown) {
    console.error("rejectShiftClosingEditAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to reject edit request.",
    };
  }
}

export async function cancelShiftClosingEditRequestAction(
  requestId: string
): Promise<ShiftClosingActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false, error: "Permission denied." };
    }

    await cancelEditRequest(session.tenantId, session.userId, requestId);
    revalidateShiftClosingPaths();
    return { success: true, message: "Edit request cancelled." };
  } catch (err: unknown) {
    console.error("cancelShiftClosingEditRequestAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to cancel edit request.",
    };
  }
}

export async function getEditRequestDetailAction(requestId: string) {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false as const, error: "Permission denied." };
    }
    const request = await getEditRequestById(session.tenantId, requestId);
    if (!request) {
      return { success: false as const, error: "Request not found." };
    }
    return { success: true as const, data: request };
  } catch (err: unknown) {
    console.error("getEditRequestDetailAction error:", err);
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to load request.",
    };
  }
}

export async function getPendingEditRequestBadgeCountsAction(): Promise<{
  success: boolean;
  data?: ShiftClosingPendingBadgeCounts;
  error?: string;
}> {
  try {
    const session = await requireTenantSession();
    if (session.isSystemAdmin === false) {
      return { success: true, data: { rsp: 0, ledger: 0 } };
    }
    if (
      session.isSystemAdmin !== true &&
      !(await isSystemAdminForSession(session))
    ) {
      return { success: true, data: { rsp: 0, ledger: 0 } };
    }

    const data = await countPendingEditRequests(session.tenantId);
    return { success: true, data };
  } catch (err: unknown) {
    console.error("getPendingEditRequestBadgeCountsAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to load pending counts.",
    };
  }
}
