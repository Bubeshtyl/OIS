"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Ticket, TicketStatus } from "@/lib/db/schema";
import { updateTicketStatusAction } from "@/lib/actions/tickets";
import type { ActionState } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: ActionState = { success: false };

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export function TicketStatusForm({ ticket }: { ticket: Ticket }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateTicketStatusAction,
    initialState
  );
  const [status, setStatus] = useState<TicketStatus>(ticket.status);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3 rounded-xl border bg-card p-4">
      <input type="hidden" name="id" value={ticket.id} />
      <input type="hidden" name="status" value={status} />

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={status}
          onValueChange={(value) => value && setStatus(value as TicketStatus)}
          items={STATUS_OPTIONS}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="resolutionNote">Resolution note</Label>
        <Textarea
          id="resolutionNote"
          name="resolutionNote"
          defaultValue={ticket.resolutionNote ?? ""}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={pending}>
        Save
      </Button>
    </form>
  );
}
