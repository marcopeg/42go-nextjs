import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getCurrentQuestionnaireItem,
  getSelectedQuestionnaireOption,
  getWrongQuestionnaireItems,
  normalizeQuestionnaireRound,
} from "../src/app/(app)/(lingocafe)/books/_components/questionnaire-model.ts";

const roundPayload = ({ completed = false }: { completed?: boolean } = {}) => ({
  round: {
    id: "round-1",
    bookId: "book-1",
    questionnaireId: "questionnaire-1",
    title: "Book practice",
    mode: "standard",
    selectionPolicy: "fsrs-due-unseen-retrievability",
    selectionPolicyVersion: "1",
    requestedQuestionCount: 2,
    actualQuestionCount: 2,
    answeredCount: completed ? 2 : 1,
    currentPosition: completed ? null : 2,
    status: completed ? "completed" : "in_progress",
    correctCount: completed ? 1 : 0,
    scoreTotal: completed ? 2 : 1,
    startedAt: "2026-09-22T10:00:00.000Z",
    completedAt: completed ? "2026-09-22T10:05:00.000Z" : null,
    items: [
      {
        position: 1,
        questionId: "q1",
        prompt: "First question?",
        responseMode: "single-select",
        options: [
          { id: "A", text: "Wrong choice" },
          { id: "B", text: "Right choice" },
        ],
        answer: {
          selectedOptionId: "A",
          isCorrect: false,
          appliedRating: 1,
          durationMs: 1200,
          answeredAt: "2026-09-22T10:01:00.000Z",
          correctOption: { id: "B", text: "Right choice" },
          rationale: "The book explains why.",
          pageLinks: [
            {
              bookId: "book-1",
              pageId: "chapter-2",
              title: "Explanation",
              prefix: "Chapter 2",
              href: "/books/read/book-1/chapter-2",
            },
          ],
        },
      },
      {
        position: 2,
        questionId: "q2",
        prompt: "Second question?",
        responseMode: "single-select",
        options: [
          { id: "A", text: "Right" },
          { id: "B", text: "Wrong" },
        ],
        answer: completed
          ? {
              selectedOptionId: "A",
              isCorrect: true,
              appliedRating: 3,
              durationMs: 900,
              answeredAt: "2026-09-22T10:02:00.000Z",
              correctOption: { id: "A", text: "Right" },
              rationale: null,
              pageLinks: [],
            }
          : null,
      },
    ],
  },
});

test("round normalization preserves resume position without deriving grades", () => {
  const round = normalizeQuestionnaireRound(roundPayload());
  assert.ok(round);
  assert.equal(getCurrentQuestionnaireItem(round)?.position, 2);
  assert.equal(round.answeredCount, 1);
  assert.equal(getSelectedQuestionnaireOption(round.items[0])?.text, "Wrong choice");
});

test("answer display order varies by round and stays stable when a round reloads", () => {
  const payload = roundPayload();
  payload.round.items[1].options = [
    { id: "A", text: "First" },
    { id: "B", text: "Second" },
    { id: "C", text: "Third" },
  ];
  const originalIds = payload.round.items[1].options.map((option) => option.id);
  const first = normalizeQuestionnaireRound(payload);
  assert.ok(first);
  assert.deepEqual(
    normalizeQuestionnaireRound(payload)?.items[1].options,
    first.items[1].options
  );
  assert.deepEqual(
    first.items[1].options.map((option) => option.id).sort(),
    [...originalIds].sort()
  );
  assert.deepEqual(payload.round.items[1].options.map((option) => option.id), originalIds);

  const firstPositions = new Set<string>();
  for (let index = 0; index < 60; index += 1) {
    payload.round.id = `round-${index}`;
    const round = normalizeQuestionnaireRound(payload);
    assert.ok(round);
    firstPositions.add(round.items[1].options[0].id);
  }
  assert.deepEqual(firstPositions, new Set(originalIds));
});

test("completed results identify mistakes and exact remediation links", () => {
  const round = normalizeQuestionnaireRound(roundPayload({ completed: true }));
  assert.ok(round);
  const wrong = getWrongQuestionnaireItems(round);
  assert.equal(wrong.length, 1);
  assert.equal(wrong[0].answer?.correctOption?.text, "Right choice");
  assert.equal(wrong[0].answer?.pageLinks[0]?.href, "/books/read/book-1/chapter-2");
});

test("malformed and stale play responses fail closed", () => {
  const malformed = roundPayload();
  malformed.round.currentPosition = 99;
  assert.equal(normalizeQuestionnaireRound(malformed), null);

  const missingOption = roundPayload({ completed: true });
  missingOption.round.items[0].answer!.selectedOptionId = "missing";
  assert.equal(normalizeQuestionnaireRound(missingOption), null);
});

test("book eligibility is data-driven and answer-free", async () => {
  const readerSource = await readFile(
    new URL("../src/app/api/(lingocafe)/lingocafe/_lib/reader.ts", import.meta.url),
    "utf8"
  );
  const bookSource = await readFile(
    new URL(
      "../src/app/(app)/(lingocafe)/books/_components/BookInfoContent.tsx",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(readerSource, /questionnaire\.status": "active"/);
  assert.match(readerSource, /question\.status/);
  assert.match(readerSource, /learning_item\.status/);
  assert.match(readerSource, /countDistinct\(\{ question_count: "question\.id" \}\)/);
  assert.doesNotMatch(readerSource, /is_correct/);
  assert.match(bookSource, /book\.questionnaire &&/);
  assert.match(bookSource, /Practice questions/);
});

test("player uses accessible controls and keeps grading on the server", async () => {
  const source = await readFile(
    new URL(
      "../src/app/(app)/(lingocafe)/books/_components/QuestionnaireExperience.tsx",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(source, /<fieldset/);
  assert.match(source, /type="radio"/);
  assert.doesNotMatch(source, /role="progressbar"/);
  assert.match(source, /aria-expanded=\{revealed\}/);
  assert.match(source, /End this round\?/);
  assert.match(source, /item\.responseMode === "single-select"/);
  assert.match(source, /Practice again/);
  assert.match(source, /questionnaire\?round=/);
  assert.match(source, /requestRound\(routeRoundId\)/);
  assert.match(source, /<a href=\{page\.href\}>/);
  assert.doesNotMatch(source, /<Link href=\{page\.href\}>/);
  assert.match(source, /max-w-3xl px-4 py-6 md:px-8/);
  assert.match(source, /<SwipeableBottomSheet/);
  assert.match(source, /<Modal/);
  assert.doesNotMatch(source, /ts-fsrs|appliedRating\s*=|isCorrect\s*=/);
});
