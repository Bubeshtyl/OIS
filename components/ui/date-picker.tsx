"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

export function DatePicker({
  value,
  onChange,
  today,
  id,
  name,
  required,
  disabled,
  placeholder = "Pick date",
  className,
}: {
  value?: string;
  onChange: (date: string) => void;
  today?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasValue = Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
  const selected = hasValue ? calendarDateFromIstString(value!) : undefined;

  function handleSelect(date: Date | undefined) {
    if (!date || disabled) return;
    onChange(istDateStringFromCalendarDate(date));
    setOpen(false);
  }

  const trigger = (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      className={cn(
        "h-11 w-full justify-start gap-2 bg-card font-normal shadow-sm",
        !hasValue && "text-muted-foreground",
        className
      )}
    >
      <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">
        {hasValue ? formatRangeLabel(value!, value!) : placeholder}
      </span>
    </Button>
  );

  return (
    <>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={value ?? ""}
          required={required}
          disabled={disabled}
        />
      ) : null}
      {disabled ? (
        <div id={id}>{trigger}</div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger id={id} render={trigger} />
          <PopoverContent align="start" className="w-auto p-0">
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
      )}
    </>
  );
}
