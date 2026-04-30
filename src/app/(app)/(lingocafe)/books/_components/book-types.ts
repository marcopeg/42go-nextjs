export type ReaderBook = {
  id: string;
  project: string;
  lang: string;
  level: string;
  title: string;
  author: string;
  tags: string[];
  info: Record<string, unknown>;
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

export type ReaderBookInfoPage = {
  bookId: string;
  pageId: string;
  position: number;
  kind: string;
  prefix: string | null;
  title: string;
  href: string;
};

export type ReaderBookPageSummary = ReaderBookInfoPage;

export type ReaderBookInfo = ReaderBook & {
  description: string;
  readingAction: ReaderBookReadingAction;
  pages: ReaderBookInfoPage[];
};

export type ReaderBookPageNeighbor = {
  bookId: string;
  pageId: string;
  position: number;
  prefix: string | null;
  title: string;
  href: string;
};

export type ReaderBookPage = {
  book: {
    id: string;
    project: string;
    lang: string;
    level: string;
    title: string;
    author: string;
    info: Record<string, unknown>;
    cover: string | null;
    coverFallback: string;
  };
  page: {
    bookId: string;
    pageId: string;
    position: number;
    kind: string;
    prefix: string | null;
    title: string;
    summary: string | null;
    content: string;
  };
  previous: ReaderBookPageNeighbor | null;
  next: ReaderBookPageNeighbor | null;
  pages: ReaderBookPageSummary[];
};
