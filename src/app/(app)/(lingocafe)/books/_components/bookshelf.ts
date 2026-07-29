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

export const buildBookshelfSections = (books: ReaderBook[]) => {
  const currentlyReading = books
    .filter(isCurrentlyReadingBook)
    .sort(compareBooksByRecentReading);
  const catalog = books
    .filter((book) => !book.completedAt && !isCurrentlyReadingBook(book))
    .sort(compareBooksByTitle);
  const completed = books
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
