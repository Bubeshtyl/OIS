import { PageHeader } from "@/components/shared/page-blocks";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Home"
        subtitle="Your station overview will live here."
      />
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/30 px-6 py-16 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-lg font-medium tracking-tight">Coming soon</p>
          <p className="text-sm text-muted-foreground">
            This home page is a placeholder for now. Use Analytics → Dashboard
            for inventory overview.
          </p>
        </div>
      </div>
    </div>
  );
}
