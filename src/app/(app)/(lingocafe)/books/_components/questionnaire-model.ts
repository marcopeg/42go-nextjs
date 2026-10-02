export type QuestionnaireOption = {
  id: string;
  text: string;
};

export type QuestionnairePageLink = {
  bookId: string;
  pageId: string;
  title: string;
  prefix: string | null;
  href: string;
};

export type QuestionnaireAnswer = {
  selectedOptionId: string;
  isCorrect: boolean;
  appliedRating: number;
  durationMs: number | null;
  answeredAt: string;
  correctOption: QuestionnaireOption | null;
  rationale: string | null;
  pageLinks: QuestionnairePageLink[];
};

export type QuestionnaireRoundItem = {
  position: number;
  questionId: string;
  prompt: string;
  responseMode: string;
  options: QuestionnaireOption[];
  answer: QuestionnaireAnswer | null;
};

export type QuestionnaireRound = {
  id: string;
  bookId: string;
  questionnaireId: string;
  title: string;
  mode: string;
  selectionPolicy: string;
  selectionPolicyVersion: string;
  requestedQuestionCount: number;
  actualQuestionCount: number;
  answeredCount: number;
  currentPosition: number | null;
  status: "in_progress" | "completed" | "abandoned";
  correctCount: number;
  scoreTotal: number;
  startedAt: string;
  completedAt: string | null;
  items: QuestionnaireRoundItem[];
};

const objectValue = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const stringValue = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;

const finiteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeOption = (value: unknown): QuestionnaireOption | null => {
  const option = objectValue(value);
  if (!option) return null;
  const id = stringValue(option.id);
  const text = stringValue(option.text);
  return id && text ? { id, text } : null;
};

const shuffleOptionsForRound = (
  options: QuestionnaireOption[],
  roundId: string,
  questionId: string
): QuestionnaireOption[] => {
  let seed = 2166136261;
  for (const character of `${roundId}:${questionId}`) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  }
  const nextRandom = () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };

  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const normalizePageLink = (value: unknown): QuestionnairePageLink | null => {
  const link = objectValue(value);
  if (!link) return null;
  const bookId = stringValue(link.bookId);
  const pageId = stringValue(link.pageId);
  const title = stringValue(link.title);
  const href = stringValue(link.href);
  const prefix = typeof link.prefix === "string" ? link.prefix : null;
  return bookId && pageId && title && href
    ? { bookId, pageId, title, prefix, href }
    : null;
};

const normalizeAnswer = (
  value: unknown,
  options: QuestionnaireOption[]
): QuestionnaireAnswer | null => {
  const answer = objectValue(value);
  if (!answer) return null;
  const selectedOptionId = stringValue(answer.selectedOptionId);
  const appliedRating = finiteNumber(answer.appliedRating);
  const answeredAt = stringValue(answer.answeredAt);
  if (
    !selectedOptionId ||
    !options.some((option) => option.id === selectedOptionId) ||
    typeof answer.isCorrect !== "boolean" ||
    appliedRating === null ||
    !answeredAt
  ) {
    return null;
  }
  const correctOption = answer.correctOption
    ? normalizeOption(answer.correctOption)
    : null;
  const pageLinks = Array.isArray(answer.pageLinks)
    ? answer.pageLinks
        .map(normalizePageLink)
        .filter((link): link is QuestionnairePageLink => link !== null)
    : [];

  return {
    selectedOptionId,
    isCorrect: answer.isCorrect,
    appliedRating,
    durationMs:
      answer.durationMs === null || finiteNumber(answer.durationMs) !== null
        ? (answer.durationMs as number | null)
        : null,
    answeredAt,
    correctOption,
    rationale: typeof answer.rationale === "string" ? answer.rationale : null,
    pageLinks,
  };
};

const normalizeItem = (value: unknown, roundId: string): QuestionnaireRoundItem | null => {
  const item = objectValue(value);
  if (!item) return null;
  const position = finiteNumber(item.position);
  const questionId = stringValue(item.questionId);
  const prompt = stringValue(item.prompt);
  const responseMode = stringValue(item.responseMode);
  const options = Array.isArray(item.options)
    ? item.options
        .map(normalizeOption)
        .filter((option): option is QuestionnaireOption => option !== null)
    : [];
  if (
    position === null ||
    !Number.isInteger(position) ||
    position < 1 ||
    !questionId ||
    !prompt ||
    !responseMode ||
    options.length < 2
  ) {
    return null;
  }
  const displayOptions = shuffleOptionsForRound(options, roundId, questionId);
  const answer = item.answer === null ? null : normalizeAnswer(item.answer, displayOptions);
  if (item.answer !== null && !answer) return null;
  return { position, questionId, prompt, responseMode, options: displayOptions, answer };
};

export const normalizeQuestionnaireRound = (payload: unknown): QuestionnaireRound | null => {
  const root = objectValue(payload);
  const round = objectValue(root?.round);
  if (!round || !Array.isArray(round.items)) return null;
  const roundId = stringValue(round.id);
  if (!roundId) return null;
  const items = round.items
    .map((item) => normalizeItem(item, roundId))
    .filter((item): item is QuestionnaireRoundItem => item !== null)
    .sort((left, right) => left.position - right.position);
  const status = round.status;
  const actualQuestionCount = finiteNumber(round.actualQuestionCount);
  const currentPosition =
    round.currentPosition === null ? null : finiteNumber(round.currentPosition);
  if (
    !["in_progress", "completed", "abandoned"].includes(String(status)) ||
    actualQuestionCount === null ||
    items.length !== actualQuestionCount ||
    new Set(items.map((item) => item.position)).size !== items.length
  ) {
    return null;
  }
  const strings = [
    "id",
    "bookId",
    "questionnaireId",
    "title",
    "mode",
    "selectionPolicy",
    "selectionPolicyVersion",
    "startedAt",
  ] as const;
  if (strings.some((key) => !stringValue(round[key]))) return null;
  const numbers = [
    "requestedQuestionCount",
    "answeredCount",
    "correctCount",
    "scoreTotal",
  ] as const;
  if (numbers.some((key) => finiteNumber(round[key]) === null)) return null;
  if (
    status === "in_progress" &&
    (currentPosition === null ||
      !items.some((item) => item.position === currentPosition && !item.answer))
  ) {
    return null;
  }

  return {
    id: round.id as string,
    bookId: round.bookId as string,
    questionnaireId: round.questionnaireId as string,
    title: round.title as string,
    mode: round.mode as string,
    selectionPolicy: round.selectionPolicy as string,
    selectionPolicyVersion: round.selectionPolicyVersion as string,
    requestedQuestionCount: round.requestedQuestionCount as number,
    actualQuestionCount,
    answeredCount: round.answeredCount as number,
    currentPosition,
    status: status as QuestionnaireRound["status"],
    correctCount: round.correctCount as number,
    scoreTotal: round.scoreTotal as number,
    startedAt: round.startedAt as string,
    completedAt: typeof round.completedAt === "string" ? round.completedAt : null,
    items,
  };
};

export const getCurrentQuestionnaireItem = (round: QuestionnaireRound) =>
  round.status === "in_progress"
    ? round.items.find((item) => item.position === round.currentPosition) ?? null
    : null;

export const getWrongQuestionnaireItems = (round: QuestionnaireRound) =>
  round.items.filter((item) => item.answer && !item.answer.isCorrect);

export const getSelectedQuestionnaireOption = (item: QuestionnaireRoundItem) =>
  item.answer
    ? item.options.find((option) => option.id === item.answer?.selectedOptionId) ?? null
    : null;
