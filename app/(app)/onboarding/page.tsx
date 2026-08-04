import { redirect } from "next/navigation";
import { StationProfileForm } from "@/components/onboarding/station-profile-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { completeOnboardingAction } from "@/lib/actions/onboarding";
import { getOnboardingTenant } from "@/lib/actions/onboarding";
import { getDefaultPath } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const tenant = await getOnboardingTenant();
  if (!tenant) {
    redirect(await getDefaultPath(session));
  }

  if (tenant.onboardingComplete) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Welcome"
        subtitle="Add your petrol station name and address to finish setup."
      />
      <StationProfileForm
        tenant={tenant}
        action={completeOnboardingAction}
        title="Station profile"
        description="This address identifies your station for billing. Station names may be shared."
        submitLabel="Complete setup"
        pendingLabel="Saving…"
        redirectOnSuccess
      />
    </div>
  );
}
