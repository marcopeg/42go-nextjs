import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type {
  ReaderBookPage,
  ReaderBookPageNeighbor,
} from "@/app/(app)/(lingocafe)/books/_components/book-types";
import { Button } from "@/components/ui/button";

type BookPageReaderProps = {
  bookPage: ReaderBookPage;
};

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-5 mt-8 text-3xl font-semibold tracking-normal">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-4 mt-7 text-2xl font-semibold tracking-normal">
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
    <p className="my-5 break-words text-lg leading-8">{children}</p>
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

const PageNavButton = ({
  page,
  direction,
}: {
  page: ReaderBookPageNeighbor;
  direction: "previous" | "next";
}) => {
  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ChevronLeft : ChevronRight;
  const label = isPrevious ? "Previous" : "Next";

  return (
    <Button variant="outline" asChild className="h-auto min-h-14 justify-start">
      <Link
        href={page.href}
        className={isPrevious ? "text-left" : "text-right sm:justify-end"}
      >
        {isPrevious && <Icon className="h-4 w-4 shrink-0" />}
        <span className="min-w-0">
          <span className="block text-xs text-muted-foreground">{label}</span>
          <span className="block truncate text-sm font-medium">
            {page.prefix ? `${page.prefix}: ${page.title}` : page.title}
          </span>
        </span>
        {!isPrevious && <Icon className="h-4 w-4 shrink-0" />}
      </Link>
    </Button>
  );
};

export const BookPageReader = ({ bookPage }: BookPageReaderProps) => (
  <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
    <header className="space-y-3">
      {bookPage.page.prefix && (
        <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
          {bookPage.page.prefix}
        </p>
      )}
      <div className="space-y-2">
        <h2 className="break-words text-3xl font-semibold tracking-normal md:text-4xl">
          {bookPage.page.title}
        </h2>
        <p className="text-base text-muted-foreground">
          {bookPage.book.title} · {bookPage.book.author}
        </p>
      </div>
      {bookPage.page.summary && (
        <p className="break-words text-base leading-7 text-muted-foreground">
          {bookPage.page.summary}
        </p>
      )}
    </header>

    <BookPageMarkdown source={bookPage.page.content} />

    {(bookPage.previous || bookPage.next) && (
      <nav
        aria-label="Page navigation"
        className="grid gap-3 border-t pt-6 sm:grid-cols-2"
      >
        {bookPage.previous ? (
          <PageNavButton page={bookPage.previous} direction="previous" />
        ) : (
          <div className="hidden sm:block" />
        )}
        {bookPage.next && <PageNavButton page={bookPage.next} direction="next" />}
      </nav>
    )}
  </article>
);
