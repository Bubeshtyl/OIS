"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  fuelProducts,
  stationNozzles,
  stationPumps,
} from "@/lib/db/schema";
import {
  isSystemAdminRole,
  requireTenantSession,
} from "@/lib/auth/permissions";
import {
  getStationLayout,
  seedStationDefaultLayout,
} from "@/lib/station-config/service";
import { ensureStationPumpSerialSchema } from "@/lib/station-config/ensure-schema";
import type { ActionState } from "@/lib/actions/inventory";

// ---------------- Fuel Products Actions ---------------- //

export async function createFuelProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only station Admins can modify configuration." };
    }

    const name = String(formData.get("name") || "").trim();
    const code = String(formData.get("code") || "").trim().toUpperCase() || null;
    const color = String(formData.get("color") || "").trim() || "emerald";

    if (!name) {
      return { success: false, error: "Product name is required." };
    }

    const db = getDb();
    await db.insert(fuelProducts).values({
      tenantId: session.tenantId,
      name,
      code,
      color,
      isActive: true,
    });

    revalidatePath("/admin/station");
    revalidatePath("/shift-closing/interim");
    revalidatePath("/shift-closing/upcoming");
    revalidatePath("/shift-closing/6am");
    return { success: true, message: `Fuel product "${name}" created.` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create product.";
    return {
      success: false,
      error: msg.includes("unique") ? "A product with that name already exists." : msg,
    };
  }
}

export async function updateFuelProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only station Admins can modify configuration." };
    }

    const id = String(formData.get("id") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const code = String(formData.get("code") || "").trim().toUpperCase() || null;
    const color = String(formData.get("color") || "").trim() || "emerald";
    const isActive = formData.get("isActive") !== "false";

    if (!id || !name) {
      return { success: false, error: "Product ID and name are required." };
    }

    const db = getDb();
    await db
      .update(fuelProducts)
      .set({
        name,
        code,
        color,
        isActive,
      })
      .where(and(eq(fuelProducts.id, id), eq(fuelProducts.tenantId, session.tenantId)));

    revalidatePath("/admin/station");
    revalidatePath("/shift-closing/interim");
    revalidatePath("/shift-closing/upcoming");
    revalidatePath("/shift-closing/6am");
    return { success: true, message: `Fuel product "${name}" updated.` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Update failed." };
  }
}

export async function deleteFuelProductAction(
  id: string
): Promise<ActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only station Admins can modify configuration." };
    }

    const db = getDb();
    await db
      .delete(fuelProducts)
      .where(and(eq(fuelProducts.id, id), eq(fuelProducts.tenantId, session.tenantId)));

    revalidatePath("/admin/station");
    revalidatePath("/shift-closing/interim");
    revalidatePath("/shift-closing/upcoming");
    revalidatePath("/shift-closing/6am");
    return { success: true, message: "Fuel product deleted." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Delete failed." };
  }
}

// ---------------- Pumps Actions ---------------- //

export async function createPumpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only station Admins can modify configuration." };
    }

    await ensureStationPumpSerialSchema();

    const pumpNumber = Number(formData.get("pumpNumber"));
    const name = String(formData.get("name") || "").trim() || `Pump ${pumpNumber}`;
    const serialNumber = String(formData.get("serialNumber") || "").trim() || null;

    if (!pumpNumber || isNaN(pumpNumber) || pumpNumber <= 0) {
      return { success: false, error: "Valid pump number is required (e.g. 1, 2, 3...)." };
    }

    const db = getDb();
    await db.insert(stationPumps).values({
      tenantId: session.tenantId,
      pumpNumber,
      name,
      serialNumber,
      sortOrder: pumpNumber,
      isActive: true,
    });

    revalidatePath("/admin/station");
    revalidatePath("/shift-closing/interim");
    revalidatePath("/shift-closing/upcoming");
    revalidatePath("/shift-closing/6am");
    return { success: true, message: `${name} created.` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create pump.";
    return {
      success: false,
      error: msg.includes("unique") ? "Pump with this number already exists." : msg,
    };
  }
}

export async function updatePumpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only station Admins can modify configuration." };
    }

    await ensureStationPumpSerialSchema();

    const id = String(formData.get("id") || "").trim();
    const pumpNumber = Number(formData.get("pumpNumber"));
    const name = String(formData.get("name") || "").trim() || `Pump ${pumpNumber}`;
    const serialNumber = String(formData.get("serialNumber") || "").trim() || null;
    const isActive = formData.get("isActive") !== "false";

    if (!id || !pumpNumber || isNaN(pumpNumber)) {
      return { success: false, error: "Valid pump ID and number are required." };
    }

    const db = getDb();
    await db
      .update(stationPumps)
      .set({
        pumpNumber,
        name,
        serialNumber,
        isActive,
        sortOrder: pumpNumber,
      })
      .where(and(eq(stationPumps.id, id), eq(stationPumps.tenantId, session.tenantId)));

    revalidatePath("/admin/station");
    revalidatePath("/shift-closing/interim");
    revalidatePath("/shift-closing/upcoming");
    revalidatePath("/shift-closing/6am");
    return { success: true, message: `${name} updated.` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Update failed." };
  }
}

export async function deletePumpAction(
  id: string
): Promise<ActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only station Admins can modify configuration." };
    }

    const db = getDb();
    await db
      .delete(stationPumps)
      .where(and(eq(stationPumps.id, id), eq(stationPumps.tenantId, session.tenantId)));

    revalidatePath("/admin/station");
    revalidatePath("/shift-closing/interim");
    revalidatePath("/shift-closing/upcoming");
    revalidatePath("/shift-closing/6am");
    return { success: true, message: "Pump and its associated nozzles deleted." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Delete failed." };
  }
}

// ---------------- Nozzles Actions ---------------- //

export async function createNozzleAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only station Admins can modify configuration." };
    }

    const pumpId = String(formData.get("pumpId") || "").trim();
    const nozzleNumber = Number(formData.get("nozzleNumber"));
    const name = String(formData.get("name") || "").trim() || `Nozzle ${nozzleNumber}`;
    const productId = String(formData.get("productId") || "").trim() || null;

    if (!pumpId || !nozzleNumber || isNaN(nozzleNumber) || nozzleNumber <= 0) {
      return { success: false, error: "Select a pump and enter a valid nozzle number." };
    }

    const db = getDb();
    await db.insert(stationNozzles).values({
      tenantId: session.tenantId,
      pumpId,
      nozzleNumber,
      name,
      productId: productId === "none" ? null : productId,
      sortOrder: nozzleNumber,
      isActive: true,
    });

    revalidatePath("/admin/station");
    revalidatePath("/shift-closing/interim");
    revalidatePath("/shift-closing/upcoming");
    revalidatePath("/shift-closing/6am");
    return { success: true, message: `${name} created.` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create nozzle.";
    return {
      success: false,
      error: msg.includes("unique") ? "This nozzle number already exists on the selected pump." : msg,
    };
  }
}

export async function updateNozzleAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only station Admins can modify configuration." };
    }

    const id = String(formData.get("id") || "").trim();
    const pumpId = String(formData.get("pumpId") || "").trim();
    const nozzleNumber = Number(formData.get("nozzleNumber"));
    const name = String(formData.get("name") || "").trim() || `Nozzle ${nozzleNumber}`;
    const productId = String(formData.get("productId") || "").trim() || null;
    const isActive = formData.get("isActive") !== "false";

    if (!id || !pumpId || !nozzleNumber || isNaN(nozzleNumber)) {
      return { success: false, error: "Valid nozzle information is required." };
    }

    const db = getDb();
    await db
      .update(stationNozzles)
      .set({
        pumpId,
        nozzleNumber,
        name,
        productId: productId === "none" ? null : productId,
        isActive,
        sortOrder: nozzleNumber,
      })
      .where(and(eq(stationNozzles.id, id), eq(stationNozzles.tenantId, session.tenantId)));

    revalidatePath("/admin/station");
    revalidatePath("/shift-closing/interim");
    revalidatePath("/shift-closing/upcoming");
    revalidatePath("/shift-closing/6am");
    return { success: true, message: `${name} updated.` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Update failed." };
  }
}

export async function deleteNozzleAction(
  id: string
): Promise<ActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only station Admins can modify configuration." };
    }

    const db = getDb();
    await db
      .delete(stationNozzles)
      .where(and(eq(stationNozzles.id, id), eq(stationNozzles.tenantId, session.tenantId)));

    revalidatePath("/admin/station");
    revalidatePath("/shift-closing/interim");
    revalidatePath("/shift-closing/upcoming");
    revalidatePath("/shift-closing/6am");
    return { success: true, message: "Nozzle deleted." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Delete failed." };
  }
}

// ---------------- Reset / Seed Default Action ---------------- //

export async function resetDefaultStationLayoutAction(): Promise<ActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only station Admins can modify configuration." };
    }

    await seedStationDefaultLayout(session.tenantId);

    revalidatePath("/admin/station");
    revalidatePath("/shift-closing/interim");
    revalidatePath("/shift-closing/upcoming");
    revalidatePath("/shift-closing/6am");
    return { success: true, message: "Default pump, nozzle & fuel product layout restored." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reset layout.",
    };
  }
}
