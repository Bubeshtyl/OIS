import { FileUploadView } from "@/components/file-upload/file-upload-view";
import { RecentUploads } from "@/components/file-upload/recent-uploads";
import { PageHeader } from "@/components/shared/page-blocks";
import { requireTenantSession } from "@/lib/auth/permissions";
import { getRecentDailySalesUploads } from "@/lib/queries/daily-sales";

export default async function FileUploadPage() {
  const session = await requireTenantSession();
  const recentUploads = await getRecentDailySalesUploads(session.tenantId, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="File Upload"
        subtitle="Import daily sales Excel or CSV exports into the daily_sales table"
      />
      <FileUploadView />
      <RecentUploads uploads={recentUploads} />
    </div>
  );
}
