"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft } from "lucide-react";

import { AppLayout } from "@/42go/layouts/app";
import { Button } from "@/components/ui/button";
import { BookPageReader } from "@/app/(app)/(lingocafe)/books/_components/BookPageReader";
import type {
  ReaderBookPage,
  ReaderBookPageNeighbor,
} from "@/app/(app)/(lingocafe)/books/_components/book-types";

type BookPageResponse = {
  bookPage: ReaderBookPage;
};

const clampProgressBps = (value: number) =>
  Math.min(10000, Math.max(0, Math.round(value)));

const parseParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

const parseProgressParam = (value: string | null) => {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampProgressBps(parsed) : 0;
};

const isNeighbor = (value: unknown): value is ReaderBookPageNeighbor => {
  if (!value || typeof value !== "object") return false;
  const neighbor = value as Partial<ReaderBookPageNeighbor>;

  return (
    typeof neighbor.bookId === "string" &&
    typeof neighbor.pageId === "string" &&
    typeof neighbor.position === "number" &&
    (typeof neighbor.prefix === "string" || neighbor.prefix === null) &&
    typeof neighbor.title === "string" &&
    typeof neighbor.href === "string"
  );
};

const normalizeBookPage = (
  payload: Partial<BookPageResponse>
): ReaderBookPage | null => {
  const bookPage = payload.bookPage;
  if (!bookPage?.book || !bookPage.page) return null;

  if (
    typeof bookPage.book.id !== "string" ||
    typeof bookPage.book.title !== "string" ||
    typeof bookPage.book.author !== "string" ||
    typeof bookPage.page.bookId !== "string" ||
    typeof bookPage.page.pageId !== "string" ||
    typeof bookPage.page.position !== "number" ||
    typeof bookPage.page.title !== "string"
  ) {
    return null;
  }

  return {
    book: {
      id: bookPage.book.id,
      title: bookPage.book.title,
      author: bookPage.book.author,
    },
    page: {
      bookId: bookPage.page.bookId,
      pageId: bookPage.page.pageId,
      position: bookPage.page.position,
      kind: bookPage.page.kind || "chapter",
      prefix: bookPage.page.prefix ?? null,
      title: bookPage.page.title,
      summary: bookPage.page.summary ?? null,
      content: bookPage.page.content || "",
    },
    previous: isNeighbor(bookPage.previous) ? bookPage.previous : null,
    next: isNeighbor(bookPage.next) ? bookPage.next : null,
  };
};

const getScrollProgressBps = (element: HTMLElement) => {
  const scrollable = element.scrollHeight - element.clientHeight;
  if (scrollable <= 0) return 0;
  return clampProgressBps((element.scrollTop / scrollable) * 10000);
};

const scrollToProgressBps = (element: HTMLElement, progressBps: number) => {
  const scrollable = element.scrollHeight - element.clientHeight;
  if (scrollable <= 0) return;
  element.scrollTop = (scrollable * progressBps) / 10000;
};

const MobileBookPage = ({
  bookPage,
  loading,
  error,
  scrollRef,
  backHref,
}: {
  bookPage: ReaderBookPage | null;
  loading: boolean;
  error: string | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  backHref: string;
}) => (
  <div className="fixed inset-0 z-[600] bg-background md:hidden">
    <div className="absolute inset-0 flex flex-col" style={{ height: "100dvh" }}>
      <div className="flex items-center gap-3 border-b bg-background px-4 pb-3 pt-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref} aria-label="Back to book details">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">
            {bookPage?.page.title || "Reading"}
          </div>
          {bookPage?.book.title && (
            <div className="truncate text-sm text-muted-foreground">
              {bookPage.book.title}
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto px-4 py-5">
        {loading && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            Loading page...
          </div>
        )}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {!loading && !error && bookPage && <BookPageReader bookPage={bookPage} />}
      </div>
    </div>
  </div>
);

const BookReadPage = () => {
  const params = useParams<{
    bookId: string | string[];
    pageId: string | string[];
  }>();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const bookId = parseParam(params?.bookId);
  const pageId = parseParam(params?.pageId);
  const progressBps = useMemo(
    () => parseProgressParam(searchParams.get("progress_bps")),
    [searchParams]
  );
  const desktopScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);
  const restoredKeyRef = useRef("");
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestProgressRef = useRef<number | null>(null);
  const [bookPage, setBookPage] = useState<ReaderBookPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiHref =
    bookId && pageId
      ? `/api/lingocafe/books/${encodeURIComponent(
          bookId
        )}/pages/${encodeURIComponent(pageId)}`
      : "";
  const backHref = bookId ? `/books/${encodeURIComponent(bookId)}` : "/books";

  useEffect(() => {
    if (status !== "authenticated" || !apiHref) {
      return;
    }

    const controller = new AbortController();

    const loadPage = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(apiHref, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (res.status === 404) {
          throw new Error("Book page not found.");
        }

        if (!res.ok) {
          throw new Error("Could not load page.");
        }

        const payload = normalizeBookPage(await res.json());
        if (!payload) {
          throw new Error("Could not load page.");
        }

        setBookPage(payload);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setBookPage(null);
        setError(err instanceof Error ? err.message : "Could not load page.");
      } finally {
        setLoading(false);
      }
    };

    loadPage();

    return () => controller.abort();
  }, [apiHref, status]);

  useEffect(() => {
    if (!bookPage) return;
    const restoreKey = `${bookPage.page.bookId}:${bookPage.page.pageId}:${progressBps}`;
    if (restoredKeyRef.current === restoreKey) return;

    requestAnimationFrame(() => {
      const target =
        window.matchMedia("(min-width: 768px)").matches
          ? desktopScrollRef.current
          : mobileScrollRef.current;

      if (!target) return;
      scrollToProgressBps(target, progressBps);
      restoredKeyRef.current = restoreKey;
    });
  }, [bookPage, progressBps]);

  useEffect(() => {
    if (!bookPage || !apiHref) return;
    const desktopElement = desktopScrollRef.current;
    const mobileElement = mobileScrollRef.current;
    const controller = new AbortController();

    const sendProgress = async (progress: number) => {
      try {
        await fetch(apiHref, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress_bps: progress }),
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("Could not save reading progress", err);
      }
    };

    const sendFinalProgress = (progress: number) => {
      void fetch(apiHref, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress_bps: progress }),
      }).catch((err) => {
        console.warn("Could not save final reading progress", err);
      });
    };

    const scheduleProgress = (element: HTMLElement) => {
      latestProgressRef.current = getScrollProgressBps(element);

      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }

      scrollTimerRef.current = setTimeout(() => {
        if (latestProgressRef.current === null) return;
        void sendProgress(latestProgressRef.current);
        latestProgressRef.current = null;
        scrollTimerRef.current = null;
      }, 10000);
    };

    const onDesktopScroll = () => {
      if (desktopElement) scheduleProgress(desktopElement);
    };
    const onMobileScroll = () => {
      if (mobileElement) scheduleProgress(mobileElement);
    };

    desktopElement?.addEventListener("scroll", onDesktopScroll, { passive: true });
    mobileElement?.addEventListener("scroll", onMobileScroll, { passive: true });

    return () => {
      desktopElement?.removeEventListener("scroll", onDesktopScroll);
      mobileElement?.removeEventListener("scroll", onMobileScroll);

      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }

      if (latestProgressRef.current !== null) {
        sendFinalProgress(latestProgressRef.current);
        latestProgressRef.current = null;
      }

      controller.abort();
    };
  }, [apiHref, bookPage]);

  const title = bookPage?.page.title || "Reading";
  const subtitle = bookPage?.book.title;

  return (
    <AppLayout
      title={title}
      subtitle={subtitle}
      stickyHeader={true}
      hideMobileMenu
      backBtn={{ to: backHref }}
      policy={{ require: { feature: "page:books", session: true } }}
    >
      <MobileBookPage
        bookPage={bookPage}
        loading={loading}
        error={error}
        scrollRef={mobileScrollRef}
        backHref={backHref}
      />

      <div
        ref={desktopScrollRef}
        className="hidden max-h-[calc(100dvh-7rem)] min-w-0 overflow-y-auto md:block"
      >
        {loading && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            Loading page...
          </div>
        )}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {!loading && !error && bookPage && <BookPageReader bookPage={bookPage} />}
      </div>
    </AppLayout>
  );
};

export default BookReadPage;
