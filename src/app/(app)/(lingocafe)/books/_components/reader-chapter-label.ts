import type { ReaderBookPage } from "./book-types.ts";

export const getReaderChapterLabel = (bookPage: ReaderBookPage) => {
  const chapters = bookPage.pages.filter((page) => page.kind === "chapter");
  const index = chapters.findIndex((page) => page.pageId === bookPage.page.pageId);
  if (bookPage.page.kind === "chapter" && index >= 0) {
    return `Chapter ${index + 1} / ${chapters.length}`;
  }
  return bookPage.page.prefix?.trim() || bookPage.page.title;
};
