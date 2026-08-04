"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SystemUser, TeamWithManager } from "@/lib/teams/service";
import { saveTeamAction } from "@/lib/actions/teams";
import type { ActionState } from "@/lib/actions/inventory";
import { UsersAdmin } from "@/components/admin/users-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

function TeamFormSheet({
  team,
  children,
}: {
  team?: TeamWithManager;
  children: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveTeamAction,
    initialState
  );
  const [isActive, setIsActive] = useState(team?.isActive ?? true);

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
      <DialogTrigger render={children} />
      <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{team ? "Edit Team" : "Add Team"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {team && <input type="hidden" name="id" value={team.id} />}
          {team?.manager && (
            <input
              type="hidden"
              name="managerUserId"
              value={team.manager.id}
            />
          )}
          <input type="hidden" name="isActive" value={String(isActive)} />

          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-medium">Team</p>
            <div className="space-y-2">
              <Label htmlFor="name">Team name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={team?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegramChatId">Telegram Chat ID *</Label>
              <p className="text-xs text-muted-foreground">
                Add the bot to this team&apos;s Telegram group, then find the
                group&apos;s chat id (a negative number, e.g. -1001234567890).
              </p>
              <Input
                id="telegramChatId"
                name="telegramChatId"
                defaultValue={team?.telegramChatId}
                required
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-medium">Manager login</p>
            <div className="space-y-2">
              <Label htmlFor="managerName">Name *</Label>
              <Input
                id="managerName"
                name="managerName"
                defaultValue={team?.manager?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerUsername">Username *</Label>
              <Input
                id="managerUsername"
                name="managerUsername"
                type="text"
                autoComplete="off"
                defaultValue={team?.manager?.username}
                pattern="[a-zA-Z0-9_]{3,32}"
                title="3–32 characters: letters, numbers, and underscores only"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerPassword">
                Password{team?.manager ? "" : " *"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {team?.manager
                  ? "Leave blank to keep the current password."
                  : "Required for new manager logins."}
              </p>
              <Input
                id="managerPassword"
                name="managerPassword"
                type="password"
                required={!team?.manager}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
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

export function TeamsAdmin({
  teams,
  systemUsers,
  roleOptions,
}: {
  teams: TeamWithManager[];
  systemUsers: SystemUser[];
  roleOptions: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-10">
      <div>
        <div className="mb-4 flex justify-end">
          <TeamFormSheet>
            <Button className="min-h-11">+ Add team</Button>
          </TeamFormSheet>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Telegram Chat ID</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell>{team.name}</TableCell>
                <TableCell>{team.telegramChatId}</TableCell>
                <TableCell>{team.manager?.name ?? "—"}</TableCell>
                <TableCell>{team.manager?.username ?? "—"}</TableCell>
                <TableCell>{team.isActive ? "Active" : "Inactive"}</TableCell>
                <TableCell>
                  <TeamFormSheet team={team}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </TeamFormSheet>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {systemUsers.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">System users</h2>
            <p className="text-sm text-muted-foreground">
              Admin and accounts logins that are not tied to a team.
            </p>
          </div>
          <UsersAdmin users={systemUsers} roleOptions={roleOptions} />
        </div>
      )}
    </div>
  );
}
