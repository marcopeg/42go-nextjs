"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { AppLayout } from "@/42go/layouts/app";
import type { Policy } from "@/42go/policy/types";
import { BookInfoContent } from "@/app/(app)/(lingocafe)/books/_components/BookInfoContent";
import { useLingocafeRouteLoading } from "@/app/(app)/(lingocafe)/books/_components/useLingocafeRouteLoading";
import type {
  ReaderBookInfo,
  ReaderBookInfoPage,
  ReaderBookReadingAction,
} from "@/app/(app)/(lingocafe)/books/_components/book-types";

type BookInfoResponse = {
  book: ReaderBookInfo;
};

const coverFallbackUrl = "/images/lingocafe/placeholder.jpg";
const collapsedDescriptionMinWords = 30;
const BOOK_DETAILS_PAGE_POLICY: Policy = {
  require: { feature: "page:books", session: true },
};

const normalizeInfo = (info: unknown): Record<string, unknown> => {
  if (!info || typeof info !== "object" || Array.isArray(info)) return {};
  return info as Record<string, unknown>;
};

const createUnavailableReadingAction = (bookId: string): ReaderBookReadingAction => ({
  kind: "unavailable",
  label: "No pages available",
  href: null,
  bookId,
  pageId: null,
  progressBps: null,
  updatedAt: null,
});

const isReadingAction = (
  action: ReaderBookInfo["readingAction"] | undefined
): action is ReaderBookReadingAction =>
  !!action &&
  ["start", "resume", "unavailable"].includes(action.kind) &&
  typeof action.label === "string" &&
  (typeof action.href === "string" || action.href === null) &&
  typeof action.bookId === "string" &&
  (typeof action.pageId === "string" || action.pageId === null) &&
  (typeof action.progressBps === "number" || action.progressBps === null) &&
  (typeof action.updatedAt === "string" ||
    action.updatedAt === null ||
    action.updatedAt === undefined);

const isBookInfoPage = (page: unknown): page is ReaderBookInfoPage => {
  if (!page || typeof page !== "object") return false;

  const value = page as Partial<ReaderBookInfoPage>;

  return (
    typeof value.bookId === "string" &&
    typeof value.pageId === "string" &&
    typeof value.position === "number" &&
    typeof value.kind === "string" &&
    (typeof value.prefix === "string" || value.prefix === null) &&
    typeof value.title === "string" &&
    typeof value.href === "string"
  );
};

const normalizeBookInfo = (payload: Partial<BookInfoResponse>) => {
  const book = payload.book;
  if (!book) return null;

  const readingAction = isReadingAction(book.readingAction)
    ? {
        ...createUnavailableReadingAction(book.id),
        ...book.readingAction,
        bookId: book.id,
      }
    : createUnavailableReadingAction(book.id);

  return {
    ...book,
    info: normalizeInfo(book.info),
    cover: book.cover ?? null,
    coverFallback: book.coverFallback || coverFallbackUrl,
    tags: Array.isArray(book.tags) ? book.tags : [],
    description: book.description || "",
    readingAction,
    completedAt:
      typeof book.completedAt === "string" ? book.completedAt : null,
    pages: Array.isArray(book.pages) ? book.pages.filter(isBookInfoPage) : [],
  };
};

const MobileBookInfo = ({
  book,
  loading,
  error,
  collapsedDescriptionMinWords,
  onCompletedAtChange,
}: {
  book: ReaderBookInfo | null;
  loading: boolean;
  error: string | null;
  collapsedDescriptionMinWords: number;
  onCompletedAtChange: (completedAt: string | null) => void;
}) => (
  <div className="min-w-0 max-w-full overflow-x-hidden bg-background px-4 py-5 md:hidden">
    {loading && (
      <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        Loading book...
      </div>
    )}
    {error && (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    )}
    {!loading && !error && book && (
      <BookInfoContent
        book={book}
        collapsedDescriptionMinWords={collapsedDescriptionMinWords}
        onCompletedAtChange={onCompletedAtChange}
      />
    )}
  </div>
);

const BookInfoPage = () => {
  const params = useParams<{ bookId: string | string[] }>();
  const { status } = useSession();
  const bookIdParam = params?.bookId;
  const bookId = Array.isArray(bookIdParam) ? bookIdParam[0] : bookIdParam || "";
  const [book, setBook] = useState<ReaderBookInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showLoading = useLingocafeRouteLoading({
    isLoading: loading,
    canDelay: !!book,
  });
  const visibleError = showLoading ? null : error;
  const updateCompletedAt = useCallback((completedAt: string | null) => {
    setBook((current) => (current ? { ...current, completedAt } : current));
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !bookId) {
      return;
    }

    const controller = new AbortController();

    const loadBook = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/lingocafe/books/${encodeURIComponent(bookId)}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (res.status === 404) {
          throw new Error("Book not found.");
        }

        if (!res.ok) {
          throw new Error("Could not load book.");
        }

        const payload = normalizeBookInfo(await res.json());
        if (!payload) {
          throw new Error("Could not load book.");
        }

        setBook(payload);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setBook(null);
        setError(err instanceof Error ? err.message : "Could not load book.");
      } finally {
        setLoading(false);
      }
    };

    loadBook();

    return () => controller.abort();
  }, [bookId, status]);

  return (
    <AppLayout
      title={
        <>
          <span className="md:hidden">Book details</span>
          <span className="hidden md:inline">All books</span>
        </>
      }
      stickyHeader={true}
      hideMobileMenu
      backBtn={{ to: "/books" }}
      disablePadding
      policy={BOOK_DETAILS_PAGE_POLICY}
    >
      <MobileBookInfo
        book={book}
        loading={showLoading}
        error={visibleError}
        collapsedDescriptionMinWords={collapsedDescriptionMinWords}
        onCompletedAtChange={updateCompletedAt}
      />

      <div className="hidden min-w-0 max-w-full px-6 pb-6 pt-6 md:block">
        {showLoading && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            Loading book...
          </div>
        )}
        {visibleError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {visibleError}
          </div>
        )}
        {!showLoading && !visibleError && book && (
          <BookInfoContent
            book={book}
            collapsedDescriptionMinWords={collapsedDescriptionMinWords}
            onCompletedAtChange={updateCompletedAt}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default BookInfoPage;
