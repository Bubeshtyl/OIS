"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions/inventory";
import type { Tenant } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: ActionState = { success: false };

type StationProfileFormProps = {
  tenant: Tenant;
  action: (
    prev: ActionState,
    formData: FormData
  ) => Promise<ActionState>;
  title?: string;
  description?: string;
  submitLabel?: string;
  pendingLabel?: string;
  /** When true, successful submit relies on a server redirect. */
  redirectOnSuccess?: boolean;
};

export function StationProfileForm({
  tenant,
  action,
  title = "Station profile",
  description = "Name and full address identify this petrol station for billing.",
  submitLabel = "Save station profile",
  pendingLabel = "Saving…",
  redirectOnSuccess = false,
}: StationProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (!redirectOnSuccess && state.success) toast.success(state.message);
    if (state.error) toast.error(state.error);
  }, [state, redirectOnSuccess]);

  return (
    <Card className="mx-auto w-full max-w-xl border-0 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Station name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={tenant.name}
            />
            <p className="text-xs text-muted-foreground">
              Names can be shared by multiple stations — address distinguishes
              them.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address line 1</Label>
            <Input
              id="addressLine1"
              name="addressLine1"
              required
              defaultValue={tenant.addressLine1 ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address line 2</Label>
            <Input
              id="addressLine2"
              name="addressLine2"
              defaultValue={tenant.addressLine2 ?? ""}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                required
                defaultValue={tenant.city ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                required
                defaultValue={tenant.state ?? ""}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                name="pincode"
                required
                defaultValue={tenant.pincode ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={tenant.phone ?? ""}
              />
            </div>
          </div>
          <Button type="submit" disabled={pending} className="min-h-11">
            {pending ? pendingLabel : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
