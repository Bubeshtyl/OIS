"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  calendarDateFromIstString,
  formatRangeLabel,
  istDateStringFromCalendarDate,
} from "@/lib/date-range";
import { cn } from "@/lib/utils";

function toDateRange(startDate: string, endDate: string): DateRange | undefined {
  if (!startDate && !endDate) return undefined;
  return {
    from: startDate ? calendarDateFromIstString(startDate) : undefined,
    to: endDate ? calendarDateFromIstString(endDate) : undefined,
  };
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  disabled,
  placeholder = "Pick date range",
  className,
}: {
  startDate: string;
  endDate: string;
  onChange: (range: { start: string; end: string }) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    toDateRange(startDate, endDate)
  );

  const hasValue = Boolean(startDate && endDate);
  const canApply = Boolean(draftRange?.from && draftRange?.to);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraftRange(toDateRange(startDate, endDate));
    }
    setOpen(nextOpen);
  }

  function applyDraft() {
    if (!draftRange?.from || !draftRange?.to) return;
    const start = istDateStringFromCalendarDate(draftRange.from);
    const end = istDateStringFromCalendarDate(draftRange.to);
    if (start <= end) {
      onChange({ start, end });
    } else {
      onChange({ start: end, end: start });
    }
    setOpen(false);
  }

  function clearRange() {
    onChange({ start: "", end: "" });
    setDraftRange(undefined);
    setOpen(false);
  }

  const helperText = !draftRange?.from
    ? "Select a start date"
    : !draftRange?.to
      ? "Select an end date"
      : formatRangeLabel(
          istDateStringFromCalendarDate(draftRange.from),
          istDateStringFromCalendarDate(draftRange.to)
        );

  const trigger = (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      className={cn(
        "h-8 w-full justify-start gap-2 bg-card font-normal shadow-sm",
        !hasValue && "text-muted-foreground",
        className
      )}
    >
      <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">
        {hasValue ? formatRangeLabel(startDate, endDate) : placeholder}
      </span>
    </Button>
  );

  if (disabled) {
    return trigger;
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          defaultMonth={
            startDate
              ? calendarDateFromIstString(startDate)
              : draftRange?.from
          }
          selected={draftRange}
          onSelect={setDraftRange}
          numberOfMonths={2}
        />
        <div className="space-y-2 border-t p-3">
          <p className="text-xs text-muted-foreground">{helperText}</p>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canApply}
              onClick={applyDraft}
            >
              OK
            </Button>
          </div>
          {hasValue ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={clearRange}
            >
              Clear range
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
