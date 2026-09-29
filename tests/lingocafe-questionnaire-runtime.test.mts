import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  QUESTIONNAIRE_DESIRED_RETENTION,
  applyQuestionnaireReview,
  buildQuestionnaireReviewSeed,
  questionnaireFsrsParameters,
  questionnaireFsrsParametersDigest,
  type QuestionnaireMemory,
} from "../src/lib/lingocafe/questionnaire-fsrs.ts";
import {
  rankQuestionnaireCandidates,
  type QuestionnaireCandidate,
} from "../src/lib/lingocafe/questionnaire-selection.ts";

const now = new Date("2026-09-22T12:00:00.000Z");

const memory = ({
  dueAt,
  stability = 10,
  repetitions = 2,
}: {
  dueAt: string;
  stability?: number;
  repetitions?: number;
}): QuestionnaireMemory => ({
  card_state: "review",
  difficulty: 5,
  stability,
  due_at: dueAt,
  last_review_at: "2026-09-01T12:00:00.000Z",
  scheduled_days: 10,
  elapsed_days: 10,
  learning_steps: 0,
  repetitions,
  lapses: 0,
});

const candidate = (
  questionId: string,
  itemMemory: QuestionnaireMemory | null
): QuestionnaireCandidate => ({
  questionnaireId: "pilot",
  questionId,
  revisionDigest: questionId.padEnd(64, "0"),
  answerSetId: "answers",
  learningItems: [{ id: `li-${questionId}`, memory: itemMemory }],
});

test("FSRS adapter pins version-six parameters and stable provenance", () => {
  assert.equal(QUESTIONNAIRE_DESIRED_RETENTION, 0.9);
  assert.equal(questionnaireFsrsParameters.request_retention, 0.9);
  assert.equal(questionnaireFsrsParameters.enable_fuzz, true);
  assert.equal(questionnaireFsrsParameters.enable_short_term, true);
  assert.equal(questionnaireFsrsParameters.w.length, 21);
  assert.match(questionnaireFsrsParametersDigest, /^[0-9a-f]{64}$/);
});

test("stable review seeds and FSRS transitions make retries reproducible", () => {
  const seedInput = {
    userId: "reader-1",
    questionnaireId: "pilot",
    learningItemId: "concept-1",
    reviewOrdinal: 1,
  };
  const seed = buildQuestionnaireReviewSeed(seedInput);
  assert.equal(seed, buildQuestionnaireReviewSeed(seedInput));

  const first = applyQuestionnaireReview({
    memory: null,
    correct: true,
    reviewedAt: now,
    seed,
  });
  const retry = applyQuestionnaireReview({
    memory: null,
    correct: true,
    reviewedAt: now,
    seed,
  });
  assert.equal(first.rating, 3);
  assert.deepEqual(first.memory, retry.memory);
  assert.deepEqual(first.stateAfter, retry.stateAfter);

  const wrong = applyQuestionnaireReview({
    memory: null,
    correct: false,
    reviewedAt: now,
    seed,
  });
  assert.equal(wrong.rating, 1);
});

test("candidate order is due urgency, unseen coverage, then weakest recall", () => {
  const ordered = rankQuestionnaireCandidates(
    [
      candidate(
        "retained-strong",
        memory({ dueAt: "2026-10-01T12:00:00.000Z", stability: 40 })
      ),
      candidate("unseen", null),
      candidate(
        "due-less-urgent",
        memory({ dueAt: "2026-09-21T12:00:00.000Z", stability: 10 })
      ),
      candidate(
        "retained-weak",
        memory({ dueAt: "2026-10-01T12:00:00.000Z", stability: 2 })
      ),
      candidate(
        "due-most-urgent",
        memory({ dueAt: "2026-09-20T12:00:00.000Z", stability: 2 })
      ),
    ],
    now
  );

  assert.deepEqual(
    ordered.map((item) => item.questionId),
    [
      "due-most-urgent",
      "due-less-urgent",
      "unseen",
      "retained-weak",
      "retained-strong",
    ]
  );
});

test("runtime source keeps grading server-side and answer keys behind answers", async () => {
  const source = await readFile(
    new URL(
      "../src/app/api/(lingocafe)/lingocafe/_lib/questionnaires.ts",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(source, /option\.is_correct \? 3 : 1/);
  assert.match(source, /correctOption = answer/);
  assert.match(source, /answer:\s*answer\s*\?/);
  assert.match(source, /`\/books\/read\/\$\{encodeURIComponent\(round\.book_id\)\}/);
  assert.match(source, /\.forUpdate\(\)/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /This question was already answered differently/);
});

test("all questionnaire routes use protected reader sessions", async () => {
  const paths = [
    "../src/app/api/(lingocafe)/lingocafe/books/[bookId]/questionnaire/rounds/route.ts",
    "../src/app/api/(lingocafe)/lingocafe/questionnaire-rounds/[roundId]/route.ts",
    "../src/app/api/(lingocafe)/lingocafe/questionnaire-rounds/[roundId]/items/[position]/answer/route.ts",
    "../src/app/api/(lingocafe)/lingocafe/questionnaire-rounds/[roundId]/abandon/route.ts",
    "../src/app/api/(lingocafe)/lingocafe/questionnaire-rounds/[roundId]/finalize/route.ts",
  ];
  for (const path of paths) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /protectRoute/);
    assert.match(source, /feature: "api:lingocafe", session: true/);
    assert.match(source, /getSessionUserId/);
  }
});
