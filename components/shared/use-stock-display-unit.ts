"use client";

import { useCallback, useEffect, useState } from "react";
import type { StockDisplayUnit } from "@/lib/format";

function readUnitFromUrl(): StockDisplayUnit {
  if (typeof window === "undefined") return "packets";
  const params = new URLSearchParams(window.location.search);
  return params.get("unit") === "litres" ? "litres" : "packets";
}

function writeUnitToUrl(unit: StockDisplayUnit) {
  const url = new URL(window.location.href);
  if (unit === "litres") {
    url.searchParams.set("unit", "litres");
  } else {
    url.searchParams.delete("unit");
  }
  window.history.replaceState(window.history.state, "", url);
}

export function useStockDisplayUnit(initialUnit: StockDisplayUnit) {
  const [unit, setUnit] = useState(initialUnit);

  useEffect(() => {
    setUnit(initialUnit);
  }, [initialUnit]);

  useEffect(() => {
    function handlePopState() {
      setUnit(readUnitFromUrl());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setDisplayUnit = useCallback((next: StockDisplayUnit) => {
    setUnit(next);
    writeUnitToUrl(next);
  }, []);

  return { unit, setDisplayUnit };
}
