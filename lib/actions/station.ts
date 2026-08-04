"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/actions/inventory";
import {
  isSystemAdminRole,
  requireTenantSession,
} from "@/lib/auth/permissions";
import {
  getTenantById,
  updateStationProfile,
} from "@/lib/tenants/service";

export const stationProfileSchema = z.object({
  name: z.string().min(2, "Station name is required."),
  addressLine1: z.string().min(2, "Address is required."),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required."),
  state: z.string().min(1, "State is required."),
  pincode: z.string().min(4, "Pincode is required."),
  phone: z.string().optional(),
});

export async function getStationProfile() {
  const session = await requireTenantSession();
  if (!(await isSystemAdminRole(session.roleId))) {
    return null;
  }
  return getTenantById(session.tenantId);
}

export async function updateStationProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let tenantId: string;
  try {
    const session = await requireTenantSession();
    if (!(await isSystemAdminRole(session.roleId))) {
      return {
        success: false,
        error: "Only the station Admin can update the station profile.",
      };
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

  await updateStationProfile(tenantId, {
    name: parsed.data.name,
    addressLine1: parsed.data.addressLine1,
    addressLine2: parsed.data.addressLine2,
    city: parsed.data.city,
    state: parsed.data.state,
    pincode: parsed.data.pincode,
    phone: parsed.data.phone,
  });

  revalidatePath("/admin/station");
  revalidatePath("/", "layout");
  return { success: true, message: "Station profile saved." };
}
