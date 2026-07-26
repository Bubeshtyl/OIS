"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveTicketSettingsAction } from "@/lib/actions/settings";
import type { ActionState } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false };

export function TicketSettingsForm({
  settings,
}: {
  settings: { prefix: string; paddingWidth: number; accessCode: string | null };
}) {
  const [state, formAction, pending] = useActionState(
    saveTicketSettingsAction,
    initialState
  );

  useEffect(() => {
    if (state.success) toast.success(state.message);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className="max-w-sm space-y-3 rounded-xl border bg-card p-4"
    >
      <div className="space-y-2">
        <Label htmlFor="prefix">Ticket number prefix *</Label>
        <Input
          id="prefix"
          name="prefix"
          defaultValue={settings.prefix}
          maxLength={20}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paddingWidth">Digits *</Label>
        <Input
          id="paddingWidth"
          name="paddingWidth"
          type="number"
          min={1}
          max={10}
          defaultValue={settings.paddingWidth}
          required
        />
        <p className="text-xs text-muted-foreground">
          e.g. {settings.prefix}-{"0".repeat(settings.paddingWidth - 1)}1
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="accessCode">Bot access code</Label>
        <Input
          id="accessCode"
          name="accessCode"
          defaultValue={settings.accessCode ?? ""}
          placeholder="Leave blank to allow anyone to use the bot"
        />
        <p className="text-xs text-muted-foreground">
          When set, the bot asks for this code before showing the team
          picker. Leave blank to remove the restriction.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        Save
      </Button>
    </form>
  );
}
