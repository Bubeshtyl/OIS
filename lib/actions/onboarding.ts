"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/actions/inventory";
import {
  isPrimeForSession,
  requireTenantSession,
} from "@/lib/auth/permissions";
import { stationProfileSchema } from "@/lib/tenants/station-profile-schema";
import {
  completeTenantOnboarding,
  getTenantById,
} from "@/lib/tenants/service";

export async function getOnboardingTenant() {
  const session = await requireTenantSession();
  if (!(await isPrimeForSession(session))) {
    return null;
  }
  return getTenantById(session.tenantId);
}

export async function completeOnboardingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let tenantId: string;
  try {
    const session = await requireTenantSession();
    if (!(await isPrimeForSession(session))) {
      return { success: false, error: "Only the station Admin can complete onboarding." };
    }
    tenantId = session.tenantId;
  } catch {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = stationProfileSchema.safeParse({
    name: formData.get("name"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check all fields.",
    };
  }

  await completeTenantOnboarding(tenantId, {
    name: parsed.data.name,
    addressLine1: parsed.data.addressLine1,
    addressLine2: parsed.data.addressLine2,
    city: parsed.data.city,
    state: parsed.data.state,
    pincode: parsed.data.pincode,
    phone: parsed.data.phone,
  });

  revalidatePath("/", "layout");
  redirect("/");
}
