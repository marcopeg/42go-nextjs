import type { ReaderBook } from "@/app/(app)/(lingocafe)/books/_components/book-types";

const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

const compareBooksByTitle = (left: ReaderBook, right: ReaderBook) =>
  collator.compare(left.title, right.title);

const getReadingActionTime = (book: ReaderBook) => {
  const updatedAt = book.readingAction.updatedAt;
  if (!updatedAt) return 0;

  const time = new Date(updatedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const compareBooksByRecentReading = (left: ReaderBook, right: ReaderBook) => {
  const timeDelta = getReadingActionTime(right) - getReadingActionTime(left);
  return timeDelta || compareBooksByTitle(left, right);
};

const compareBooksByRecentCompletion = (left: ReaderBook, right: ReaderBook) => {
  const leftTime = left.completedAt ? new Date(left.completedAt).getTime() : 0;
  const rightTime = right.completedAt
    ? new Date(right.completedAt).getTime()
    : 0;
  return rightTime - leftTime || compareBooksByTitle(left, right);
};

const isCurrentlyReadingBook = (book: ReaderBook) =>
  !book.completedAt &&
  book.readingAction.kind === "resume" &&
  typeof book.readingAction.href === "string";

export const getTargetLevelsForPreference = (
  targetLevel: string | null | undefined
): string[] => {
  const normalized = (targetLevel ?? "").trim().toLowerCase();
  if (normalized === "a1") return ["a1"];
  if (normalized === "b2") return ["b2", "c1", "c2"];
  // Default to intermediate: a2, b1
  return ["a2", "b1"];
};

export const filterBooksByLevel = (
  books: ReaderBook[],
  targetLevel: string | null | undefined
): ReaderBook[] => {
  if (books.length === 0 || !targetLevel) return books;

  const desiredLevels = getTargetLevelsForPreference(targetLevel);

  // 1. Filter by desired level band
  const matched = books.filter((book) => {
    const bookLevel = (book.level ?? "").trim().toLowerCase();
    return desiredLevels.includes(bookLevel);
  });

  if (matched.length > 0) {
    return matched;
  }

  // 2. If no results (e.g. A1 has no books), automatically fallback to A2
  const a2Fallback = books.filter((book) => {
    const bookLevel = (book.level ?? "").trim().toLowerCase();
    return bookLevel === "a2" || bookLevel === "b1";
  });

  if (a2Fallback.length > 0) {
    return a2Fallback;
  }

  // 3. Fallback to all books if neither desired nor A2 exist
  return books;
};

export const buildBookshelfSections = (
  books: ReaderBook[],
  targetLevel?: string | null
) => {
  const filtered = targetLevel ? filterBooksByLevel(books, targetLevel) : books;

  const currentlyReading = filtered
    .filter(isCurrentlyReadingBook)
    .sort(compareBooksByRecentReading);
  const catalog = filtered
    .filter((book) => !book.completedAt && !isCurrentlyReadingBook(book))
    .sort(compareBooksByTitle);
  const completed = filtered
    .filter((book) => book.completedAt)
    .sort(compareBooksByRecentCompletion);

  return {
    currentlyReading,
    catalog,
    completed,
    hasCurrentlyReading: currentlyReading.length > 0,
    hasCompleted: completed.length > 0,
  };
};
