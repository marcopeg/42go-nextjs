"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft } from "lucide-react";

import { AppLayout } from "@/42go/layouts/app";
import { Button } from "@/components/ui/button";
import { BookInfoContent } from "@/app/(app)/(lingocafe)/books/_components/BookInfoContent";
import type { ReaderBookInfo } from "@/app/(app)/(lingocafe)/books/_components/book-types";

type BookInfoResponse = {
  book: ReaderBookInfo;
};

const coverFallbackUrl = "/images/lingocafe/placeholder.jpg";

const normalizeBookInfo = (payload: Partial<BookInfoResponse>) => {
  const book = payload.book;
  if (!book) return null;

  return {
    ...book,
    cover: book.cover ?? null,
    coverFallback: book.coverFallback || coverFallbackUrl,
    tags: Array.isArray(book.tags) ? book.tags : [],
    description: book.description || "",
  };
};

const MobileBookInfo = ({
  book,
  loading,
  error,
}: {
  book: ReaderBookInfo | null;
  loading: boolean;
  error: string | null;
}) => (
  <div className="md:hidden fixed inset-0 z-[500] bg-background">
    <div className="absolute inset-0 flex flex-col" style={{ height: "100dvh" }}>
      <div className="flex items-center gap-3 border-b bg-background px-4 pb-3 pt-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/books" aria-label="Back to books">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">
            {book?.title || "Book details"}
          </div>
          {book?.author && (
            <div className="truncate text-sm text-muted-foreground">
              {book.author}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-5">
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
        {!loading && !error && book && <BookInfoContent book={book} />}
      </div>
    </div>
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

  const title = book?.title || "Book details";
  const subtitle = book?.author;

  return (
    <AppLayout
      title={title}
      subtitle={subtitle}
      stickyHeader={true}
      hideMobileMenu
      backBtn={{ to: "/books" }}
      policy={{ require: { feature: "page:books", session: true } }}
    >
      <MobileBookInfo book={book} loading={loading} error={error} />

      <div className="hidden min-w-0 max-w-full md:block">
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
        {!loading && !error && book && <BookInfoContent book={book} />}
      </div>
    </AppLayout>
  );
};

export default BookInfoPage;
