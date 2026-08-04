"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createTenantAction,
  resetTenantAdminPasswordAction,
  setTenantActiveAction,
  updateTenantAction,
} from "@/lib/actions/platform";
import type { ActionState } from "@/lib/actions/inventory";
import type { TenantHealthRow } from "@/lib/tenants/service";
import { formatDateTime } from "@/lib/format";
import { formatStationAddress } from "@/lib/tenants/format";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const initialState: ActionState = { success: false };

function formatHealthDate(value: Date | null) {
  if (!value) return "—";
  return formatDateTime(value);
}

function EditTenantDialog({ tenant }: { tenant: TenantHealthRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateTenantAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        Edit
      </DialogTrigger>
      <DialogContent className="max-h-[min(90vh,36rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit station</DialogTitle>
        </DialogHeader>
        {open ? (
          <form
            key={tenant.id}
            action={formAction}
            className="grid gap-3 sm:grid-cols-2"
            dir="ltr"
          >
            <input type="hidden" name="tenantId" value={tenant.id} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`edit-station-name-${tenant.id}`}>
                Station name
              </Label>
              <Input
                id={`edit-station-name-${tenant.id}`}
                name="stationName"
                required
                defaultValue={tenant.name}
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`edit-slug-${tenant.id}`}>Slug</Label>
              <Input
                id={`edit-slug-${tenant.id}`}
                name="slug"
                required
                defaultValue={tenant.slug}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`edit-address1-${tenant.id}`}>
                Address line 1
              </Label>
              <Input
                id={`edit-address1-${tenant.id}`}
                name="addressLine1"
                required
                defaultValue={tenant.addressLine1 ?? ""}
                autoComplete="address-line1"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`edit-address2-${tenant.id}`}>
                Address line 2
              </Label>
              <Input
                id={`edit-address2-${tenant.id}`}
                name="addressLine2"
                defaultValue={tenant.addressLine2 ?? ""}
                autoComplete="address-line2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-city-${tenant.id}`}>City</Label>
              <Input
                id={`edit-city-${tenant.id}`}
                name="city"
                required
                defaultValue={tenant.city ?? ""}
                autoComplete="address-level2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-state-${tenant.id}`}>State</Label>
              <Input
                id={`edit-state-${tenant.id}`}
                name="state"
                required
                defaultValue={tenant.state ?? ""}
                autoComplete="address-level1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-pincode-${tenant.id}`}>Pincode</Label>
              <Input
                id={`edit-pincode-${tenant.id}`}
                name="pincode"
                required
                defaultValue={tenant.pincode ?? ""}
                autoComplete="postal-code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-phone-${tenant.id}`}>Phone</Label>
              <Input
                id={`edit-phone-${tenant.id}`}
                name="phone"
                defaultValue={tenant.phone ?? ""}
                autoComplete="tel"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending} className="min-h-11">
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ResetAdminPasswordDialog({ tenant }: { tenant: TenantHealthRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    resetTenantAdminPasswordAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        Reset pw
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Admin password</DialogTitle>
        </DialogHeader>
        {open ? (
          <form
            key={tenant.id}
            action={formAction}
            className="grid gap-3"
            dir="ltr"
          >
            <input type="hidden" name="tenantId" value={tenant.id} />
            <p className="text-sm text-muted-foreground">
              Station: <span className="font-medium text-foreground">{tenant.name}</span>
              {tenant.adminUsername ? (
                <>
                  {" · "}Admin:{" "}
                  <span className="font-medium text-foreground">
                    {tenant.adminUsername}
                  </span>
                </>
              ) : (
                <span className="text-destructive"> · No Admin user found</span>
              )}
            </p>
            <div className="space-y-2">
              <Label htmlFor={`reset-pw-${tenant.id}`}>New password</Label>
              <Input
                id={`reset-pw-${tenant.id}`}
                name="newPassword"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                disabled={!tenant.adminUsername}
              />
            </div>
            <Button
              type="submit"
              disabled={pending || !tenant.adminUsername}
              className="min-h-11"
            >
              {pending ? "Resetting…" : "Reset password"}
            </Button>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SuspendToggleButton({ tenant }: { tenant: TenantHealthRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onToggle() {
    const nextActive = !tenant.isActive;
    const label = nextActive ? "reactivate" : "suspend";
    if (!window.confirm(`${label[0]!.toUpperCase()}${label.slice(1)} "${tenant.name}"?`)) {
      return;
    }
    startTransition(async () => {
      const result = await setTenantActiveAction(tenant.id, nextActive);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant={tenant.isActive ? "destructive" : "default"}
      size="sm"
      disabled={pending}
      onClick={onToggle}
    >
      {pending
        ? "…"
        : tenant.isActive
          ? "Suspend"
          : "Reactivate"}
    </Button>
  );
}

export function PlatformTenantsAdmin({
  tenants,
}: {
  tenants: TenantHealthRow[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createTenantAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Create station</CardTitle>
          <CardDescription>
            Each station is a billable unit. Names may repeat — address is
            required. Creates the Admin role and first Admin user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={formAction}
            className="grid gap-4 sm:grid-cols-2"
            dir="ltr"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="stationName">Station name</Label>
              <Input
                id="stationName"
                name="name"
                required
                placeholder="City Fuels"
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine1">Address line 1</Label>
              <Input id="addressLine1" name="addressLine1" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine2">Address line 2</Label>
              <Input id="addressLine2" name="addressLine2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" name="pincode" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="slug">Slug (optional)</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="auto from name if blank"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              />
              <p className="text-xs text-muted-foreground">
                Unique billing id. Auto-suffixed if the name already exists.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin name</Label>
              <Input id="adminName" name="adminName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminUsername">Admin username</Label>
              <Input id="adminUsername" name="adminUsername" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="adminPassword">Admin password</Label>
              <Input
                id="adminPassword"
                name="adminPassword"
                type="password"
                required
                minLength={6}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create station"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Stations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    No stations yet.
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => {
                  const address = formatStationAddress(tenant);
                  return (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        <div>{tenant.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {tenant.slug}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] min-w-[140px] whitespace-normal break-words text-muted-foreground">
                        {address || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tenant.isActive ? "secondary" : "destructive"}
                        >
                          {tenant.isActive ? "Active" : "Suspended"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{tenant.userCount} users</div>
                        <div>Login {formatHealthDate(tenant.lastLoginAt)}</div>
                        <div>Upload {formatHealthDate(tenant.lastUploadAt)}</div>
                      </TableCell>
                      <TableCell>
                        {tenant.onboardingComplete ? "Complete" : "Pending"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(tenant.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <EditTenantDialog tenant={tenant} />
                          <ResetAdminPasswordDialog tenant={tenant} />
                          <SuspendToggleButton tenant={tenant} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
