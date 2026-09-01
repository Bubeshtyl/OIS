"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  saveStaffAction,
  setStaffActiveAction,
} from "@/lib/actions/staff";
import type { StaffMember } from "@/lib/staff/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

function StaffFormSheet({
  staff,
  children,
}: {
  staff?: StaffMember;
  children: ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(staff?.isActive ?? true);
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
        if (next) setIsActive(staff?.isActive ?? true);
      }}
    >
      <DialogTrigger render={children} />
      <DialogContent className="max-h-[min(90vh,32rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{staff ? "Edit Staff" : "Add Staff"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-3">
          {staff && <input type="hidden" name="id" value={staff.id} />}
          <input type="hidden" name="isActive" value={String(isActive)} />
          <div className="space-y-2">
            <Label htmlFor={`staff-name-${fieldId}`}>Name</Label>
            <Input
              id={`staff-name-${fieldId}`}
              name="name"
              defaultValue={staff?.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`staff-username-${fieldId}`}>Username</Label>
            <Input
              id={`staff-username-${fieldId}`}
              name="username"
              type="text"
              autoComplete="off"
              defaultValue={staff?.username}
              minLength={3}
              maxLength={32}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`staff-password-${fieldId}`}>Password</Label>
            <Input
              id={`staff-password-${fieldId}`}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={staff ? undefined : 6}
              required={!staff}
            />
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
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No staff yet.
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.username}</TableCell>
                    <TableCell>{member.roleName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={member.isActive ? "default" : "secondary"}>
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <StaffFormSheet staff={member}>
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
