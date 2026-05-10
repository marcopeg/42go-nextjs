"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { Modal } from "@/42go/components/modal";
import { useTheme } from "@/42go/config/ThemeProvider";
import { AppLayout } from "@/42go/layouts/app";
import type { Policy } from "@/42go/policy/types";
import {
  BookReaderDesktopSurface,
  BookReaderMobileSurface,
  type ReaderHeaderTitleMode,
} from "@/app/(app)/(lingocafe)/books/_components/BookReaderSurfaces";
import { BookReaderPreferencesPanel } from "@/app/(app)/(lingocafe)/books/_components/BookReaderPreferencesPanel";
import { BookReaderTableOfContents } from "@/app/(app)/(lingocafe)/books/_components/BookReaderTableOfContents";
import { useLingocafeRouteLoading } from "@/app/(app)/(lingocafe)/books/_components/useLingocafeRouteLoading";
import type {
  ReaderBookPage,
  ReaderBookPageNeighbor,
  ReaderBookPageSummary,
} from "@/app/(app)/(lingocafe)/books/_components/book-types";
import {
  READER_PREFERENCES_STORAGE_KEY,
  getDefaultReaderPreferences,
  readStoredReaderPreferencesStore,
  sanitizeReaderPreferences,
  sanitizeReaderFontSizeIndex,
  type ReaderPreferencesStore,
  type ReaderThemeMode,
  type ReaderThemeProfileKey,
  type ReaderPreferences,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";

type BookPageResponse = {
  bookPage: ReaderBookPage;
};
type ReaderRouteState = {
  href: string;
  apiHref: string;
  bookId: string;
  pageId: string;
  progressBps: number | null;
};
const READER_SCROLL_PROGRESS_IDLE_SAVE_MS = 4000;
const READER_HEADER_TITLE_TOP_THRESHOLD_PX = 12;
const READER_HEADER_TITLE_DIRECTION_THRESHOLD_PX = 6;
const BOOK_READER_PAGE_POLICY: Policy = {
  require: { feature: "page:books", session: true },
};

type ReaderSurfaceKey = "desktop" | "mobile";

const clampProgressBps = (value: number) =>
  Math.min(10000, Math.max(0, Math.round(value)));

const parseParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

const parseProgressParam = (value: string | null) => {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampProgressBps(parsed) : null;
};

const parseReaderRouteHref = (href: string): ReaderRouteState | null => {
  try {
    const url = new URL(href, "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);
    const [root, rawBookId, rawPageId] = segments;

    if (root !== "books" || !rawBookId || !rawPageId || segments.length !== 3) {
      return null;
    }

    const routeBookId = decodeURIComponent(rawBookId);
    const routePageId = decodeURIComponent(rawPageId);

    return {
      href: `${url.pathname}${url.search}`,
      apiHref: `/api/lingocafe/books/${encodeURIComponent(
        routeBookId
      )}/pages/${encodeURIComponent(routePageId)}`,
      bookId: routeBookId,
      pageId: routePageId,
      progressBps: parseProgressParam(url.searchParams.get("progress_bps")),
    };
  } catch {
    return null;
  }
};

const buildReaderRouteState = (
  bookId: string,
  pageId: string,
  progressBps: number | null
): ReaderRouteState | null => {
  if (!bookId || !pageId) return null;

  const pathname = `/books/${encodeURIComponent(bookId)}/${encodeURIComponent(
    pageId
  )}`;
  const search =
    progressBps === null
      ? ""
      : `?${new URLSearchParams({
          progress_bps: String(progressBps),
        }).toString()}`;

  return {
    href: `${pathname}${search}`,
    apiHref: `/api/lingocafe/books/${encodeURIComponent(
      bookId
    )}/pages/${encodeURIComponent(pageId)}`,
    bookId,
    pageId,
    progressBps,
  };
};

const normalizeInfo = (info: unknown): Record<string, unknown> => {
  if (!info || typeof info !== "object" || Array.isArray(info)) return {};
  return info as Record<string, unknown>;
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

const normalizeProgress = (
  value: unknown
): ReaderBookPage["progress"] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const progress = value as Partial<NonNullable<ReaderBookPage["progress"]>>;

  if (
    typeof progress.bookId !== "string" ||
    typeof progress.pageId !== "string" ||
    typeof progress.progressBps !== "number"
  ) {
    return null;
  }

  return {
    bookId: progress.bookId,
    pageId: progress.pageId,
    progressBps: clampProgressBps(progress.progressBps),
  };
};

const normalizeBookPage = (
  payload: Partial<BookPageResponse>
): ReaderBookPage | null => {
  const bookPage = payload.bookPage;
  if (!bookPage?.book || !bookPage.page) return null;

  if (
    typeof bookPage.book.id !== "string" ||
    typeof bookPage.book.project !== "string" ||
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
      project: bookPage.book.project,
      lang: bookPage.book.lang,
      level: bookPage.book.level,
      title: bookPage.book.title,
      author: bookPage.book.author,
      info: normalizeInfo(bookPage.book.info),
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
    translation: {
      enabled: bookPage.translation?.enabled === true,
      from:
        typeof bookPage.translation?.from === "string"
          ? bookPage.translation.from
          : bookPage.book.lang,
      to:
        typeof bookPage.translation?.to === "string"
          ? bookPage.translation.to
          : null,
    },
    progress: normalizeProgress(bookPage.progress),
  };
};

const getScrollProgressBps = (element: HTMLElement) => {
  const scrollable = element.scrollHeight - element.clientHeight;
  if (scrollable <= 0) return 0;
  return clampProgressBps((element.scrollTop / scrollable) * 10000);
};

const scrollToProgressBps = (element: HTMLElement, progressBps: number) => {
  const scrollable = element.scrollHeight - element.clientHeight;
  if (scrollable <= 0) {
    if (progressBps === 0) {
      element.scrollTop = 0;
      return true;
    }
    return false;
  }
  element.scrollTop = (scrollable * progressBps) / 10000;
  return true;
};

const getHeaderTitleModeForScroll = (
  scrollTop: number,
  delta: number,
  currentMode: ReaderHeaderTitleMode
): ReaderHeaderTitleMode => {
  if (scrollTop <= READER_HEADER_TITLE_TOP_THRESHOLD_PX) {
    return "book";
  }

  if (delta >= READER_HEADER_TITLE_DIRECTION_THRESHOLD_PX) {
    return "page";
  }

  if (delta <= -READER_HEADER_TITLE_DIRECTION_THRESHOLD_PX) {
    return "book";
  }

  return currentMode;
};

const getInitialReaderPreferences = () => {
  if (typeof window === "undefined") {
    return {};
  }

  return readStoredReaderPreferencesStore();
};

const BookReadPage = () => {
  const params = useParams<{
    bookId: string | string[];
    pageId: string | string[];
  }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { resolvedTheme, theme } = useTheme();
  const bookId = parseParam(params?.bookId);
  const pageId = parseParam(params?.pageId);
  const urlProgressBps = useMemo(
    () => parseProgressParam(searchParams.get("progress_bps")),
    [searchParams]
  );
  const routeFromUrl = useMemo(
    () => buildReaderRouteState(bookId, pageId, urlProgressBps),
    [bookId, pageId, urlProgressBps]
  );
  const desktopScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);
  const restoredKeyRef = useRef("");
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestProgressRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef<Record<ReaderSurfaceKey, number>>({
    desktop: 0,
    mobile: 0,
  });
  const [readerRoute, setReaderRoute] = useState<ReaderRouteState | null>(
    routeFromUrl
  );
  const [bookPage, setBookPage] = useState<ReaderBookPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readingProgressBps, setReadingProgressBps] = useState(0);
  const [headerTitleMode, setHeaderTitleMode] =
    useState<ReaderHeaderTitleMode>("book");
  const [readerPreferencesStore, setReaderPreferencesStore] =
    useState<ReaderPreferencesStore>(getInitialReaderPreferences);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isTableOfContentsOpen, setIsTableOfContentsOpen] = useState(false);
  const showLoading = useLingocafeRouteLoading({
    isLoading: loading,
    canDelay: !!bookPage,
  });
  const visibleError = showLoading ? null : error;
  const readerSurfaceLoading = !bookPage && showLoading;
  const readerSurfaceError = bookPage ? null : visibleError;
  const readerThemeMode: ReaderThemeMode =
    resolvedTheme === "dark" ? "dark" : "light";
  const activeReaderThemeProfile: ReaderThemeProfileKey =
    theme === "light" || theme === "dark" ? theme : "system";
  const storedReaderPreferences =
    readerPreferencesStore[activeReaderThemeProfile] ?? null;
  const canResetReaderPreferences = Boolean(storedReaderPreferences);
  const baseReaderPreferences =
    storedReaderPreferences ?? getDefaultReaderPreferences(readerThemeMode);
  const readerPreferences = {
    ...baseReaderPreferences,
    fontSizeIndex:
      sanitizeReaderFontSizeIndex(readerPreferencesStore.sharedFontSizeIndex) ??
      baseReaderPreferences.fontSizeIndex,
  };

  const apiHref = readerRoute?.apiHref || "";
  const bookshelfHref = "/books";
  const activeBookId = bookPage?.book.id || readerRoute?.bookId || bookId;
  const bookInfoHref = activeBookId
    ? `/books/${encodeURIComponent(activeBookId)}`
    : bookshelfHref;
  const handleReaderOpenChange = (next: boolean) => {
    if (!next) {
      router.push(bookshelfHref);
    }
  };

  const navigateToReaderPage = useCallback(
    (href: string) => {
      const nextRoute = parseReaderRouteHref(href);

      if (!nextRoute) {
        router.push(href);
        return;
      }

      if (readerRoute?.href === nextRoute.href) return;

      setReaderRoute((current) =>
        current?.href === nextRoute.href ? current : nextRoute
      );
    },
    [readerRoute?.href, router]
  );

  const openPreferences = () => {
    setIsPreferencesOpen(true);
  };

  const openTableOfContents = () => {
    setIsTableOfContentsOpen(true);
  };

  useEffect(() => {
    if (Object.keys(readerPreferencesStore).length === 0) {
      localStorage.removeItem(READER_PREFERENCES_STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      READER_PREFERENCES_STORAGE_KEY,
      JSON.stringify(readerPreferencesStore)
    );
  }, [readerPreferencesStore]);

  const updateReaderPreferences = (next: Partial<ReaderPreferences>) => {
    setReaderPreferencesStore((current) => {
      const nextStore: ReaderPreferencesStore = {
        ...current,
        [activeReaderThemeProfile]: sanitizeReaderPreferences({
          ...readerPreferences,
          ...current[activeReaderThemeProfile],
          ...next,
        }),
      };

      const sharedFontSizeIndex = sanitizeReaderFontSizeIndex(next.fontSizeIndex);
      if (sharedFontSizeIndex !== null) {
        nextStore.sharedFontSizeIndex = sharedFontSizeIndex;
      }

      return nextStore;
    });
  };
  const resetReaderPreferences = () => {
    setReaderPreferencesStore((current) => {
      const next = { ...current };
      delete next[activeReaderThemeProfile];
      return next;
    });
  };

  useEffect(() => {
    if (!routeFromUrl) return;
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      setReaderRoute((current) =>
        current?.href === routeFromUrl.href ? current : routeFromUrl
      );
    });

    return () => {
      active = false;
    };
  }, [routeFromUrl]);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = parseReaderRouteHref(
        `${window.location.pathname}${window.location.search}`
      );
      if (!nextRoute) return;

      setReaderRoute((current) =>
        current?.href === nextRoute.href ? current : nextRoute
      );
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

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
        const nextHref = readerRoute?.href;
        if (
          nextHref &&
          typeof window !== "undefined" &&
          `${window.location.pathname}${window.location.search}` !== nextHref
        ) {
          window.history.pushState(null, "", nextHref);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load page.");
      } finally {
        setLoading(false);
      }
    };

    loadPage();

    return () => controller.abort();
  }, [apiHref, readerRoute?.href, status]);

  useEffect(() => {
    if (!bookPage) return;
    const restoreProgressBps =
      readerRoute?.progressBps ??
      (bookPage.progress?.pageId === bookPage.page.pageId
        ? bookPage.progress.progressBps
        : 0);
    const restoreKey = `${bookPage.page.bookId}:${bookPage.page.pageId}:${restoreProgressBps}`;
    if (restoredKeyRef.current === restoreKey) return;

    let frame = 0;
    let attempts = 0;

    const restore = () => {
      const target =
        window.matchMedia("(min-width: 768px)").matches
          ? desktopScrollRef.current
          : mobileScrollRef.current;

      if (!target) {
        if (attempts >= 8) return;
        attempts += 1;
        frame = requestAnimationFrame(restore);
        return;
      }
      const restored = scrollToProgressBps(target, restoreProgressBps);
      const surfaceKey: ReaderSurfaceKey = window.matchMedia(
        "(min-width: 768px)"
      ).matches
        ? "desktop"
        : "mobile";

      lastScrollTopRef.current[surfaceKey] = target.scrollTop;
      setReadingProgressBps(restoreProgressBps);
      setHeaderTitleMode(
        target.scrollTop <= READER_HEADER_TITLE_TOP_THRESHOLD_PX
          ? "book"
          : "page"
      );

      if (restored || attempts >= 8) {
        restoredKeyRef.current = restoreKey;
        return;
      }

      attempts += 1;
      frame = requestAnimationFrame(restore);
    };

    frame = requestAnimationFrame(restore);

    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [bookPage, readerRoute?.progressBps]);

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

    const scheduleProgress = (
      surfaceKey: ReaderSurfaceKey,
      element: HTMLElement
    ) => {
      const previousScrollTop = lastScrollTopRef.current[surfaceKey];
      const currentScrollTop = element.scrollTop;
      const delta = currentScrollTop - previousScrollTop;

      lastScrollTopRef.current[surfaceKey] = currentScrollTop;
      setHeaderTitleMode((currentMode) =>
        getHeaderTitleModeForScroll(currentScrollTop, delta, currentMode)
      );

      const currentProgressBps = getScrollProgressBps(element);
      latestProgressRef.current = currentProgressBps;
      setReadingProgressBps(currentProgressBps);

      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }

      scrollTimerRef.current = setTimeout(() => {
        if (latestProgressRef.current === null) return;
        void sendProgress(latestProgressRef.current);
        latestProgressRef.current = null;
        scrollTimerRef.current = null;
      }, READER_SCROLL_PROGRESS_IDLE_SAVE_MS);
    };

    const onDesktopScroll = () => {
      if (desktopElement) scheduleProgress("desktop", desktopElement);
    };
    const onMobileScroll = () => {
      if (mobileElement) scheduleProgress("mobile", mobileElement);
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
      title={bookPage?.book.title || "Reading"}
      stickyHeader={false}
      hideMobileMenu
      backBtn={{ to: bookshelfHref }}
      disablePadding
      policy={BOOK_READER_PAGE_POLICY}
    >
      <Modal
        open
        onOpenChange={handleReaderOpenChange}
        ariaLabel="Reading"
        presentation="panel"
        anchor="right"
        size="full"
        showClose={false}
        closeOnOverlayClick={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        overlayClassName="pointer-events-none !bg-transparent"
        className="md:!w-screen md:!max-w-none md:!border-l-0"
        bodyClassName="flex min-h-0 !overflow-hidden p-0"
      >
        <BookReaderMobileSurface
          bookPage={bookPage}
          loading={readerSurfaceLoading}
          error={readerSurfaceError}
          scrollRef={mobileScrollRef}
          backHref={bookshelfHref}
          readingProgressBps={readingProgressBps}
          headerTitleMode={headerTitleMode}
          preferences={readerPreferences}
          onOpenTableOfContents={openTableOfContents}
          onOpenPreferences={openPreferences}
          onNavigatePage={navigateToReaderPage}
        />

        <BookReaderDesktopSurface
          bookPage={bookPage}
          loading={readerSurfaceLoading}
          error={readerSurfaceError}
          scrollRef={desktopScrollRef}
          backHref={bookshelfHref}
          readingProgressBps={readingProgressBps}
          headerTitleMode={headerTitleMode}
          preferences={readerPreferences}
          onOpenTableOfContents={openTableOfContents}
          onOpenPreferences={openPreferences}
          onNavigatePage={navigateToReaderPage}
        />

        <BookReaderPreferencesPanel
          open={isPreferencesOpen}
          onOpenChange={setIsPreferencesOpen}
          preferences={readerPreferences}
          onPreferencesChange={updateReaderPreferences}
          canResetPreferences={canResetReaderPreferences}
          onResetPreferences={resetReaderPreferences}
        />

        <BookReaderTableOfContents
          open={isTableOfContentsOpen}
          onOpenChange={setIsTableOfContentsOpen}
          bookPage={bookPage}
          bookInfoHref={bookInfoHref}
          onNavigatePage={navigateToReaderPage}
        />
      </Modal>
    </AppLayout>
  );
};

export default BookReadPage;
