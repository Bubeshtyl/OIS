import { QuestionsAdmin } from "@/components/admin/questions-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { getAllQuestions } from "@/lib/actions/questions";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  const questions = await getAllQuestions();

  return (
    <div>
      <PageHeader title="Questionnaire" />
      <QuestionsAdmin questions={questions} />
    </div>
  );
}
