import "server-only";

import { randomUUID } from "node:crypto";

import type { Knex } from "knex";

import { getDB } from "@/42go/db";
import {
  QUESTIONNAIRE_DESIRED_RETENTION,
  QUESTIONNAIRE_PARAMETER_SET_ID,
  QUESTIONNAIRE_SCHEDULER_NAME,
  QUESTIONNAIRE_SCHEDULER_VERSION,
  applyQuestionnaireReview,
  buildQuestionnaireReviewSeed,
  questionnaireFsrsParameters,
  questionnaireFsrsParametersDigest,
  type QuestionnaireMemory,
} from "@/lib/lingocafe/questionnaire-fsrs";
import {
  rankQuestionnaireCandidates,
  type QuestionnaireCandidate,
} from "@/lib/lingocafe/questionnaire-selection";

const DEFAULT_ROUND_SIZE = 10;
const STANDARD_MODE = "standard";
const SELECTION_POLICY = "fsrs-due-unseen-retrievability";
const SCOPED_SELECTION_POLICY = "randomized-page-scope";
const SELECTION_POLICY_VERSION = "1";
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

export class QuestionnaireServiceError extends Error {
  constructor(
    readonly code:
      | "not_found"
      | "unavailable"
      | "conflict"
      | "validation",
    message: string
  ) {
    super(message);
    this.name = "QuestionnaireServiceError";
  }
}

type DB = Knex | Knex.Transaction;

export type QuestionnaireTrainingScope = {
  kind: "chapter" | "part";
  pageId: string;
};

type RoundRow = {
  id: string;
  user_id: string;
  questionnaire_id: string;
  book_id: string;
  questionnaire_title: string;
  mode: string;
  selection_policy: string;
  selection_policy_version: string;
  requested_question_count: number;
  actual_question_count: number;
  status: "in_progress" | "completed" | "abandoned";
  correct_count: number;
  score_total: number;
  started_at: Date | string;
  completed_at: Date | string | null;
};

type CandidateRow = {
  questionnaire_id: string;
  question_id: string;
  revision_digest: string;
  answer_set_id: string;
  learning_item_id: string;
  card_state: QuestionnaireMemory["card_state"] | null;
  difficulty: number | string | null;
  stability: number | string | null;
  due_at: Date | string | null;
  last_review_at: Date | string | null;
  scheduled_days: number | null;
  elapsed_days: number | null;
  learning_steps: number | null;
  repetitions: number | null;
  lapses: number | null;
};

const asDate = (value: Date | string) =>
  value instanceof Date ? value : new Date(value);

const iso = (value: Date | string | null) =>
  value ? asDate(value).toISOString() : null;

const toMemory = (row: CandidateRow): QuestionnaireMemory | null =>
  row.card_state && row.due_at
    ? {
        card_state: row.card_state,
        difficulty: row.difficulty,
        stability: row.stability,
        due_at: row.due_at,
        last_review_at: row.last_review_at,
        scheduled_days: row.scheduled_days ?? 0,
        elapsed_days: row.elapsed_days ?? 0,
        learning_steps: row.learning_steps ?? 0,
        repetitions: row.repetitions ?? 0,
        lapses: row.lapses ?? 0,
      }
    : null;

const lockScope = async (trx: Knex.Transaction, value: string) => {
  await trx.raw("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", [value]);
};

const loadOwnedRoundRow = async (
  db: DB,
  userId: string,
  roundId: string,
  lock = false
) => {
  let query = db("lingocafe.questionnaire_rounds as round")
    .join(
      "lingocafe.questionnaires as questionnaire",
      "questionnaire.id",
      "round.questionnaire_id"
    )
    .select(
      "round.*",
      "questionnaire.book_id",
      "questionnaire.title as questionnaire_title"
    )
    .where({ "round.id": roundId, "round.user_id": userId });
  if (lock) query = query.forUpdate();
  return (await query.first()) as RoundRow | undefined;
};

const loadActiveRoundRow = async (
  db: DB,
  userId: string,
  questionnaireId: string,
  mode: string,
  lock = false
) => {
  let query = db("lingocafe.questionnaire_rounds as round")
    .join(
      "lingocafe.questionnaires as questionnaire",
      "questionnaire.id",
      "round.questionnaire_id"
    )
    .select(
      "round.*",
      "questionnaire.book_id",
      "questionnaire.title as questionnaire_title"
    )
    .where({
      "round.user_id": userId,
      "round.questionnaire_id": questionnaireId,
      "round.mode": mode,
      "round.status": "in_progress",
    });
  if (lock) query = query.forUpdate();
  return (await query.first()) as RoundRow | undefined;
};

const loadCandidates = async (
  db: DB,
  userId: string,
  questionnaireId: string,
  now: Date,
  pageIds?: string[],
  bookId?: string
) => {
  const query = db("lingocafe.questionnaire_questions as question")
    .join("lingocafe.questionnaire_question_revisions as revision", function joinRevision() {
      this.on("revision.questionnaire_id", "=", "question.questionnaire_id")
        .andOn("revision.question_id", "=", "question.id")
        .andOn("revision.revision_digest", "=", "question.current_revision_digest");
    })
    .join("lingocafe.questionnaire_answer_sets as answer_set", function joinAnswerSet() {
      this.on("answer_set.questionnaire_id", "=", "revision.questionnaire_id")
        .andOn("answer_set.question_id", "=", "revision.question_id")
        .andOn("answer_set.revision_digest", "=", "revision.revision_digest");
    })
    .join(
      "lingocafe.questionnaire_question_revision_learning_items as relation",
      function joinRelation() {
        this.on("relation.questionnaire_id", "=", "revision.questionnaire_id")
          .andOn("relation.question_id", "=", "revision.question_id")
          .andOn("relation.revision_digest", "=", "revision.revision_digest");
      }
    )
    .join("lingocafe.questionnaire_learning_items as learning_item", function joinItem() {
      this.on("learning_item.questionnaire_id", "=", "relation.questionnaire_id").andOn(
        "learning_item.id",
        "=",
        "relation.learning_item_id"
      );
    })
    .leftJoin("lingocafe.questionnaire_learning_item_memory as memory", function joinMemory() {
      this.on("memory.questionnaire_id", "=", "relation.questionnaire_id")
        .andOn("memory.learning_item_id", "=", "relation.learning_item_id")
        .andOnVal("memory.user_id", "=", userId);
    })
    .modify((builder) => {
      if (!pageIds || !bookId) return;
      builder.join("lingocafe.questionnaire_learning_item_pages as page_link", function joinPageLink() {
        this.on("page_link.questionnaire_id", "=", "learning_item.questionnaire_id")
          .andOn("page_link.learning_item_id", "=", "learning_item.id")
          .andOnVal("page_link.book_id", "=", bookId);
      }).whereIn("page_link.page_id", pageIds);
    })
    .select(
      "question.questionnaire_id",
      "question.id as question_id",
      "revision.revision_digest",
      "answer_set.id as answer_set_id",
      "relation.learning_item_id",
      "memory.card_state",
      "memory.difficulty",
      "memory.stability",
      "memory.due_at",
      "memory.last_review_at",
      "memory.scheduled_days",
      "memory.elapsed_days",
      "memory.learning_steps",
      "memory.repetitions",
      "memory.lapses"
    )
    .where({
      "question.questionnaire_id": questionnaireId,
      "question.status": "active",
      "revision.response_mode": "single-select",
      "learning_item.status": "active",
    })
    .orderBy([
      { column: "question.id", order: "asc" },
      { column: "answer_set.position", order: "asc" },
      { column: "relation.position", order: "asc" },
    ]);
  const rows = (await query) as CandidateRow[];

  const grouped = new Map<string, QuestionnaireCandidate>();
  for (const row of rows) {
    let candidate = grouped.get(row.question_id);
    if (!candidate) {
      candidate = {
        questionnaireId: row.questionnaire_id,
        questionId: row.question_id,
        revisionDigest: row.revision_digest,
        answerSetId: row.answer_set_id,
        learningItems: [],
      };
      grouped.set(row.question_id, candidate);
    }
    if (candidate.answerSetId !== row.answer_set_id) continue;
    if (!candidate.learningItems.some((item) => item.id === row.learning_item_id)) {
      candidate.learningItems.push({ id: row.learning_item_id, memory: toMemory(row) });
    }
  }

  return rankQuestionnaireCandidates([...grouped.values()], now);
};

const shuffleCandidates = <T,>(candidates: T[]) => {
  const shuffled = [...candidates];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const resolveTrainingScopePageIds = async (
  db: DB,
  bookId: string,
  scope: QuestionnaireTrainingScope
) => {
  const pages = (await db("lingocafe.books_pages")
    .select("id", "position", "kind")
    .where({ book_id: bookId })
    .orderBy("position", "asc")) as Array<{ id: string; position: number; kind: string }>;
  const scopePage = pages.find((page) => page.id === scope.pageId);
  if (!scopePage || scopePage.kind.toLowerCase() !== scope.kind) {
    throw new QuestionnaireServiceError("validation", "This training scope is not available.");
  }
  if (scope.kind === "chapter") return [scopePage.id];
  const partIndex = pages.indexOf(scopePage);
  const chapterPageIds: string[] = [];
  for (const page of pages.slice(partIndex + 1)) {
    if (page.kind.toLowerCase() === "part") break;
    if (page.kind.toLowerCase() === "chapter") chapterPageIds.push(page.id);
  }
  return chapterPageIds;
};

type RoundItemRow = {
  round_id: string;
  position: number;
  questionnaire_id: string;
  question_id: string;
  revision_digest: string;
  answer_set_id: string;
  prompt: string;
  response_mode: string;
  rationale: string | null;
};

type OptionRow = {
  round_item_position: number;
  id: string;
  position: number;
  text: string;
  is_correct: boolean;
};

type AnswerRow = {
  round_item_position: number;
  answered_at: Date | string;
  is_correct: boolean;
  duration_ms: number | null;
  applied_rating: number;
  option_id: string;
};

type PageRow = {
  round_item_position: number;
  page_id: string;
  position: number;
  prefix: string | null;
  title: string;
};

const loadRound = async (db: DB, round: RoundRow) => {
  const items = (await db("lingocafe.questionnaire_round_items as item")
    .join("lingocafe.questionnaire_question_revisions as revision", function joinRevision() {
      this.on("revision.questionnaire_id", "=", "item.questionnaire_id")
        .andOn("revision.question_id", "=", "item.question_id")
        .andOn("revision.revision_digest", "=", "item.revision_digest");
    })
    .select("item.*", "revision.prompt", "revision.response_mode", "revision.rationale")
    .where({ "item.round_id": round.id })
    .orderBy("item.position", "asc")) as RoundItemRow[];

  const options = (await db("lingocafe.questionnaire_round_items as item")
    .join("lingocafe.questionnaire_answer_options as option", function joinOption() {
      this.on("option.questionnaire_id", "=", "item.questionnaire_id")
        .andOn("option.question_id", "=", "item.question_id")
        .andOn("option.revision_digest", "=", "item.revision_digest")
        .andOn("option.answer_set_id", "=", "item.answer_set_id");
    })
    .select(
      "item.position as round_item_position",
      "option.id",
      "option.position",
      "option.text",
      "option.is_correct"
    )
    .where({ "item.round_id": round.id })
    .orderBy([
      { column: "item.position", order: "asc" },
      { column: "option.position", order: "asc" },
    ])) as OptionRow[];

  const answers = (await db("lingocafe.questionnaire_answers as answer")
    .join("lingocafe.questionnaire_answer_selections as selection", function joinSelection() {
      this.on("selection.round_id", "=", "answer.round_id").andOn(
        "selection.round_item_position",
        "=",
        "answer.round_item_position"
      );
    })
    .select("answer.*", "selection.option_id")
    .where({ "answer.round_id": round.id })) as AnswerRow[];

  const pages = (await db("lingocafe.questionnaire_round_items as item")
    .join(
      "lingocafe.questionnaire_question_revision_learning_items as relation",
      function joinRelation() {
        this.on("relation.questionnaire_id", "=", "item.questionnaire_id")
          .andOn("relation.question_id", "=", "item.question_id")
          .andOn("relation.revision_digest", "=", "item.revision_digest");
      }
    )
    .join("lingocafe.questionnaire_learning_item_pages as link", function joinLink() {
      this.on("link.questionnaire_id", "=", "relation.questionnaire_id").andOn(
        "link.learning_item_id",
        "=",
        "relation.learning_item_id"
      );
    })
    .join("lingocafe.books_pages as page", function joinPage() {
      this.on("page.book_id", "=", "link.book_id").andOn("page.id", "=", "link.page_id");
    })
    .distinct(
      "item.position as round_item_position",
      "page.id as page_id",
      "page.position",
      "page.prefix",
      "page.title"
    )
    .where({ "item.round_id": round.id })
    .orderBy([
      { column: "item.position", order: "asc" },
      { column: "page.position", order: "asc" },
    ])) as PageRow[];

  const answerByPosition = new Map(answers.map((answer) => [answer.round_item_position, answer]));
  const optionsByPosition = Map.groupBy(options, (option) => option.round_item_position);
  const pagesByPosition = Map.groupBy(pages, (page) => page.round_item_position);

  const mappedItems = items.map((item) => {
    const itemOptions = optionsByPosition.get(item.position) ?? [];
    const answer = answerByPosition.get(item.position);
    const correctOption = answer
      ? itemOptions.find((option) => option.is_correct) ?? null
      : null;

    return {
      position: item.position,
      questionId: item.question_id,
      prompt: item.prompt,
      responseMode: item.response_mode,
      options: itemOptions.map((option) => ({ id: option.id, text: option.text })),
      answer: answer
        ? {
            selectedOptionId: answer.option_id,
            isCorrect: answer.is_correct,
            appliedRating: answer.applied_rating,
            durationMs: answer.duration_ms,
            answeredAt: iso(answer.answered_at),
            correctOption: correctOption
              ? { id: correctOption.id, text: correctOption.text }
              : null,
            rationale: item.rationale,
            pageLinks: (pagesByPosition.get(item.position) ?? []).map((page) => ({
              bookId: round.book_id,
              pageId: page.page_id,
              title: page.title,
              prefix: page.prefix,
              href: `/books/read/${encodeURIComponent(round.book_id)}/${encodeURIComponent(page.page_id)}`,
            })),
          }
        : null,
    };
  });
  const answeredCount = mappedItems.filter((item) => item.answer).length;

  return {
    round: {
      id: round.id,
      bookId: round.book_id,
      questionnaireId: round.questionnaire_id,
      title: round.questionnaire_title,
      mode: round.mode,
      selectionPolicy: round.selection_policy,
      selectionPolicyVersion: round.selection_policy_version,
      requestedQuestionCount: round.requested_question_count,
      actualQuestionCount: round.actual_question_count,
      answeredCount,
      currentPosition:
        round.status === "in_progress"
          ? mappedItems.find((item) => !item.answer)?.position ?? null
          : null,
      status: round.status,
      correctCount: round.correct_count,
      scoreTotal: round.score_total,
      startedAt: iso(round.started_at),
      completedAt: iso(round.completed_at),
      items: mappedItems,
    },
  };
};

export const startQuestionnaireRound = async ({
  userId,
  bookId,
  mode = STANDARD_MODE,
  scope,
  now = new Date(),
}: {
  userId: string;
  bookId: string;
  mode?: string;
  scope?: QuestionnaireTrainingScope;
  now?: Date;
}) => {
  const expectedMode = scope ? `${scope.kind}:${scope.pageId}` : STANDARD_MODE;
  if (mode !== expectedMode) {
    throw new QuestionnaireServiceError("validation", "Unsupported questionnaire mode.");
  }
  const db = getDB();
  return db.transaction(async (trx) => {
    const questionnaire = (await trx("lingocafe.questionnaires")
      .select("id", "book_id", "title")
      .where({ book_id: bookId, status: "active" })
      .first()) as { id: string; book_id: string; title: string } | undefined;
    if (!questionnaire) {
      throw new QuestionnaireServiceError("not_found", "Questionnaire not found.");
    }

    await lockScope(trx, `questionnaire-round:${userId}:${questionnaire.id}:${mode}`);
    const active = await loadActiveRoundRow(trx, userId, questionnaire.id, mode, true);
    if (active) return loadRound(trx, active);

    const pageIds = scope
      ? await resolveTrainingScopePageIds(trx, bookId, scope)
      : undefined;
    const candidates = await loadCandidates(trx, userId, questionnaire.id, now, pageIds, bookId);
    const selected = (scope ? shuffleCandidates(candidates) : candidates).slice(0, DEFAULT_ROUND_SIZE);
    if (selected.length === 0) {
      throw new QuestionnaireServiceError("unavailable", "No questionnaire questions are available.");
    }

    const [created] = (await trx("lingocafe.questionnaire_rounds")
      .insert({
        user_id: userId,
        questionnaire_id: questionnaire.id,
        mode,
        selection_policy: scope ? SCOPED_SELECTION_POLICY : SELECTION_POLICY,
        selection_policy_version: SELECTION_POLICY_VERSION,
        requested_question_count: DEFAULT_ROUND_SIZE,
        actual_question_count: selected.length,
        status: "in_progress",
        started_at: now,
      })
      .returning("id")) as Array<{ id: string }>;

    await trx("lingocafe.questionnaire_round_items").insert(
      selected.map((candidate, index) => ({
        round_id: created.id,
        position: index + 1,
        questionnaire_id: candidate.questionnaireId,
        question_id: candidate.questionId,
        revision_digest: candidate.revisionDigest,
        answer_set_id: candidate.answerSetId,
      }))
    );

    const round = await loadOwnedRoundRow(trx, userId, created.id);
    if (!round) throw new Error("Created questionnaire round could not be loaded.");
    return loadRound(trx, round);
  });
};

export const getQuestionnaireRound = async ({
  userId,
  roundId,
}: {
  userId: string;
  roundId: string;
}) => {
  const db = getDB();
  const round = await loadOwnedRoundRow(db, userId, roundId);
  if (!round) throw new QuestionnaireServiceError("not_found", "Questionnaire round not found.");
  return loadRound(db, round);
};

const loadAnswerLearningItemIds = async (db: DB, item: RoundItemRow) => {
  const rows = (await db(
    "lingocafe.questionnaire_question_revision_learning_items"
  )
    .select("learning_item_id")
    .where({
      questionnaire_id: item.questionnaire_id,
      question_id: item.question_id,
      revision_digest: item.revision_digest,
    })
    .orderBy("learning_item_id", "asc")) as Array<{ learning_item_id: string }>;
  return rows.map((row) => row.learning_item_id);
};

export const answerQuestionnaireRoundItem = async ({
  userId,
  roundId,
  position,
  optionId,
  durationMs = null,
  now = new Date(),
}: {
  userId: string;
  roundId: string;
  position: number;
  optionId: string;
  durationMs?: number | null;
  now?: Date;
}) => {
  if (!Number.isInteger(position) || position < 1 || !optionId.trim()) {
    throw new QuestionnaireServiceError("validation", "Invalid questionnaire answer.");
  }
  if (
    durationMs !== null &&
    (!Number.isInteger(durationMs) || durationMs < 0 || durationMs > MAX_DURATION_MS)
  ) {
    throw new QuestionnaireServiceError("validation", "Invalid answer duration.");
  }

  const db = getDB();
  return db.transaction(async (trx) => {
    const round = await loadOwnedRoundRow(trx, userId, roundId, true);
    if (!round) throw new QuestionnaireServiceError("not_found", "Questionnaire round not found.");

    const item = (await trx("lingocafe.questionnaire_round_items as item")
      .join("lingocafe.questionnaire_question_revisions as revision", function joinRevision() {
        this.on("revision.questionnaire_id", "=", "item.questionnaire_id")
          .andOn("revision.question_id", "=", "item.question_id")
          .andOn("revision.revision_digest", "=", "item.revision_digest");
      })
      .select("item.*", "revision.prompt", "revision.response_mode", "revision.rationale")
      .where({ "item.round_id": roundId, "item.position": position })
      .first()) as RoundItemRow | undefined;
    if (!item) throw new QuestionnaireServiceError("not_found", "Round item not found.");

    const existing = (await trx("lingocafe.questionnaire_answers as answer")
      .join("lingocafe.questionnaire_answer_selections as selection", function joinSelection() {
        this.on("selection.round_id", "=", "answer.round_id").andOn(
          "selection.round_item_position",
          "=",
          "answer.round_item_position"
        );
      })
      .select("selection.option_id")
      .where({ "answer.round_id": roundId, "answer.round_item_position": position })
      .first()) as { option_id: string } | undefined;
    if (existing) {
      if (existing.option_id !== optionId) {
        throw new QuestionnaireServiceError("conflict", "This question was already answered differently.");
      }
      return loadRound(trx, round);
    }
    if (round.status !== "in_progress") {
      throw new QuestionnaireServiceError("conflict", "This round is no longer in progress.");
    }

    const option = (await trx("lingocafe.questionnaire_answer_options")
      .select("id", "is_correct")
      .where({
        questionnaire_id: item.questionnaire_id,
        question_id: item.question_id,
        revision_digest: item.revision_digest,
        answer_set_id: item.answer_set_id,
        id: optionId,
      })
      .first()) as { id: string; is_correct: boolean } | undefined;
    if (!option) throw new QuestionnaireServiceError("validation", "Selected option is not valid.");

    const rating = option.is_correct ? 3 : 1;
    await trx("lingocafe.questionnaire_answers").insert({
      round_id: roundId,
      round_item_position: position,
      answered_at: now,
      is_correct: option.is_correct,
      duration_ms: durationMs,
      applied_rating: rating,
    });
    await trx("lingocafe.questionnaire_answer_selections").insert({
      round_id: roundId,
      round_item_position: position,
      questionnaire_id: item.questionnaire_id,
      question_id: item.question_id,
      revision_digest: item.revision_digest,
      answer_set_id: item.answer_set_id,
      option_id: optionId,
    });

    const learningItemIds = await loadAnswerLearningItemIds(trx, item);
    for (const learningItemId of learningItemIds) {
      await lockScope(
        trx,
        `questionnaire-memory:${userId}:${item.questionnaire_id}:${learningItemId}`
      );
      const memory = (await trx("lingocafe.questionnaire_learning_item_memory")
        .select(
          "card_state",
          "difficulty",
          "stability",
          "due_at",
          "last_review_at",
          "scheduled_days",
          "elapsed_days",
          "learning_steps",
          "repetitions",
          "lapses"
        )
        .where({
          user_id: userId,
          questionnaire_id: item.questionnaire_id,
          learning_item_id: learningItemId,
        })
        .forUpdate()
        .first()) as QuestionnaireMemory | undefined;
      const seed = buildQuestionnaireReviewSeed({
        userId,
        questionnaireId: item.questionnaire_id,
        learningItemId,
        reviewOrdinal: (memory?.repetitions ?? 0) + 1,
      });
      const review = applyQuestionnaireReview({
        memory: memory ?? null,
        correct: option.is_correct,
        reviewedAt: now,
        seed,
      });
      const reviewId = randomUUID();
      await trx("lingocafe.questionnaire_learning_item_reviews").insert({
        id: reviewId,
        user_id: userId,
        questionnaire_id: item.questionnaire_id,
        learning_item_id: learningItemId,
        question_id: item.question_id,
        revision_digest: item.revision_digest,
        round_id: roundId,
        round_item_position: position,
        rating: review.rating,
        scheduler_name: QUESTIONNAIRE_SCHEDULER_NAME,
        scheduler_version: QUESTIONNAIRE_SCHEDULER_VERSION,
        parameter_set_id: QUESTIONNAIRE_PARAMETER_SET_ID,
        parameters: questionnaireFsrsParameters,
        parameters_digest: questionnaireFsrsParametersDigest,
        desired_retention: QUESTIONNAIRE_DESIRED_RETENTION,
        elapsed_days: review.log.elapsed_days,
        scheduled_days: review.log.scheduled_days,
        state_before: review.stateBefore,
        state_after: review.stateAfter,
        reviewed_at: now,
      });
      await trx("lingocafe.questionnaire_learning_item_memory")
        .insert({
          user_id: userId,
          questionnaire_id: item.questionnaire_id,
          learning_item_id: learningItemId,
          scheduler_name: QUESTIONNAIRE_SCHEDULER_NAME,
          scheduler_version: QUESTIONNAIRE_SCHEDULER_VERSION,
          parameter_set_id: QUESTIONNAIRE_PARAMETER_SET_ID,
          parameters: questionnaireFsrsParameters,
          parameters_digest: questionnaireFsrsParametersDigest,
          desired_retention: QUESTIONNAIRE_DESIRED_RETENTION,
          card_state: review.memory.card_state,
          difficulty: review.memory.difficulty,
          stability: review.memory.stability,
          due_at: review.memory.due_at,
          last_review_at: review.memory.last_review_at,
          scheduled_days: review.memory.scheduled_days,
          elapsed_days: review.memory.elapsed_days,
          learning_steps: review.memory.learning_steps,
          repetitions: review.memory.repetitions,
          lapses: review.memory.lapses,
          last_review_id: reviewId,
          updated_at: now,
        })
        .onConflict(["user_id", "questionnaire_id", "learning_item_id"])
        .merge([
          "scheduler_name",
          "scheduler_version",
          "parameter_set_id",
          "parameters",
          "parameters_digest",
          "desired_retention",
          "card_state",
          "difficulty",
          "stability",
          "due_at",
          "last_review_at",
          "scheduled_days",
          "elapsed_days",
          "learning_steps",
          "repetitions",
          "lapses",
          "last_review_id",
          "updated_at",
        ]);
    }

    const totals = (await trx("lingocafe.questionnaire_answers")
      .where({ round_id: roundId })
      .select(
        trx.raw("count(*)::int as answered_count"),
        trx.raw("count(*) FILTER (WHERE is_correct)::int as correct_count")
      )
      .first()) as { answered_count: number; correct_count: number };
    const complete = totals.answered_count === round.actual_question_count;
    await trx("lingocafe.questionnaire_rounds")
      .where({ id: roundId })
      .update({
        correct_count: totals.correct_count,
        score_total: totals.answered_count,
        ...(complete ? { status: "completed", completed_at: now } : {}),
      });

    const updated = await loadOwnedRoundRow(trx, userId, roundId);
    if (!updated) throw new Error("Answered questionnaire round could not be loaded.");
    return loadRound(trx, updated);
  });
};

export const abandonQuestionnaireRound = async ({
  userId,
  roundId,
  now = new Date(),
}: {
  userId: string;
  roundId: string;
  now?: Date;
}) => {
  const db = getDB();
  return db.transaction(async (trx) => {
    let round = await loadOwnedRoundRow(trx, userId, roundId, true);
    if (!round) throw new QuestionnaireServiceError("not_found", "Questionnaire round not found.");
    if (round.status === "in_progress") {
      await trx("lingocafe.questionnaire_rounds")
        .where({ id: roundId })
        .update({ status: "abandoned", completed_at: now });
      round = await loadOwnedRoundRow(trx, userId, roundId);
    }
    if (!round) throw new Error("Abandoned questionnaire round could not be loaded.");
    return loadRound(trx, round);
  });
};

export const finalizeQuestionnaireRound = async ({
  userId,
  roundId,
  now = new Date(),
}: {
  userId: string;
  roundId: string;
  now?: Date;
}) => {
  const db = getDB();
  return db.transaction(async (trx) => {
    let round = await loadOwnedRoundRow(trx, userId, roundId, true);
    if (!round) throw new QuestionnaireServiceError("not_found", "Questionnaire round not found.");
    if (round.status === "abandoned") {
      throw new QuestionnaireServiceError("conflict", "An abandoned round cannot be finalized.");
    }
    if (round.status === "in_progress") {
      const totals = (await trx("lingocafe.questionnaire_answers")
        .where({ round_id: roundId })
        .select(
          trx.raw("count(*)::int as answered_count"),
          trx.raw("count(*) FILTER (WHERE is_correct)::int as correct_count")
        )
        .first()) as { answered_count: number; correct_count: number };
      if (totals.answered_count !== round.actual_question_count) {
        throw new QuestionnaireServiceError("conflict", "Every question must be answered before finalizing.");
      }
      await trx("lingocafe.questionnaire_rounds").where({ id: roundId }).update({
        status: "completed",
        correct_count: totals.correct_count,
        score_total: totals.answered_count,
        completed_at: now,
      });
      round = await loadOwnedRoundRow(trx, userId, roundId);
    }
    if (!round) throw new Error("Finalized questionnaire round could not be loaded.");
    return loadRound(trx, round);
  });
};

export const questionnaireErrorResponse = (error: unknown) => {
  if (error instanceof QuestionnaireServiceError) {
    const status =
      error.code === "not_found"
        ? 404
        : error.code === "validation"
          ? 400
          : 409;
    return Response.json(
      { error: error.code, message: error.message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
  console.error("Questionnaire service failed", error);
  return Response.json(
    { error: "server", message: "Questionnaire operation failed." },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  );
};

export const questionnaireJson = (data: unknown, init?: ResponseInit) =>
  Response.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...init?.headers },
  });
