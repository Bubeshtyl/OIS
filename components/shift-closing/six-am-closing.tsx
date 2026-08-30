"use client";

import { useState } from "react";
import { Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function SixAmShiftClosingForm({
  todayDate,
}: {
  todayDate: string;
}) {
  const [prices, setPrices] = useState({
    ms: "",
    hsd: "",
    speed: "",
  });
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prices.ms || !prices.hsd || !prices.speed) {
      toast.error("Please enter daily prices for MS, HSD, and SPEED.");
      return;
    }
    setSaved(true);
    toast.success("Daily fuel prices saved successfully!");
  }

  return (
    <div className="space-y-6">
      <Card className="border shadow-xs">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Uneditable Date */}
            <div className="space-y-2">
              <Label htmlFor="closing-date" className="text-sm font-medium">
                Date
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="closing-date"
                  type="text"
                  value={todayDate}
                  readOnly
                  disabled
                  className="h-11 pl-10 bg-muted/50 font-medium cursor-not-allowed select-none text-foreground"
                />
              </div>
            </div>

            {/* 3 Price Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* MS (Petrol) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price-ms" className="text-sm font-semibold text-foreground">
                    MS
                  </Label>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Petrol
                  </Badge>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="price-ms"
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices.ms}
                    onChange={(e) => {
                      setPrices((prev) => ({ ...prev, ms: e.target.value }));
                      setSaved(false);
                    }}
                    required
                    className="h-12 pl-8 text-base font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* HSD (Diesel) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price-hsd" className="text-sm font-semibold text-foreground">
                    HSD
                  </Label>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                    Diesel
                  </Badge>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="price-hsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices.hsd}
                    onChange={(e) => {
                      setPrices((prev) => ({ ...prev, hsd: e.target.value }));
                      setSaved(false);
                    }}
                    required
                    className="h-12 pl-8 text-base font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* SPEED */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price-speed" className="text-sm font-semibold text-foreground">
                    SPEED
                  </Label>
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300">
                    Speed
                  </Badge>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="price-speed"
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices.speed}
                    onChange={(e) => {
                      setPrices((prev) => ({ ...prev, speed: e.target.value }));
                      setSaved(false);
                    }}
                    required
                    className="h-12 pl-8 text-base font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" size="lg" className="h-11 w-full sm:w-auto px-8 font-semibold">
                <CheckCircle2 className="mr-2 size-4" />
                Save Prices
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
