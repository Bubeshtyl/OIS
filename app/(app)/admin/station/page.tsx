import { redirect } from "next/navigation";
import { StationProfileForm } from "@/components/onboarding/station-profile-form";
import { PageHeader } from "@/components/shared/page-blocks";
import {
  getStationProfile,
  updateStationProfileAction,
} from "@/lib/actions/station";
import { getDefaultPath } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function StationProfilePage() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const tenant = await getStationProfile();
  if (!tenant) {
    redirect(await getDefaultPath(session));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Station"
        subtitle={`Billing identity: ${tenant.slug}`}
      />
      <StationProfileForm
        tenant={tenant}
        action={updateStationProfileAction}
      />
    </div>
  );
}
