"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  calendarDateFromIstString,
  istDateStringFromCalendarDate,
} from "@/lib/date-range";
import { cn } from "@/lib/utils";

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function splitDateTime(value: string | undefined, defaultTime: string) {
  if (!value || !DATETIME_RE.test(value)) {
    return { date: "", time: defaultTime };
  }
  const [date, time] = value.split("T");
  return { date, time };
}

function formatDisplay(value?: string) {
  if (!value || !DATETIME_RE.test(value)) return null;
  const [date, time] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const display = new Date(y, m - 1, d, hh, mm);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(display);
}

export function DateTimePicker({
  value,
  onChange,
  id,
  placeholder = "Pick date & time",
  defaultTime = "00:00",
  className,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  id?: string;
  placeholder?: string;
  /** Used when picking a date before a time is set (start=00:00, end=23:59). */
  defaultTime?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { date, time } = splitDateTime(value, defaultTime);
  const selected = date ? calendarDateFromIstString(date) : undefined;
  const label = formatDisplay(value);

  function commit(nextDate: string, nextTime: string) {
    if (!nextDate) {
      onChange(undefined);
      return;
    }
    onChange(`${nextDate}T${nextTime || defaultTime}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-7 w-full justify-start gap-2 rounded-sm bg-background px-2 font-normal text-xs",
              !label && "text-muted-foreground",
              className
            )}
          >
            <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs">{label ?? placeholder}</span>
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(picked) => {
            if (!picked) return;
            // Keep an explicitly chosen time; otherwise use start/end default.
            const nextTime = value ? time : defaultTime;
            commit(istDateStringFromCalendarDate(picked), nextTime);
          }}
          defaultMonth={selected}
        />
        <div className="space-y-1.5 border-t p-2.5">
          <Label
            htmlFor={`${id ?? "dt"}-time`}
            className="text-[11px] text-muted-foreground"
          >
            Time
          </Label>
          <Input
            id={`${id ?? "dt"}-time`}
            type="time"
            value={time}
            onChange={(event) => {
              const nextTime = event.target.value || defaultTime;
              if (!date) {
                const today = istDateStringFromCalendarDate(new Date());
                commit(today, nextTime);
                return;
              }
              commit(date, nextTime);
            }}
            className="h-7 w-full rounded-sm bg-background px-2 text-xs md:text-xs"
          />
          <div className="flex gap-1.5 pt-0.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="flex-1 rounded-sm"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="xs"
              className="flex-1 rounded-sm"
              onClick={() => setOpen(false)}
              disabled={!value}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
