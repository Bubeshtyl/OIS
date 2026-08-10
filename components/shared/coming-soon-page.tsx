import { PageHeader } from "@/components/shared/page-blocks";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoonPage({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <p className="font-medium">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
