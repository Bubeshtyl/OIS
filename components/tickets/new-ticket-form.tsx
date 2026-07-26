"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Team, TicketQuestion } from "@/lib/db/schema";
import { createTicketAction } from "@/lib/actions/tickets";
import type { ActionState } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function NewTicketForm({
  teams,
  questions,
  defaultRequesterName,
}: {
  teams: Team[];
  questions: TicketQuestion[];
  defaultRequesterName: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createTicketAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push("/tickets");
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  if (teams.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active teams are configured yet. Add one in Admin → Teams first.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border bg-card p-4"
    >
      <div className="space-y-2">
        <Label htmlFor="requesterName">Requester name *</Label>
        <Input
          id="requesterName"
          name="requesterName"
          defaultValue={defaultRequesterName}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="teamId">Team *</Label>
        <Select
          name="teamId"
          required
          items={teams.map((t) => ({ value: t.id, label: t.name }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {questions.map((question) => (
        <div key={question.id} className="space-y-2">
          <Label htmlFor={`q_${question.id}`}>{question.prompt} *</Label>
          {question.answerType === "CHOICE" ? (
            <Select
              name={`q_${question.id}`}
              required
              items={(question.choices ?? []).map((choice) => ({
                value: choice,
                label: choice,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an option" />
              </SelectTrigger>
              <SelectContent>
                {(question.choices ?? []).map((choice) => (
                  <SelectItem key={choice} value={choice}>
                    {choice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Textarea id={`q_${question.id}`} name={`q_${question.id}`} rows={2} />
          )}
        </div>
      ))}

      <Button type="submit" disabled={pending}>
        Create Ticket
      </Button>
    </form>
  );
}
