export type ReaderBook = {
  id: string;
  lang: string;
  level: string;
  title: string;
  author: string;
  tags: string[];
  cover: string | null;
  coverFallback: string;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ReaderBookReadingAction = {
  kind: "start" | "resume" | "unavailable";
  label: "Read now" | "Continue reading" | "No pages available";
  href: string | null;
  bookId: string;
  pageId: string | null;
  progressBps: number | null;
};

export type ReaderBookInfo = ReaderBook & {
  description: string;
  readingAction: ReaderBookReadingAction;
};
