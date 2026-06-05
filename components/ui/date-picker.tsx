"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { IST_TIMEZONE } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseDateString(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toDateString(date: Date) {
  return formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd");
}

function formatDisplayDate(date: string) {
  return formatInTimeZone(parseDateString(date), IST_TIMEZONE, "d MMM yyyy");
}

export function DatePicker({
  value,
  onChange,
  today,
  className,
}: {
  value: string;
  onChange: (date: string) => void;
  today?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDateString(value);

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    onChange(toDateString(date));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-2 bg-card font-normal shadow-sm",
              className
            )}
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            {formatDisplayDate(value)}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
        />
        {today && value !== today && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
            >
              Go to today
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
