"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/actions/inventory";
import { requirePlatformAdmin } from "@/lib/auth/permissions";
import { ADMIN_PERMISSIONS } from "@/lib/auth/role-defaults";
import { getDefaultPathSync } from "@/lib/auth/rbac";
import { getSession, saveSession } from "@/lib/auth/session";
import type { SessionData } from "@/lib/auth/session-config";
import {
  createTenantWithPrime,
  getTenantForAssume,
  listTenantsWithHealth,
  resetTenantPrimePassword,
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
  primeName: z.string().min(1, "Prime name is required."),
  primeUsername: z
    .string()
    .min(3)
    .max(32)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores."
    ),
  primePassword: z.string().min(6, "Password must be at least 6 characters."),
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
    primeName: formData.get("primeName") ?? formData.get("adminName"),
    primeUsername: formData.get("primeUsername") ?? formData.get("adminUsername"),
    primePassword: formData.get("primePassword") ?? formData.get("adminPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check all fields.",
    };
  }

  try {
    const result = await createTenantWithPrime({
      name: parsed.data.name,
      slug: parsed.data.slug || undefined,
      addressLine1: parsed.data.addressLine1,
      addressLine2: parsed.data.addressLine2 || undefined,
      city: parsed.data.city,
      state: parsed.data.state,
      pincode: parsed.data.pincode,
      phone: parsed.data.phone || undefined,
      primeName: parsed.data.primeName,
      primeUsername: parsed.data.primeUsername,
      primePassword: parsed.data.primePassword,
    });
    revalidatePath("/platform");
    return {
      success: true,
      message: `Station "${result.tenant.name}" created (${result.tenant.slug}). Prime login: ${result.primeUser.username}`,
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

export async function resetTenantPrimePasswordAction(
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
    const prime = await resetTenantPrimePassword(
      parsed.data.tenantId,
      parsed.data.newPassword
    );
    revalidatePath("/platform");
    return {
      success: true,
      message: `Password reset for Prime "${prime.username}".`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reset password.",
    };
  }
}

/** @deprecated Use resetTenantPrimePasswordAction */
export async function resetTenantAdminPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  return resetTenantPrimePasswordAction(_prev, formData);
}

export async function assumeTenantPrimeAction(
  tenantId: string
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

  const tenant = await getTenantForAssume(parsed.data);
  if (!tenant) {
    return { success: false, error: "Station not found." };
  }
  if (!tenant.isActive) {
    return { success: false, error: "Cannot enter a suspended station." };
  }

  const session = await getSession();
  const next: SessionData = {
    ...session,
    tenantId: tenant.id,
    roleId: null,
    roleName: "Prime",
    isAssumingPrime: true,
    isPrime: false,
    assumedTenantName: tenant.name,
    permissions: [...ADMIN_PERMISSIONS],
    tenantOnboardingComplete: tenant.onboardingComplete,
    tenantIsActive: tenant.isActive,
    isSystemAdmin: true,
    isLoggedIn: true,
    isPlatformAdmin: true,
  };
  await saveSession(next);
  redirect(getDefaultPathSync(next) ?? "/");
}

export async function exitAssumePrimeAction(): Promise<ActionState> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.isPlatformAdmin) {
    return { success: false, error: "You do not have permission." };
  }

  const next: SessionData = {
    ...session,
    tenantId: null,
    roleId: null,
    roleName: null,
    isAssumingPrime: false,
    isPrime: false,
    assumedTenantName: null,
    permissions: [],
    tenantOnboardingComplete: undefined,
    tenantIsActive: undefined,
    isSystemAdmin: false,
  };
  await saveSession(next);
  redirect("/platform");
}
