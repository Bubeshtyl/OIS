"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getPendingEditRequestBadgeCountsAction } from "@/lib/actions/shift-closing";
import type { ShiftClosingPendingBadgeCounts } from "@/lib/shift-closing/ledger";

const POLL_INTERVAL_MS = 45_000;

const EMPTY_COUNTS: ShiftClosingPendingBadgeCounts = { rsp: 0, ledger: 0 };

export function useShiftClosingPendingBadges(
  initialCounts: ShiftClosingPendingBadgeCounts = EMPTY_COUNTS
) {
  const pathname = usePathname();
  const [counts, setCounts] = useState(initialCounts);

  const refresh = useCallback(async () => {
    const res = await getPendingEditRequestBadgeCountsAction();
    if (res.success && res.data) {
      setCounts(res.data);
    }
  }, []);

  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => {
    refresh();
    const intervalId = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [refresh, pathname]);

  return counts;
}

export function pendingBadgeCountForHref(
  href: string,
  counts: ShiftClosingPendingBadgeCounts
): number {
  if (href === "/shift-closing/rsp") return counts.rsp;
  if (href === "/shift-closing/ledger") return counts.ledger;
  return 0;
}
