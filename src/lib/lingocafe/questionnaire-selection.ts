import {
  getQuestionnaireRetrievability,
  type QuestionnaireMemory,
} from "./questionnaire-fsrs.ts";

export type QuestionnaireCandidate = {
  questionnaireId: string;
  questionId: string;
  revisionDigest: string;
  answerSetId: string;
  learningItems: Array<{
    id: string;
    memory: QuestionnaireMemory | null;
  }>;
};

const asDate = (value: Date | string) =>
  value instanceof Date ? value : new Date(value);

export const rankQuestionnaireCandidates = (
  candidates: QuestionnaireCandidate[],
  now: Date
) => {
  const ranked = candidates.map((candidate) => {
    const dueMemories = candidate.learningItems
      .map((item) => item.memory)
      .filter((memory): memory is QuestionnaireMemory => Boolean(memory))
      .filter((memory) => asDate(memory.due_at).getTime() <= now.getTime());
    const unseen = candidate.learningItems.some((item) => !item.memory);
    const dueUrgency = dueMemories.reduce((highest, memory) => {
      const overdueDays = Math.max(
        0,
        (now.getTime() - asDate(memory.due_at).getTime()) / 86_400_000
      );
      return Math.max(
        highest,
        overdueDays / Math.max(Number(memory.stability ?? 0.1), 0.1)
      );
    }, 0);
    const retrievability = candidate.learningItems.reduce((lowest, item) => {
      if (!item.memory) return lowest;
      return Math.min(
        lowest,
        getQuestionnaireRetrievability(item.memory, now)
      );
    }, 1);

    return {
      ...candidate,
      selectionBucket: dueMemories.length > 0 ? 0 : unseen ? 1 : 2,
      dueUrgency,
      retrievability,
    };
  });

  return ranked.sort((left, right) => {
    if (left.selectionBucket !== right.selectionBucket) {
      return left.selectionBucket - right.selectionBucket;
    }
    if (left.selectionBucket === 0 && left.dueUrgency !== right.dueUrgency) {
      return right.dueUrgency - left.dueUrgency;
    }
    if (
      left.selectionBucket === 2 &&
      left.retrievability !== right.retrievability
    ) {
      return left.retrievability - right.retrievability;
    }
    return left.questionId.localeCompare(right.questionId);
  });
};
