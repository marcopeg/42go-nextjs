import ReactMarkdown, { type Components } from "react-markdown";

import type { ReaderBookPage } from "@/app/(app)/(lingocafe)/books/_components/book-types";

type BookPageReaderProps = {
  bookPage: ReaderBookPage;
};

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-5 mt-8 font-serif text-3xl font-semibold tracking-normal">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-4 mt-7 font-serif text-2xl font-semibold tracking-normal">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-3 mt-6 text-xl font-semibold tracking-normal">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-3 mt-5 text-lg font-semibold tracking-normal">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="mb-2 mt-4 text-base font-semibold tracking-normal">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="mb-2 mt-4 text-sm font-semibold tracking-normal">
      {children}
    </h6>
  ),
  p: ({ children }) => (
    <p className="my-7 break-words font-serif text-[1.35rem] leading-[1.85] md:text-[1.45rem]">
      {children}
    </p>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
};

const BookPageMarkdown = ({ source }: { source: string }) => (
  <div className="min-w-0 max-w-none">
    <ReactMarkdown
      allowedElements={["h1", "h2", "h3", "h4", "h5", "h6", "p", "em", "strong"]}
      components={markdownComponents}
      skipHtml
    >
      {source}
    </ReactMarkdown>
  </div>
);

const getChapterLabel = (bookPage: ReaderBookPage) => {
  const total = bookPage.pages.length || 1;
  const currentIndex = bookPage.pages.findIndex(
    (page) => page.pageId === bookPage.page.pageId
  );
  const current = currentIndex >= 0 ? currentIndex + 1 : bookPage.page.position;
  return `Kapitel ${Math.min(total, current)} av ${total}`;
};

export const BookPageReader = ({ bookPage }: BookPageReaderProps) => (
  <article className="mx-auto flex w-full max-w-[680px] flex-col px-1 pb-16 pt-10 md:px-0 md:pb-24 md:pt-24">
    <header className="mb-12 text-center">
      <p className="text-sm text-muted-foreground">{getChapterLabel(bookPage)}</p>
      <h1 className="mx-auto mt-6 max-w-xl break-words font-serif text-4xl font-semibold leading-tight tracking-normal md:text-5xl">
        {bookPage.page.prefix ? `${bookPage.page.prefix}. ` : ""}
        {bookPage.page.title}
      </h1>
      <div className="mx-auto mt-8 flex w-52 items-center justify-center gap-3 text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span className="text-lg leading-none">*</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {bookPage.page.summary && (
        <p className="mx-auto mt-8 max-w-xl break-words text-base leading-7 text-muted-foreground">
          {bookPage.page.summary}
        </p>
      )}
    </header>

    <BookPageMarkdown source={bookPage.page.content} />
  </article>
);
