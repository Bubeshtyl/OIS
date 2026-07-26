import { FileUploadView } from "@/components/file-upload/file-upload-view";
import { PageHeader } from "@/components/shared/page-blocks";

export default function FileUploadPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="File Upload"
        subtitle="Import daily sales Excel or CSV exports into the daily_sales table"
      />
      <FileUploadView />
    </div>
  );
}
