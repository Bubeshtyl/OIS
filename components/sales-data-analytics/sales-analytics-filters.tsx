"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANALYTICS_METRICS,
  type AnalyticsMetric,
} from "@/lib/daily-sales/analytics-period";
import {
  DEFAULT_FOOTFALL_END_TIME,
  DEFAULT_FOOTFALL_START_TIME,
  MAX_AMOUNT_RANGES,
  parseAmountRangesParam,
  serializeAmountRanges,
  type AmountRange,
} from "@/lib/daily-sales/footfall-filters";

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const METRIC_ITEMS = [
  { value: "footfall", label: "Footfall" },
  { value: "footfall-by-price", label: "Footfall by price" },
  { value: "sales", label: "Sales" },
] as const;

type RangeDraft = { min: string; max: string };

function rangesToDrafts(ranges: AmountRange[]): RangeDraft[] {
  if (ranges.length === 0) return [{ min: "", max: "" }];
  return ranges.map((range) => ({
    min: String(range.min),
    max: String(range.max),
  }));
}

function draftsToRanges(drafts: RangeDraft[]): AmountRange[] {
  const ranges: AmountRange[] = [];
  for (const draft of drafts) {
    const min = Number(draft.min);
    const max = Number(draft.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) continue;
    ranges.push({ min, max });
    if (ranges.length >= MAX_AMOUNT_RANGES) break;
  }
  return ranges;
}

export function SalesAnalyticsFilters({
  initialMetric,
  initialStart,
  initialEnd,
  initialStartDate,
  initialEndDate,
  initialStartTime,
  initialEndTime,
  initialRanges,
}: {
  initialMetric: AnalyticsMetric;
  initialStart?: string;
  initialEnd?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialRanges?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [metric, setMetric] = useState<AnalyticsMetric>(initialMetric);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [startTime, setStartTime] = useState(
    initialStartTime ?? DEFAULT_FOOTFALL_START_TIME
  );
  const [endTime, setEndTime] = useState(
    initialEndTime ?? DEFAULT_FOOTFALL_END_TIME
  );
  const [rangeDrafts, setRangeDrafts] = useState<RangeDraft[]>(() =>
    rangesToDrafts(parseAmountRangesParam(initialRanges))
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setMetric(initialMetric);
    setStart(initialStart);
    setEnd(initialEnd);
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
    setStartTime(initialStartTime ?? DEFAULT_FOOTFALL_START_TIME);
    setEndTime(initialEndTime ?? DEFAULT_FOOTFALL_END_TIME);
    setRangeDrafts(rangesToDrafts(parseAmountRangesParam(initialRanges)));
    setPending(false);
  }, [
    initialMetric,
    initialStart,
    initialEnd,
    initialStartDate,
    initialEndDate,
    initialStartTime,
    initialEndTime,
    initialRanges,
  ]);

  const validPriceRanges = draftsToRanges(rangeDrafts);

  const canApplyFootfall = Boolean(
    startDate &&
      endDate &&
      DATE_RE.test(startDate) &&
      DATE_RE.test(endDate) &&
      TIME_RE.test(startTime) &&
      TIME_RE.test(endTime) &&
      startTime <= endTime
  );

  const canApplyFootfallByPrice = Boolean(
    startDate &&
      endDate &&
      DATE_RE.test(startDate) &&
      DATE_RE.test(endDate) &&
      validPriceRanges.length > 0
  );

  const canApplySales = Boolean(
    start && end && DATETIME_RE.test(start) && DATETIME_RE.test(end)
  );

  const canApply =
    metric === "footfall"
      ? canApplyFootfall
      : metric === "footfall-by-price"
        ? canApplyFootfallByPrice
        : canApplySales;

  function setMetricParam(params: URLSearchParams, nextMetric: AnalyticsMetric) {
    if (nextMetric === "footfall") {
      params.delete("metric");
    } else {
      params.set("metric", nextMetric);
    }
  }

  function clearCrossMetricParams(
    params: URLSearchParams,
    nextMetric: AnalyticsMetric
  ) {
    if (nextMetric === "footfall") {
      params.delete("start");
      params.delete("end");
      params.delete("granularity");
      params.delete("ranges");
    } else if (nextMetric === "footfall-by-price") {
      params.delete("start");
      params.delete("end");
      params.delete("granularity");
      params.delete("startTime");
      params.delete("endTime");
    } else {
      params.delete("startDate");
      params.delete("endDate");
      params.delete("startTime");
      params.delete("endTime");
      params.delete("product");
      params.delete("ranges");
    }
  }

  function pushClear() {
    router.push(pathname);
  }

  function pushMetricOnly(nextMetric: AnalyticsMetric) {
    const params = new URLSearchParams();
    setMetricParam(params, nextMetric);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function pushFootfallApply() {
    const params = new URLSearchParams();
    setMetricParam(params, "footfall");
    clearCrossMetricParams(params, "footfall");
    params.set("startDate", startDate!);
    params.set("endDate", endDate!);
    if (startTime !== DEFAULT_FOOTFALL_START_TIME) {
      params.set("startTime", startTime);
    }
    if (endTime !== DEFAULT_FOOTFALL_END_TIME) {
      params.set("endTime", endTime);
    }
    const product = searchParams.get("product");
    if (product) params.set("product", product);
    router.push(`${pathname}?${params.toString()}`);
  }

  function pushFootfallByPriceApply() {
    const params = new URLSearchParams();
    setMetricParam(params, "footfall-by-price");
    clearCrossMetricParams(params, "footfall-by-price");
    params.set("startDate", startDate!);
    params.set("endDate", endDate!);
    params.set("ranges", serializeAmountRanges(validPriceRanges));
    const product = searchParams.get("product");
    if (product) params.set("product", product);
    router.push(`${pathname}?${params.toString()}`);
  }

  function pushSalesApply() {
    const params = new URLSearchParams();
    setMetricParam(params, "sales");
    clearCrossMetricParams(params, "sales");
    params.set("start", start!);
    params.set("end", end!);
    const granularity = searchParams.get("granularity");
    if (granularity) params.set("granularity", granularity);
    router.push(`${pathname}?${params.toString()}`);
  }

  function onMetricChange(value: string | null) {
    if (!value || !(ANALYTICS_METRICS as readonly string[]).includes(value)) {
      return;
    }
    const next = value as AnalyticsMetric;
    setMetric(next);
    setPending(true);
    pushMetricOnly(next);
  }

  function apply() {
    if (!canApply || pending) return;
    setPending(true);
    if (metric === "footfall") {
      pushFootfallApply();
    } else if (metric === "footfall-by-price") {
      pushFootfallByPriceApply();
    } else {
      pushSalesApply();
    }
  }

  function clearAll() {
    if (pending) return;
    setMetric("footfall");
    setStart(undefined);
    setEnd(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime(DEFAULT_FOOTFALL_START_TIME);
    setEndTime(DEFAULT_FOOTFALL_END_TIME);
    setRangeDrafts([{ min: "", max: "" }]);
    setPending(true);
    pushClear();
  }

  function updateRangeDraft(
    index: number,
    key: "min" | "max",
    value: string
  ) {
    setRangeDrafts((current) =>
      current.map((draft, i) =>
        i === index ? { ...draft, [key]: value } : draft
      )
    );
  }

  function addRange() {
    setRangeDrafts((current) =>
      current.length >= MAX_AMOUNT_RANGES
        ? current
        : [...current, { min: "", max: "" }]
    );
  }

  function removeRange(index: number) {
    setRangeDrafts((current) => {
      if (current.length <= 1) return [{ min: "", max: "" }];
      return current.filter((_, i) => i !== index);
    });
  }

  const dateFields = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="min-w-0 space-y-1">
        <Label
          htmlFor="sda-start-date"
          className="text-xs text-muted-foreground"
        >
          From date
        </Label>
        <DatePicker
          id="sda-start-date"
          value={startDate}
          onChange={setStartDate}
          placeholder="From date"
          className="h-10"
        />
      </div>
      <div className="min-w-0 space-y-1">
        <Label htmlFor="sda-end-date" className="text-xs text-muted-foreground">
          To date
        </Label>
        <DatePicker
          id="sda-end-date"
          value={endDate}
          onChange={setEndDate}
          placeholder="To date"
          className="h-10"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1 sm:w-[14rem]">
          <Label htmlFor="sda-metric" className="text-xs text-muted-foreground">
            Metric
          </Label>
          <Select
            value={metric}
            onValueChange={onMetricChange}
            items={METRIC_ITEMS.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
          >
            <SelectTrigger
              id="sda-metric"
              className="h-10 w-full min-w-0 bg-card"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
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

      {metric === "footfall" ? (
        <>
          {dateFields}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <Label
                htmlFor="sda-start-time"
                className="text-xs text-muted-foreground"
              >
                From time
              </Label>
              <Input
                id="sda-start-time"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="h-10 bg-card"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <Label
                htmlFor="sda-end-time"
                className="text-xs text-muted-foreground"
              >
                To time
              </Label>
              <Input
                id="sda-end-time"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="h-10 bg-card"
              />
            </div>
          </div>

          {startTime && endTime && startTime > endTime ? (
            <p className="text-xs text-destructive">
              From time must not be after To time.
            </p>
          ) : null}
        </>
      ) : metric === "footfall-by-price" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_2.5rem]">
            <div className="min-w-0 space-y-1">
              <Label
                htmlFor="sda-start-date"
                className="text-xs text-muted-foreground"
              >
                From date
              </Label>
              <DatePicker
                id="sda-start-date"
                value={startDate}
                onChange={setStartDate}
                placeholder="From date"
                className="h-10 shadow-none"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <Label
                htmlFor="sda-end-date"
                className="text-xs text-muted-foreground"
              >
                To date
              </Label>
              <DatePicker
                id="sda-end-date"
                value={endDate}
                onChange={setEndDate}
                placeholder="To date"
                className="h-10 shadow-none"
              />
            </div>
            <div className="hidden h-10 sm:block" aria-hidden />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">
              Amount ranges (net amount)
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={rangeDrafts.length >= MAX_AMOUNT_RANGES}
              onClick={addRange}
            >
              <Plus data-icon="inline-start" />
              Add range
            </Button>
          </div>

          <div className="grid grid-cols-1 items-end gap-x-3 gap-y-2 sm:grid-cols-[1fr_1fr_2.5rem]">
            <Label
              htmlFor="sda-range-min-0"
              className="text-xs text-muted-foreground sm:col-start-1"
            >
              Min
            </Label>
            <Label
              htmlFor="sda-range-max-0"
              className="text-xs text-muted-foreground sm:col-start-2"
            >
              Max
            </Label>
            <div className="hidden sm:block sm:col-start-3" aria-hidden />

            {rangeDrafts.map((draft, index) => (
              <div
                key={index}
                className="contents"
              >
                <Input
                  id={`sda-range-min-${index}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={draft.min}
                  onChange={(event) =>
                    updateRangeDraft(index, "min", event.target.value)
                  }
                  placeholder="e.g. 10"
                  className="h-10 min-w-0 bg-card"
                  aria-label={`Range ${index + 1} min`}
                />
                <Input
                  id={`sda-range-max-${index}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={draft.max}
                  onChange={(event) =>
                    updateRangeDraft(index, "max", event.target.value)
                  }
                  placeholder="e.g. 12"
                  className="h-10 min-w-0 bg-card"
                  aria-label={`Range ${index + 1} max`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-10 w-10 justify-self-end sm:justify-self-center"
                  disabled={rangeDrafts.length <= 1}
                  onClick={() => removeRange(index)}
                  aria-label={`Remove range ${index + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>

          {rangeDrafts.some(
            (draft) =>
              draft.min !== "" &&
              draft.max !== "" &&
              Number(draft.min) >= Number(draft.max)
          ) ? (
            <p className="text-xs text-destructive">
              Each range max must be greater than min.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="sda-start" className="text-xs text-muted-foreground">
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
            <Label htmlFor="sda-end" className="text-xs text-muted-foreground">
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
      )}
    </div>
  );
}
