"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { AppLayout } from "@/42go/layouts/app";
import type { TComponentBlock } from "@/42go/components/ContentBlock/blocks/ComponentBlock";
import type { Policy } from "@/42go/policy/types";
import { BookCard } from "@/app/(app)/(lingocafe)/books/_components/BookCard";
import { BooksHeaderLanguageFlag } from "@/app/(app)/(lingocafe)/books/_components/BooksHeaderLanguageFlag";
import type { ReaderBook } from "@/app/(app)/(lingocafe)/books/_components/book-types";
import { useLingocafeRouteLoading } from "@/app/(app)/(lingocafe)/books/_components/useLingocafeRouteLoading";
import type { TConsentData } from "@/42go/profile";
import { getLingoCafeReaderLanguages } from "@/config/lingocafe/profile-options";

type LanguageOption = {
  code: string;
  label: string;
};

type LevelOption = {
  code: string;
  label: string;
};

type ReaderProfile = {
  userId: string;
  ownLang: string | null;
  targetLang: string | null;
  targetLevel: string | null;
  isComplete: boolean;
  data: unknown;
  consent: TConsentData | null;
};

type ReaderData = {
  profile: ReaderProfile | null;
  books: ReaderBook[];
  languages: {
    own: LanguageOption[];
    target: LanguageOption[];
    levels: LevelOption[];
  };
};

const fallbackLanguages = getLingoCafeReaderLanguages();
const coverFallbackUrl = "/images/lingocafe/placeholder.jpg";
const fallbackReadingAction: ReaderBook["readingAction"] = {
  kind: "unavailable",
  label: "No pages available",
  href: null,
  bookId: "",
  pageId: null,
  progressBps: null,
  updatedAt: null,
};
const BOOKS_PAGE_POLICY: Policy = {
  require: { feature: "page:books", session: true },
};

const normalizeBookInfo = (info: unknown): Record<string, unknown> => {
  if (!info || typeof info !== "object" || Array.isArray(info)) return {};
  return info as Record<string, unknown>;
};

const normalizeReaderData = (payload: Partial<ReaderData>): ReaderData => ({
  profile: payload.profile ?? null,
  books: Array.isArray(payload.books)
    ? payload.books.map((book) => ({
        ...book,
        info: normalizeBookInfo(book.info),
        cover: book.cover ?? null,
        coverFallback: book.coverFallback || coverFallbackUrl,
        readingAction: {
          ...fallbackReadingAction,
          ...(book.readingAction ?? {}),
          bookId: book.id,
        },
      }))
    : [],
  languages: {
    own:
      Array.isArray(payload.languages?.own) && payload.languages.own.length > 0
        ? payload.languages.own
        : fallbackLanguages.own,
    target: Array.isArray(payload.languages?.target)
      ? payload.languages.target
      : fallbackLanguages.target,
    levels:
      Array.isArray(payload.languages?.levels) &&
      payload.languages.levels.length > 0
        ? payload.languages.levels
        : fallbackLanguages.levels,
  },
});

const getResponseMessage = async (res: Response, fallback: string) => {
  const payload = (await res.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  return typeof payload?.message === "string" ? payload.message : fallback;
};

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

const isCurrentlyReadingBook = (book: ReaderBook) =>
  book.readingAction.kind === "resume" &&
  typeof book.readingAction.href === "string";

const BooksGrid = ({ books }: { books: ReaderBook[] }) => (
  <div className="grid min-w-0 max-w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
    {books.map((book) => (
      <BookCard key={book.id} book={book} />
    ))}
  </div>
);

const BooksSection = ({
  title,
  books,
}: {
  title?: string;
  books: ReaderBook[];
}) => (
  <section className="min-w-0 space-y-3">
    {title ? (
      <h2 className="text-base font-semibold tracking-normal text-foreground sm:text-lg">
        {title}
      </h2>
    ) : null}
    <BooksGrid books={books} />
  </section>
);

const BooksPage = () => {
  const { status } = useSession();
  const [data, setData] = useState<ReaderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showLoading = useLingocafeRouteLoading({
    isLoading: loading,
    canDelay: !!data,
  });

  const loadBooks = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/lingocafe/books", {
          credentials: "same-origin",
          cache: "no-store",
          signal,
        });

        if (!res.ok) {
          throw new Error(await getResponseMessage(res, "Could not load books."));
        }

        const payload = normalizeReaderData(await res.json());
        setData(payload);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load books.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      loadBooks(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadBooks, status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const reloadAfterProfileCompletion = () => {
      loadBooks();
    };

    window.addEventListener("profile:complete", reloadAfterProfileCompletion);

    return () =>
      window.removeEventListener(
        "profile:complete",
        reloadAfterProfileCompletion
      );
  }, [loadBooks, status]);

  const targetLabel =
    data?.languages.target.find(
      (option) => option.code === data.profile?.targetLang
    )?.label || data?.profile?.targetLang;
  const showProfileIncomplete = !!data && !data.profile?.isComplete;
  const headerActions: TComponentBlock[] =
    !showProfileIncomplete && data?.profile?.targetLang
      ? [
          {
            type: "component",
            component: BooksHeaderLanguageFlag,
            props: {
              code: data.profile.targetLang,
              label: targetLabel,
            },
          },
        ]
      : [];
  const bookshelf = useMemo(() => {
    const books = data?.books ?? [];
    const currentlyReading = books
      .filter(isCurrentlyReadingBook)
      .sort(compareBooksByRecentReading);
    const catalog = books
      .filter((book) => !isCurrentlyReadingBook(book))
      .sort(compareBooksByTitle);

    return {
      currentlyReading,
      catalog,
      hasCurrentlyReading: currentlyReading.length > 0,
    };
  }, [data?.books]);

  return (
    <AppLayout
      title="Bookshelf"
      subtitle={
        showProfileIncomplete
          ? "Profile incomplete."
          : targetLabel
            ? undefined
            : "Here are the books."
      }
      actions={headerActions}
      stickyHeader={true}
      policy={BOOKS_PAGE_POLICY}
    >
      <div className="min-w-0 max-w-full overflow-x-clip space-y-6">
        {error && !showLoading && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {showLoading && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            Loading books...
          </div>
        )}

        {!showLoading && showProfileIncomplete && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            Profile incomplete, can&apos;t show books now.
          </div>
        )}

        {!showLoading &&
          !showProfileIncomplete &&
          data &&
          data.books.length === 0 && (
            <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
              No books are available for this language yet.
            </div>
          )}

        {!showLoading &&
          !showProfileIncomplete &&
          data &&
          data.books.length > 0 && (
            <div className="min-w-0 space-y-8">
              {bookshelf.hasCurrentlyReading ? (
                <BooksSection
                  title="Currently Reading"
                  books={bookshelf.currentlyReading}
                />
              ) : null}

              {!bookshelf.hasCurrentlyReading ||
              bookshelf.catalog.length > 0 ? (
                <BooksSection
                  title={bookshelf.hasCurrentlyReading ? "Catalog" : undefined}
                  books={bookshelf.catalog}
                />
              ) : null}
            </div>
          )}
      </div>
    </AppLayout>
  );
};

export default BooksPage;
