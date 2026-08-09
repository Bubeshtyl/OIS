import Link from "next/link";
import { PageHeader } from "@/components/shared/page-blocks";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReceiveOtherDealersPage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="Other dealers" />
        <Link
          href="/receive"
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          Back to Stock Received
        </Link>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <p className="font-medium">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
