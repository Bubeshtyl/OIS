"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { formatTicketNumberWithSettings } from "@/lib/tickets/format";
import type { Team, Ticket, TicketStatus } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function TicketsList({
  tickets,
  teams,
  settings,
}: {
  tickets: Array<Ticket & { team: Team }>;
  teams: Team[];
  settings: { prefix: string; paddingWidth: number };
}) {
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const counts = useMemo(() => {
    const base: Record<TicketStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    for (const ticket of tickets) {
      base[ticket.status] += 1;
    }
    return base;
  }, [tickets]);

  const filtered = tickets.filter((ticket) => {
    if (teamFilter !== "ALL" && ticket.teamId !== teamFilter) return false;
    if (statusFilter !== "ALL" && ticket.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        {STATUSES.map((status) => (
          <Badge key={status} variant="secondary">
            {counts[status]} {STATUS_LABELS[status]}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={teamFilter}
          onValueChange={(value) => value && setTeamFilter(value)}
          items={[
            { value: "ALL", label: "All teams" },
            ...teams.map((team) => ({ value: team.id, label: team.name })),
          ]}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => value && setStatusFilter(value)}
          items={[
            { value: "ALL", label: "All statuses" },
            ...STATUSES.map((status) => ({
              value: status,
              label: STATUS_LABELS[status],
            })),
          ]}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket #</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Summary</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No tickets found.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((ticket) => {
            const summary = ticket.answers[0]?.answer ?? "—";
            return (
              <TableRow key={ticket.id}>
                <TableCell>
                  <Link href={`/tickets/${ticket.id}`} className="font-medium underline-offset-2 hover:underline">
                    {formatTicketNumberWithSettings(
                      ticket.ticketSeq,
                      settings.prefix,
                      settings.paddingWidth
                    )}
                  </Link>
                </TableCell>
                <TableCell>{ticket.team.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{STATUS_LABELS[ticket.status]}</Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">{summary}</TableCell>
                <TableCell>{ticket.requesterName}</TableCell>
                <TableCell>{formatDateTime(ticket.createdAt)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
