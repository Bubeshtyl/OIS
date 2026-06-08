"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

function toAppliedRange(startDate: string, endDate: string): DateRange {
  return {
    from: calendarDateFromIstString(startDate),
    to: calendarDateFromIstString(endDate),
  };
}

export function DateRangePicker({
  startDate,
  endDate,
  defaultStart,
  defaultEnd,
  extraParams,
  className,
}: {
  startDate: string;
  endDate: string;
  defaultStart: string;
  defaultEnd: string;
  extraParams?: Record<string, string>;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    toAppliedRange(startDate, endDate)
  );

  const isDefault = startDate === defaultStart && endDate === defaultEnd;
  const canApply = Boolean(draftRange?.from && draftRange?.to);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraftRange(toAppliedRange(startDate, endDate));
    }
    setOpen(nextOpen);
  }

  function applyDraft() {
    if (!draftRange?.from || !draftRange?.to) return;

    const start = istDateStringFromCalendarDate(draftRange.from);
    const end = istDateStringFromCalendarDate(draftRange.to);
    const params = new URLSearchParams(searchParams.toString());

    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value);
      }
    }

    if (start !== defaultStart || end !== defaultEnd) {
      params.set("start", start);
      params.set("end", end);
    } else {
      params.delete("start");
      params.delete("end");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  }

  function resetToDefault() {
    setDraftRange(toAppliedRange(defaultStart, defaultEnd));
    const params = new URLSearchParams(searchParams.toString());
    params.delete("start");
    params.delete("end");
    params.delete("page");

    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value);
      }
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
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

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={className ?? "h-11 w-full min-w-0 justify-start gap-2 bg-card font-normal shadow-sm"}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">
              {formatRangeLabel(startDate, endDate)}
            </span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="range"
          defaultMonth={calendarDateFromIstString(startDate)}
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
          {!isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={resetToDefault}
            >
              Reset to this month
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
