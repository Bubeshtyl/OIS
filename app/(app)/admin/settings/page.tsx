import { TicketSettingsForm } from "@/components/admin/ticket-settings-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { getTicketSettings } from "@/lib/actions/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getTicketSettings();

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
