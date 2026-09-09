"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { exitAssumePrimeAction } from "@/lib/actions/platform";
import { Button } from "@/components/ui/button";

export function AssumePrimeBanner({
  tenantName,
}: {
  tenantName: string;
}) {
  const [pending, startTransition] = useTransition();

  function onExit() {
    startTransition(async () => {
      const result = await exitAssumePrimeAction();
      if (result && !result.success) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-1 flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm">
      <span>
        Acting as Prime for{" "}
        <span className="font-medium">{tenantName}</span>
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={onExit}
      >
        {pending ? "…" : "Exit to Platform"}
      </Button>
    </div>
  );
}
