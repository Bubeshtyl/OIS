"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function SalesAnalyticsFilters({
  initialStart,
  initialEnd,
}: {
  initialStart?: string;
  initialEnd?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setStart(initialStart);
    setEnd(initialEnd);
    setPending(false);
  }, [initialStart, initialEnd]);

  const canApply = Boolean(
    start &&
      end &&
      DATETIME_RE.test(start) &&
      DATETIME_RE.test(end)
  );

  function apply() {
    if (!canApply || pending) return;
    setPending(true);
    const params = new URLSearchParams();
    params.set("start", start!);
    params.set("end", end!);
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearAll() {
    if (pending) return;
    setStart(undefined);
    setEnd(undefined);
    setPending(true);
    router.push(pathname);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 bg-sidebar px-3 py-2.5 text-sidebar-foreground sm:px-4">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
          Filter sales
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={clearAll}
          >
            Clear all
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-sm"
            disabled={!canApply || pending}
            onClick={apply}
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" />
                Loading…
              </>
            ) : (
              "Apply"
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">
        <section className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 space-y-1">
              <Label
                htmlFor="sda-start"
                className="text-xs text-muted-foreground"
              >
                Start (date &amp; time)
              </Label>
              <DateTimePicker
                id="sda-start"
                value={start}
                onChange={setStart}
                placeholder="Start date & time"
                defaultTime="06:00"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <Label
                htmlFor="sda-end"
                className="text-xs text-muted-foreground"
              >
                End (date &amp; time)
              </Label>
              <DateTimePicker
                id="sda-end"
                value={end}
                onChange={setEnd}
                placeholder="End date & time"
                defaultTime="06:00"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
