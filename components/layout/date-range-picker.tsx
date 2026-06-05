"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  formatRangeLabel,
  parseIstDate,
  toIstDateString,
} from "@/lib/date-range";

function toAppliedRange(startDate: string, endDate: string): DateRange {
  return {
    from: parseIstDate(startDate),
    to: parseIstDate(endDate),
  };
}

export function DateRangePicker({
  startDate,
  endDate,
  defaultStart,
  defaultEnd,
}: {
  startDate: string;
  endDate: string;
  defaultStart: string;
  defaultEnd: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
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

    const start = toIstDateString(draftRange.from);
    const end = toIstDateString(draftRange.to);
    const params = new URLSearchParams();

    if (start !== defaultStart || end !== defaultEnd) {
      params.set("start", start);
      params.set("end", end);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  }

  function resetToDefault() {
    setDraftRange(toAppliedRange(defaultStart, defaultEnd));
    router.push(pathname);
    setOpen(false);
  }

  const helperText = !draftRange?.from
    ? "Select a start date"
    : !draftRange?.to
      ? "Select an end date"
      : formatRangeLabel(
          toIstDateString(draftRange.from),
          toIstDateString(draftRange.to)
        );

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 bg-card shadow-sm"
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="max-w-[14rem] truncate">
              {formatRangeLabel(startDate, endDate)}
            </span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="range"
          defaultMonth={parseIstDate(startDate)}
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
