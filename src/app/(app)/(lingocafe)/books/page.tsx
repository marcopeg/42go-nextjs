"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { AppLayout } from "@/42go/layouts/app";
import type { TComponentBlock } from "@/42go/components/ContentBlock/blocks/ComponentBlock";
import type { Policy } from "@/42go/policy/types";
import {
  LanguagePreferencesMenu,
  type LanguagePreferenceBand,
} from "@/app/(app)/(lingocafe)/_components/LanguagePreferencesMenu";
import { BookCard } from "@/app/(app)/(lingocafe)/books/_components/BookCard";
import { buildBookshelfSections } from "@/app/(app)/(lingocafe)/books/_components/bookshelf";
import type { ReaderBook } from "@/app/(app)/(lingocafe)/books/_components/book-types";
import { preloadDeviceSpeechVoices } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/device-speech-provider";
import { useLingocafeRouteLoading } from "@/app/(app)/(lingocafe)/books/_components/useLingocafeRouteLoading";
import type { TConsentData } from "@/42go/profile";
import { getLingoCafeReaderLanguages } from "@/config/lingocafe/profile-options";
import { NotificationCenter } from "@/42go/components/Notifications";

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
        completedAt:
          typeof book.completedAt === "string" ? book.completedAt : null,
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

const BooksGrid = ({
  books,
  onBookCompletedAtChange,
}: {
  books: ReaderBook[];
  onBookCompletedAtChange: (
    bookId: string,
    completedAt: string | null
  ) => void;
}) => (
  <div className="grid min-w-0 max-w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
    {books.map((book) => (
      <BookCard
        key={book.id}
        book={book}
        onCompletedAtChange={(completedAt) =>
          onBookCompletedAtChange(book.id, completedAt)
        }
      />
    ))}
  </div>
);

const BooksSection = ({
  title,
  books,
  onBookCompletedAtChange,
}: {
  title?: string;
  books: ReaderBook[];
  onBookCompletedAtChange: (
    bookId: string,
    completedAt: string | null
  ) => void;
}) => (
  <section className="min-w-0 space-y-3">
    {title ? (
      <h2 className="text-base font-semibold tracking-normal text-foreground sm:text-lg">
        {title}
      </h2>
    ) : null}
    <BooksGrid
      books={books}
      onBookCompletedAtChange={onBookCompletedAtChange}
    />
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

  useEffect(() => {
    preloadDeviceSpeechVoices();
  }, []);

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
  const preferenceBand: LanguagePreferenceBand =
    data?.profile?.targetLevel === "a1"
      ? "beginner"
      : data?.profile?.targetLevel === "b2"
        ? "advanced"
        : "intermediate";
  const headerActions: TComponentBlock[] =
    !showProfileIncomplete && data?.profile?.targetLang
      ? [
          {
            type: "component",
            component: LanguagePreferencesMenu,
            props: {
              targetLanguage: data.profile.targetLang,
              band: preferenceBand,
              onSaved: () => void loadBooks(),
            },
          },
        ]
      : [];
  const updateBookCompletedAt = useCallback(
    (bookId: string, completedAt: string | null) => {
      setData((current) =>
        current
          ? {
              ...current,
              books: current.books.map((book) =>
                book.id === bookId ? { ...book, completedAt } : book
              ),
            }
          : current
      );
    },
    []
  );
  const bookshelf = useMemo(() => {
    return buildBookshelfSections(data?.books ?? []);
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
        <NotificationCenter />
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
                  onBookCompletedAtChange={updateBookCompletedAt}
                />
              ) : null}

              {!bookshelf.hasCurrentlyReading ||
              bookshelf.catalog.length > 0 ? (
                <BooksSection
                  title={bookshelf.hasCurrentlyReading ? "Catalog" : undefined}
                  books={bookshelf.catalog}
                  onBookCompletedAtChange={updateBookCompletedAt}
                />
              ) : null}

              {bookshelf.hasCompleted ? (
                <BooksSection
                  title="Completed"
                  books={bookshelf.completed}
                  onBookCompletedAtChange={updateBookCompletedAt}
                />
              ) : null}
            </div>
          )}
      </div>
    </AppLayout>
  );
};

export default BooksPage;
