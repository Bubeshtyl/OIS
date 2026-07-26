"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { QuestionAnswerType, TicketQuestion } from "@/lib/db/schema";
import { saveQuestionAction } from "@/lib/actions/questions";
import type { ActionState } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const initialState: ActionState = { success: false };

function QuestionFormSheet({
  question,
  nextOrder,
  questions,
  children,
}: {
  question?: TicketQuestion;
  nextOrder: number;
  questions: TicketQuestion[];
  children: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveQuestionAction,
    initialState
  );
  const [isActive, setIsActive] = useState(question?.isActive ?? true);
  const [answerType, setAnswerType] = useState<QuestionAnswerType>(
    question?.answerType ?? "TEXT"
  );
  const [dependsOnQuestionId, setDependsOnQuestionId] = useState(
    question?.dependsOnQuestionId ?? ""
  );
  const [subChoicesByParent, setSubChoicesByParent] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      if (question?.choicesByParent) {
        for (const [choice, subChoices] of Object.entries(question.choicesByParent)) {
          initial[choice] = subChoices.join(", ");
        }
      }
      return initial;
    }
  );

  const parentCandidates = questions.filter(
    (q) => q.answerType === "CHOICE" && q.id !== question?.id
  );
  const parentQuestion = parentCandidates.find((q) => q.id === dependsOnQuestionId);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="max-h-[min(90vh,32rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{question ? "Edit Question" : "Add Question"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {question && <input type="hidden" name="id" value={question.id} />}
          <input type="hidden" name="isActive" value={String(isActive)} />
          <input type="hidden" name="answerType" value={answerType} />
          <input type="hidden" name="dependsOnQuestionId" value={dependsOnQuestionId} />
          <input
            type="hidden"
            name="choicesByParent"
            value={dependsOnQuestionId ? JSON.stringify(subChoicesByParent) : ""}
          />
          <div className="space-y-2">
            <Label htmlFor="order">Order *</Label>
            <Input
              id="order"
              name="order"
              type="number"
              min={1}
              defaultValue={question?.order ?? nextOrder}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt *</Label>
            <Textarea
              id="prompt"
              name="prompt"
              defaultValue={question?.prompt}
              rows={2}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Answer type *</Label>
            <Select
              value={answerType}
              onValueChange={(value) =>
                value && setAnswerType(value as QuestionAnswerType)
              }
              items={[
                { value: "TEXT", label: "Text" },
                { value: "CHOICE", label: "Choice" },
              ]}
            >
              <SelectTrigger className="w-full" disabled={Boolean(dependsOnQuestionId)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEXT">Text</SelectItem>
                <SelectItem value="CHOICE">Choice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Depends on (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Only ask this question when a specific answer was given to an earlier
              Choice question.
            </p>
            <Select
              value={dependsOnQuestionId || "none"}
              onValueChange={(value) => {
                const next = !value || value === "none" ? "" : value;
                setDependsOnQuestionId(next);
                if (next) setAnswerType("CHOICE");
              }}
              items={[
                { value: "none", label: "None — always ask" },
                ...parentCandidates.map((q) => ({ value: q.id, label: q.prompt })),
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None — always ask</SelectItem>
                {parentCandidates.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.prompt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dependsOnQuestionId && parentQuestion && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Choices per &ldquo;{parentQuestion.prompt}&rdquo; answer *</Label>
                <p className="text-xs text-muted-foreground">
                  Comma-separated choices to show for each answer. Leave a field blank
                  to skip this question entirely for that answer.
                </p>
              </div>
              {(parentQuestion.choices ?? []).map((choice) => (
                <div key={choice} className="space-y-1">
                  <Label className="text-xs font-normal">{choice}</Label>
                  <Textarea
                    rows={2}
                    value={subChoicesByParent[choice] ?? ""}
                    onChange={(e) =>
                      setSubChoicesByParent((prev) => ({
                        ...prev,
                        [choice]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
          {!dependsOnQuestionId && answerType === "CHOICE" && (
            <div className="space-y-2">
              <Label htmlFor="choices">Choices *</Label>
              <p className="text-xs text-muted-foreground">
                Comma-separated, at least 2 (e.g. Low, Medium, High, Urgent).
              </p>
              <Textarea
                id="choices"
                name="choices"
                defaultValue={question?.choices?.join(", ")}
                rows={2}
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="flex-1">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QuestionsAdmin({ questions }: { questions: TicketQuestion[] }) {
  const nextOrder =
    questions.length > 0
      ? Math.max(...questions.map((q) => q.order)) + 1
      : 1;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <QuestionFormSheet nextOrder={nextOrder} questions={questions}>
          <Button className="min-h-11">+ Add</Button>
        </QuestionFormSheet>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Prompt</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Choices</TableHead>
            <TableHead>Depends on</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.map((question) => {
            const parent = questions.find((q) => q.id === question.dependsOnQuestionId);
            return (
              <TableRow key={question.id}>
                <TableCell>{question.order}</TableCell>
                <TableCell className="max-w-xs">{question.prompt}</TableCell>
                <TableCell>{question.answerType === "TEXT" ? "Text" : "Choice"}</TableCell>
                <TableCell>
                  {question.choices?.join(", ") ??
                    (question.choicesByParent
                      ? Object.entries(question.choicesByParent)
                          .map(([choice, subChoices]) => `${choice}: ${subChoices.join(", ")}`)
                          .join(" | ")
                      : "—")}
                </TableCell>
                <TableCell>{parent ? parent.prompt : "—"}</TableCell>
                <TableCell>{question.isActive ? "Active" : "Inactive"}</TableCell>
                <TableCell>
                  <QuestionFormSheet question={question} nextOrder={nextOrder} questions={questions}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </QuestionFormSheet>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
