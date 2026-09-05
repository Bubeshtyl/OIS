import { Suspense } from "react";
import { QuestionsAdmin } from "@/components/admin/questions-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllQuestions } from "@/lib/actions/questions";

function QuestionsContentSkeleton() {
  return (
    <div className="min-h-[28rem]">
      <div className="mb-4 flex justify-end">
        <Skeleton className="h-11 w-24 rounded-lg" />
      </div>
      <div className="space-y-2 rounded-xl border p-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

async function QuestionsAdminContent() {
  const questions = await getAllQuestions();
  return (
    <div className="min-h-[28rem]">
      <QuestionsAdmin questions={questions} />
    </div>
  );
}

export default function AdminQuestionsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Questionnaire" />
      <Suspense fallback={<QuestionsContentSkeleton />}>
        <QuestionsAdminContent />
      </Suspense>
    </div>
  );
}
