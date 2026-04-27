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

export type ReaderBookInfo = ReaderBook & {
  description: string;
};
