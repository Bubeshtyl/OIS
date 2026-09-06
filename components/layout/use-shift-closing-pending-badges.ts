"use client";

import { useCallback, useEffect, useState } from "react";
import { getPendingEditRequestBadgeCountsAction } from "@/lib/actions/shift-closing";
import type { ShiftClosingPendingBadgeCounts } from "@/lib/shift-closing/ledger";

const POLL_INTERVAL_MS = 45_000;

const EMPTY_COUNTS: ShiftClosingPendingBadgeCounts = { rsp: 0, ledger: 0 };

export function useShiftClosingPendingBadges(
  initialCounts: ShiftClosingPendingBadgeCounts = EMPTY_COUNTS,
  isAdmin = false
) {
  const [counts, setCounts] = useState(initialCounts);

  const refresh = useCallback(async () => {
    const res = await getPendingEditRequestBadgeCountsAction();
    if (res.success && res.data) {
      setCounts((prev) => {
        if (prev.rsp === res.data!.rsp && prev.ledger === res.data!.ledger) {
          return prev;
        }
        return res.data!;
      });
    }
  }, []);

  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => {
    if (!isAdmin) return;

    // Defer first poll so it does not compete with first paint / interactions.
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 2_500);

    const intervalId = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [isAdmin, refresh]);

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
