import { createHash } from "node:crypto";

import {
  FSRSVersion,
  Rating,
  State,
  StrategyMode,
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card,
  type CardInput,
  type Grade,
} from "ts-fsrs";

export const QUESTIONNAIRE_SCHEDULER_NAME = "fsrs";
export const QUESTIONNAIRE_SCHEDULER_VERSION = "6";
export const QUESTIONNAIRE_PARAMETER_SET_ID = "fsrs-6-default-r0.90-fuzz-v1";
export const QUESTIONNAIRE_DESIRED_RETENTION = 0.9;

export const questionnaireFsrsParameters = generatorParameters({
  request_retention: QUESTIONNAIRE_DESIRED_RETENTION,
  enable_fuzz: true,
});

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)])
  );
};

export const stableQuestionnaireJson = (value: unknown) =>
  JSON.stringify(stableValue(value));

export const questionnaireFsrsParametersDigest = createHash("sha256")
  .update(stableQuestionnaireJson(questionnaireFsrsParameters))
  .digest("hex");

export type QuestionnaireMemory = {
  card_state: "new" | "learning" | "review" | "relearning";
  difficulty: number | string | null;
  stability: number | string | null;
  due_at: Date | string;
  last_review_at: Date | string | null;
  scheduled_days: number;
  elapsed_days: number;
  learning_steps: number;
  repetitions: number;
  lapses: number;
};

const stateByName: Record<QuestionnaireMemory["card_state"], State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

const stateName = (state: State): QuestionnaireMemory["card_state"] => {
  switch (state) {
    case State.Learning:
      return "learning";
    case State.Review:
      return "review";
    case State.Relearning:
      return "relearning";
    default:
      return "new";
  }
};

const numeric = (value: number | string | null) => Number(value ?? 0);

export const memoryToFsrsCard = (memory: QuestionnaireMemory): CardInput => ({
  due: new Date(memory.due_at),
  stability: numeric(memory.stability),
  difficulty: numeric(memory.difficulty),
  elapsed_days: memory.elapsed_days,
  scheduled_days: memory.scheduled_days,
  learning_steps: memory.learning_steps,
  reps: memory.repetitions,
  lapses: memory.lapses,
  state: stateByName[memory.card_state],
  last_review: memory.last_review_at ? new Date(memory.last_review_at) : undefined,
});

export const fsrsCardToMemory = (card: Card): QuestionnaireMemory => ({
  card_state: stateName(card.state),
  difficulty: card.state === State.New ? null : card.difficulty,
  stability: card.state === State.New ? null : card.stability,
  due_at: card.due,
  last_review_at: card.last_review ?? null,
  scheduled_days: card.scheduled_days,
  elapsed_days: card.elapsed_days,
  learning_steps: card.learning_steps,
  repetitions: card.reps,
  lapses: card.lapses,
});

export const buildQuestionnaireReviewSeed = ({
  userId,
  questionnaireId,
  learningItemId,
  reviewOrdinal,
}: {
  userId: string;
  questionnaireId: string;
  learningItemId: string;
  reviewOrdinal: number;
}) =>
  createHash("sha256")
    .update(`${userId}\u0000${questionnaireId}\u0000${learningItemId}\u0000${reviewOrdinal}`)
    .digest("hex");

const schedulerForSeed = (seed: string) =>
  fsrs(questionnaireFsrsParameters).useStrategy(
    StrategyMode.SEED,
    function seededQuestionnaireReview() {
      return seed;
    }
  );

export const getQuestionnaireRetrievability = (
  memory: QuestionnaireMemory,
  now: Date
) => schedulerForSeed("retrievability").get_retrievability(memoryToFsrsCard(memory), now, false);

export const applyQuestionnaireReview = ({
  memory,
  correct,
  reviewedAt,
  seed,
}: {
  memory: QuestionnaireMemory | null;
  correct: boolean;
  reviewedAt: Date;
  seed: string;
}) => {
  const beforeCard = memory
    ? memoryToFsrsCard(memory)
    : createEmptyCard(reviewedAt);
  const rating = (correct ? Rating.Good : Rating.Again) as Grade;
  const result = schedulerForSeed(seed).next(beforeCard, reviewedAt, rating);

  return {
    rating,
    card: result.card,
    log: result.log,
    memory: fsrsCardToMemory(result.card),
    stateBefore: {
      implementation: FSRSVersion,
      card: fsrsCardToMemory(beforeCard as Card),
    },
    stateAfter: {
      implementation: FSRSVersion,
      card: fsrsCardToMemory(result.card),
    },
  };
};
