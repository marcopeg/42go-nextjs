"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { AppLayout } from "@/42go/layouts/app";
import {
  BookReaderDesktopSurface,
  BookReaderMobileSurface,
} from "@/app/(app)/(lingocafe)/books/_components/BookReaderSurfaces";
import type {
  ReaderBookPage,
  ReaderBookPageNeighbor,
  ReaderBookPageSummary,
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

const isPageSummary = (value: unknown): value is ReaderBookPageSummary => {
  if (!value || typeof value !== "object") return false;
  const page = value as Partial<ReaderBookPageSummary>;

  return (
    typeof page.bookId === "string" &&
    typeof page.pageId === "string" &&
    typeof page.position === "number" &&
    typeof page.kind === "string" &&
    (typeof page.prefix === "string" || page.prefix === null) &&
    typeof page.title === "string" &&
    typeof page.href === "string"
  );
};

const normalizeBookPage = (
  payload: Partial<BookPageResponse>
): ReaderBookPage | null => {
  const bookPage = payload.bookPage;
  if (!bookPage?.book || !bookPage.page) return null;

  if (
    typeof bookPage.book.id !== "string" ||
    typeof bookPage.book.lang !== "string" ||
    typeof bookPage.book.level !== "string" ||
    typeof bookPage.book.title !== "string" ||
    typeof bookPage.book.author !== "string" ||
    (typeof bookPage.book.cover !== "string" && bookPage.book.cover !== null) ||
    typeof bookPage.book.coverFallback !== "string" ||
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
      lang: bookPage.book.lang,
      level: bookPage.book.level,
      title: bookPage.book.title,
      author: bookPage.book.author,
      cover: bookPage.book.cover,
      coverFallback: bookPage.book.coverFallback,
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
    pages: Array.isArray(bookPage.pages)
      ? bookPage.pages.filter(isPageSummary)
      : [],
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

  return (
    <AppLayout
      title="Reading"
      stickyHeader={false}
      hideMobileMenu
      backBtn={{ to: backHref }}
      disablePadding
      policy={{ require: { feature: "page:books", session: true } }}
    >
      <BookReaderMobileSurface
        bookPage={bookPage}
        loading={loading}
        error={error}
        scrollRef={mobileScrollRef}
        backHref={backHref}
      />

      <BookReaderDesktopSurface
        bookPage={bookPage}
        loading={loading}
        error={error}
        scrollRef={desktopScrollRef}
        backHref={backHref}
      />
    </AppLayout>
  );
};

export default BookReadPage;
