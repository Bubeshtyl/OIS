import { redirect } from "next/navigation";
import { StationProfileForm } from "@/components/onboarding/station-profile-form";
import { StationNozzleAdmin } from "@/components/admin/station-nozzle-admin";
import { StationFuelProductsAdmin } from "@/components/admin/station-products-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Fuel, Gauge } from "lucide-react";
import {
  getStationProfile,
  updateStationProfileAction,
} from "@/lib/actions/station";
import { getStationLayout } from "@/lib/station-config/service";
import { getDefaultPath } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";


export default async function StationProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const tenant = await getStationProfile();
  if (!tenant) {
    redirect(await getDefaultPath(session));
  }

  const params = await searchParams;
  const activeTab =
    params.tab === "nozzles"
      ? "nozzles"
      : params.tab === "products"
      ? "products"
      : "profile";

  const layout = await getStationLayout(tenant.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Station Management"
        subtitle={`Station: ${tenant.name} (${tenant.slug})`}
      />

      <Tabs defaultValue={activeTab} className="space-y-6">
        <TabsList className="bg-muted/80 p-1 h-9 gap-1 rounded-sm">
          <TabsTrigger
            value="profile"
            className="gap-1.5 px-3 py-1 h-7 text-xs font-medium rounded-sm transition-all data-active:bg-primary data-active:text-primary-foreground data-active:shadow-xs"
          >
            <Building2 className="size-3.5" />
            Station Profile
          </TabsTrigger>
          <TabsTrigger
            value="products"
            className="gap-1.5 px-3 py-1 h-7 text-xs font-medium rounded-sm transition-all data-active:bg-primary data-active:text-primary-foreground data-active:shadow-xs"
          >
            <Fuel className="size-3.5" />
            Fuel Products ({layout.products.length})
          </TabsTrigger>
          <TabsTrigger
            value="nozzles"
            className="gap-1.5 px-3 py-1 h-7 text-xs font-medium rounded-sm transition-all data-active:bg-primary data-active:text-primary-foreground data-active:shadow-xs"
          >
            <Gauge className="size-3.5" />
            Nozzle Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <StationProfileForm
            tenant={tenant}
            action={updateStationProfileAction}
          />
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <StationFuelProductsAdmin products={layout.products} />
        </TabsContent>

        <TabsContent value="nozzles" className="space-y-6">
          <StationNozzleAdmin layout={layout} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
