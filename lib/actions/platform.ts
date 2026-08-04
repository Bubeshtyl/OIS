"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/actions/inventory";
import { requirePlatformAdmin } from "@/lib/auth/permissions";
import {
  createTenantWithAdmin,
  listTenantsWithHealth,
  resetTenantAdminPassword,
  setTenantActive,
  updateStationProfile,
} from "@/lib/tenants/service";

const createTenantSchema = z.object({
  name: z.string().min(2, "Station name is required."),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens."
    )
    .optional()
    .or(z.literal("")),
  addressLine1: z.string().min(2, "Address is required."),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "City is required."),
  state: z.string().min(1, "State is required."),
  pincode: z.string().min(4, "Pincode is required."),
  phone: z.string().optional().or(z.literal("")),
  adminName: z.string().min(1, "Admin name is required."),
  adminUsername: z
    .string()
    .min(3)
    .max(32)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores."
    ),
  adminPassword: z.string().min(6, "Password must be at least 6 characters."),
});

export async function getPlatformTenants() {
  await requirePlatformAdmin();
  return listTenantsWithHealth();
}

export async function createTenantAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = createTenantSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || "",
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") || "",
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    phone: formData.get("phone") || "",
    adminName: formData.get("adminName"),
    adminUsername: formData.get("adminUsername"),
    adminPassword: formData.get("adminPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check all fields.",
    };
  }

  try {
    const result = await createTenantWithAdmin({
      name: parsed.data.name,
      slug: parsed.data.slug || undefined,
      addressLine1: parsed.data.addressLine1,
      addressLine2: parsed.data.addressLine2 || undefined,
      city: parsed.data.city,
      state: parsed.data.state,
      pincode: parsed.data.pincode,
      phone: parsed.data.phone || undefined,
      adminName: parsed.data.adminName,
      adminUsername: parsed.data.adminUsername,
      adminPassword: parsed.data.adminPassword,
    });
    revalidatePath("/platform");
    return {
      success: true,
      message: `Station "${result.tenant.name}" created (${result.tenant.slug}). Admin login: ${result.adminUser.username}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create station.",
    };
  }
}

const updateTenantSchema = z.object({
  tenantId: z.string().uuid(),
  stationName: z.string().min(2, "Station name is required."),
  slug: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens."
    ),
  addressLine1: z.string().min(2, "Address is required."),
  addressLine2: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "City is required."),
  state: z.string().min(1, "State is required."),
  pincode: z.string().min(4, "Pincode is required."),
  phone: z.string().optional().or(z.literal("")),
});

export async function updateTenantAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = updateTenantSchema.safeParse({
    tenantId: formData.get("tenantId"),
    stationName: formData.get("stationName"),
    slug: formData.get("slug"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") || "",
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    phone: formData.get("phone") || "",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check all fields.",
    };
  }

  try {
    await updateStationProfile(
      parsed.data.tenantId,
      {
        name: parsed.data.stationName,
        addressLine1: parsed.data.addressLine1,
        addressLine2: parsed.data.addressLine2 || undefined,
        city: parsed.data.city,
        state: parsed.data.state,
        pincode: parsed.data.pincode,
        phone: parsed.data.phone || undefined,
      },
      { slug: parsed.data.slug }
    );
    revalidatePath("/platform");
    return {
      success: true,
      message: `Station "${parsed.data.stationName}" updated.`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update station.",
    };
  }
}

export async function setTenantActiveAction(
  tenantId: string,
  isActive: boolean
): Promise<ActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = z.string().uuid().safeParse(tenantId);
  if (!parsed.success) {
    return { success: false, error: "Invalid station." };
  }

  try {
    const updated = await setTenantActive(parsed.data, isActive);
    revalidatePath("/platform");
    return {
      success: true,
      message: isActive
        ? `Station "${updated.name}" reactivated.`
        : `Station "${updated.name}" suspended.`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update station status.",
    };
  }
}

const resetPasswordSchema = z.object({
  tenantId: z.string().uuid(),
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
});

export async function resetTenantAdminPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = resetPasswordSchema.safeParse({
    tenantId: formData.get("tenantId"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check all fields.",
    };
  }

  try {
    const admin = await resetTenantAdminPassword(
      parsed.data.tenantId,
      parsed.data.newPassword
    );
    revalidatePath("/platform");
    return {
      success: true,
      message: `Password reset for Admin "${admin.username}".`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reset password.",
    };
  }
}
