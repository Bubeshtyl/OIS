"use client";

import { useState, useTransition, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, FileDown, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  saveStaffAction,
  setStaffActiveAction,
} from "@/lib/actions/staff";
import type { StaffMember } from "@/lib/staff/service";
import { downloadStaffPdf } from "@/lib/staff/generate-staff-pdf";
import { getIstTodayString } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function ActionTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function StaffField({
  id,
  label,
  name,
  defaultValue,
  type = "text",
  required,
  autoComplete,
  inputMode,
  maxLength,
  digitsOnly,
}: {
  id: string;
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: "text" | "tel" | "password";
  required?: boolean;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "text";
  maxLength?: number;
  digitsOnly?: boolean;
}) {
  function handleInput(event: FormEvent<HTMLInputElement>) {
    if (!digitsOnly) return;
    const input = event.currentTarget;
    const nextValue = input.value.replace(/\D/g, "");
    if (input.value !== nextValue) {
      input.value = nextValue;
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        autoComplete={autoComplete}
        inputMode={digitsOnly ? "numeric" : inputMode}
        maxLength={maxLength}
        onInput={digitsOnly ? handleInput : undefined}
      />
    </div>
  );
}

function StaffFormSheet({
  staff,
  children,
  tooltip,
}: {
  staff?: StaffMember;
  children: ReactElement;
  tooltip?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(staff?.isActive ?? true);
  const [joiningDate, setJoiningDate] = useState(staff?.joiningDate ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const today = getIstTodayString();
  const fieldId = staff?.id ?? "new";

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveStaffAction({ success: false }, formData);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setIsActive(staff?.isActive ?? true);
          setJoiningDate(staff?.joiningDate ?? "");
          setShowPassword(false);
        }
      }}
    >
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger render={<DialogTrigger render={children} />} />
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger render={children} />
      )}
      <DialogContent className="max-h-[min(90vh,44rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{staff ? "Edit Staff" : "Add Staff"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {staff && <input type="hidden" name="id" value={staff.id} />}
          <input type="hidden" name="isActive" value={String(isActive)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <StaffField
              id={`staff-name-${fieldId}`}
              label="Name"
              name="name"
              defaultValue={staff?.name}
              required
            />
            <div className="space-y-2">
              <Label htmlFor={`staff-joining-date-${fieldId}`}>Joining date</Label>
              <DatePicker
                id={`staff-joining-date-${fieldId}`}
                name="joiningDate"
                value={joiningDate}
                onChange={setJoiningDate}
                today={today}
                required
                placeholder=""
                className="h-8 text-sm"
              />
            </div>
            <StaffField
              id={`staff-primary-phone-${fieldId}`}
              label="Primary phone number"
              name="primaryPhone"
              digitsOnly
              maxLength={10}
              defaultValue={staff?.primaryPhone}
              required
            />
            <StaffField
              id={`staff-secondary-phone-${fieldId}`}
              label="Secondary phone number"
              name="secondaryPhone"
              digitsOnly
              maxLength={10}
              defaultValue={staff?.secondaryPhone}
            />
            <StaffField
              id={`staff-door-no-${fieldId}`}
              label="Door no"
              name="doorNo"
              defaultValue={staff?.doorNo}
              required
            />
            <StaffField
              id={`staff-street-${fieldId}`}
              label="Street"
              name="street"
              defaultValue={staff?.street}
              required
            />
            <StaffField
              id={`staff-area-${fieldId}`}
              label="Area"
              name="area"
              defaultValue={staff?.area}
              required
            />
            <StaffField
              id={`staff-town-city-${fieldId}`}
              label="Town/city"
              name="townCity"
              defaultValue={staff?.townCity}
              required
            />
            <StaffField
              id={`staff-district-${fieldId}`}
              label="District"
              name="district"
              defaultValue={staff?.district}
              required
            />
            <StaffField
              id={`staff-pincode-${fieldId}`}
              label="Pincode"
              name="pincode"
              digitsOnly
              maxLength={6}
              defaultValue={staff?.pincode}
              required
            />
            <StaffField
              id={`staff-aadhar-${fieldId}`}
              label="Aadhar number"
              name="aadharNumber"
              digitsOnly
              maxLength={16}
              defaultValue={staff?.aadharNumber}
              required
            />
            <StaffField
              id={`staff-guardian-name-${fieldId}`}
              label="Guardian name"
              name="guardianName"
              defaultValue={staff?.guardianName}
              required
            />
            <StaffField
              id={`staff-guardian-relationship-${fieldId}`}
              label="Guardian relationship"
              name="guardianRelationship"
              defaultValue={staff?.guardianRelationship}
              required
            />
            <StaffField
              id={`staff-guardian-phone-${fieldId}`}
              label="Guardian phone number"
              name="guardianPhone"
              digitsOnly
              maxLength={10}
              defaultValue={staff?.guardianPhone}
              required
            />
            <StaffField
              id={`staff-username-${fieldId}`}
              label="Username"
              name="username"
              autoComplete="off"
              defaultValue={staff?.username}
              maxLength={32}
              required
            />
            <div className="space-y-2">
              <Label htmlFor={`staff-password-${fieldId}`}>Password</Label>
              <div className="relative">
                <Input
                  id={`staff-password-${fieldId}`}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={staff ? undefined : 6}
                  required={!staff}
                  className="pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor={`staff-active-${fieldId}`}>Active</Label>
            <Switch
              id={`staff-active-${fieldId}`}
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="flex-1">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StaffStatusAction({
  staff,
  onComplete,
}: {
  staff: StaffMember;
  onComplete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const isActive = staff.isActive;

  async function handleConfirm() {
    setPending(true);
    try {
      const result = await setStaffActiveAction(staff.id, !isActive);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        onComplete();
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <ActionTooltip label={isActive ? "Deactivate" : "Activate"}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={
            isActive
              ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
              : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
          }
          disabled={pending}
          onClick={() => setOpen(true)}
        >
          {isActive ? (
            <Trash2 className="size-4" />
          ) : (
            <RotateCcw className="size-4" />
          )}
        </Button>
      </ActionTooltip>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                isActive
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-50 text-emerald-600"
              }
            >
              {isActive ? <Trash2 /> : <RotateCcw />}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {isActive ? "Deactivate this staff?" : "Activate this staff?"}
            </AlertDialogTitle>
            <AlertDialogDescription>{staff.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={isActive ? "destructive" : "default"}
              disabled={pending}
              onClick={handleConfirm}
            >
              {pending ? "Please wait…" : isActive ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StaffPdfAction({ staff }: { staff: StaffMember }) {
  const [pending, startTransition] = useTransition();

  function handleDownload() {
    startTransition(() => {
      try {
        downloadStaffPdf(staff);
        toast.success("Staff PDF downloaded.");
      } catch {
        toast.error("Failed to generate staff PDF.");
      }
    });
  }

  return (
    <ActionTooltip label="Download PDF">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        onClick={handleDownload}
        aria-label={`Download PDF for ${staff.name}`}
      >
        <FileDown className="size-4" />
      </Button>
    </ActionTooltip>
  );
}

function StaffDetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

function formatStaffAddress(member: StaffMember) {
  const parts = [
    member.doorNo,
    member.street,
    member.area,
    member.townCity,
    member.district,
    member.pincode,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

function StaffDetailDialog({ staff }: { staff: StaffMember }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button variant="ghost" size="icon-sm">
                  <Eye className="size-4" />
                </Button>
              }
            />
          }
        />
        <TooltipContent>View</TooltipContent>
      </Tooltip>
      <DialogContent className="max-h-[min(90vh,44rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{staff.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={staff.isActive ? "default" : "secondary"}>
              {staff.isActive ? "Active" : "Inactive"}
            </Badge>
            {staff.roleName ? <Badge variant="outline">{staff.roleName}</Badge> : null}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Account</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <StaffDetailItem label="Username" value={staff.username} />
              <StaffDetailItem label="Joining date" value={staff.joiningDate} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Contact</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <StaffDetailItem label="Primary phone" value={staff.primaryPhone} />
              <StaffDetailItem label="Secondary phone" value={staff.secondaryPhone} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Address</h3>
            <StaffDetailItem label="Full address" value={formatStaffAddress(staff)} />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Identity</h3>
            <StaffDetailItem label="Aadhar number" value={staff.aadharNumber} />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Guardian</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <StaffDetailItem label="Name" value={staff.guardianName} />
              <StaffDetailItem
                label="Relationship"
                value={staff.guardianRelationship}
              />
              <StaffDetailItem label="Phone" value={staff.guardianPhone} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AddStaffButton() {
  return (
    <StaffFormSheet>
      <Button className="min-h-10 shrink-0">+ Add</Button>
    </StaffFormSheet>
  );
}

export function StaffAdmin({ staff }: { staff: StaffMember[] }) {
  const router = useRouter();

  return (
    <Card className="border shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No staff yet.
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.primaryPhone ?? "—"}</TableCell>
                    <TableCell>{member.username}</TableCell>
                    <TableCell>{member.roleName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={member.isActive ? "default" : "secondary"}>
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <StaffDetailDialog staff={member} />
                        <StaffPdfAction staff={member} />
                        <StaffFormSheet staff={member} tooltip="Edit">
                          <Button variant="ghost" size="icon-sm">
                            <Pencil className="size-4" />
                          </Button>
                        </StaffFormSheet>
                        <StaffStatusAction
                          staff={member}
                          onComplete={() => router.refresh()}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
