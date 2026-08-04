import { TicketSettingsForm } from "@/components/admin/ticket-settings-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { getTicketSettings } from "@/lib/actions/settings";
import { requireTenantSession } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await requireTenantSession();
  const settings = await getTicketSettings(session.tenantId);

  return (
    <div>
      <PageHeader title="Ticket Settings" />
      <TicketSettingsForm
        key={`${settings.prefix}-${settings.paddingWidth}-${settings.accessCode ?? ""}`}
        settings={settings}
      />
    </div>
  );
}
