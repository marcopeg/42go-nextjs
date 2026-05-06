import ReactMarkdown, { type Components } from "react-markdown";

import type { ReaderBookPage } from "@/app/(app)/(lingocafe)/books/_components/book-types";
import {
  getReaderFont,
  getReaderFontSize,
  type ReaderPreferences,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";

type BookPageReaderProps = {
  bookPage: ReaderBookPage;
  preferences: ReaderPreferences;
};

const createMarkdownComponents = (
  preferences: ReaderPreferences
): Components => {
  const font = getReaderFont(preferences);

  return {
    h1: ({ children }) => (
      <h1
        className="mb-5 mt-8 text-[2em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.15 }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className="mb-4 mt-7 text-[1.75em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.2 }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className="mb-3 mt-6 text-[1.35em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.28 }}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        className="mb-3 mt-5 text-[1.15em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.32 }}
      >
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5
        className="mb-2 mt-4 text-[1em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.35 }}
      >
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6
        className="mb-2 mt-4 text-[0.92em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.35 }}
      >
        {children}
      </h6>
    ),
    p: ({ children }) => (
      <p
        className="my-7 break-words text-[1em] leading-[1.85]"
        style={{ fontFamily: font.family }}
      >
        {children}
      </p>
    ),
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
  };
};

const BookPageMarkdown = ({
  source,
  preferences,
}: {
  source: string;
  preferences: ReaderPreferences;
}) => (
  <div className="min-w-0 max-w-none">
    <ReactMarkdown
      allowedElements={["h1", "h2", "h3", "h4", "h5", "h6", "p", "em", "strong"]}
      components={createMarkdownComponents(preferences)}
      skipHtml
    >
      {source}
    </ReactMarkdown>
  </div>
);

export const BookPageReader = ({
  bookPage,
  preferences,
}: BookPageReaderProps) => {
  const font = getReaderFont(preferences);
  const fontSize = getReaderFontSize(preferences);
  const titleSize = Math.round(fontSize * 1.7);
  const summarySize = Math.max(14, Math.round(fontSize * 0.9));

  return (
    <article
      className="mx-auto flex w-full max-w-[680px] flex-col px-1 pb-16 pt-10 md:px-0 md:pb-24 md:pt-24"
      style={{ fontFamily: font.family, fontSize: `${fontSize}px` }}
    >
      <header className="mb-12 text-center">
        {bookPage.page.prefix && (
          <p
            className="mx-auto max-w-xl break-words text-sm"
            style={{ color: "var(--reader-fg-muted)" }}
          >
            {bookPage.page.prefix}
          </p>
        )}
        <h1
          className="mx-auto mt-4 max-w-2xl break-words font-semibold leading-[1.02] tracking-[-0.03em]"
          style={{ fontFamily: font.family, fontSize: `${titleSize}px` }}
        >
          {bookPage.page.title}
        </h1>
        <div
          className="mx-auto mt-8 flex w-52 items-center justify-center gap-3"
          style={{ color: "var(--reader-fg-muted)" }}
        >
          <span
            className="h-px flex-1"
            style={{ backgroundColor: "var(--reader-border)" }}
          />
          <span className="text-lg leading-none">*</span>
          <span
            className="h-px flex-1"
            style={{ backgroundColor: "var(--reader-border)" }}
          />
        </div>
        {bookPage.page.summary && (
          <p
            className="mx-auto mt-8 max-w-xl break-words italic leading-7"
            style={{
              color: "var(--reader-fg-muted)",
              fontFamily: font.family,
              fontSize: `${summarySize}px`,
            }}
          >
            {bookPage.page.summary}
          </p>
        )}
      </header>

      <BookPageMarkdown
        source={bookPage.page.content}
        preferences={preferences}
      />
    </article>
  );
};
