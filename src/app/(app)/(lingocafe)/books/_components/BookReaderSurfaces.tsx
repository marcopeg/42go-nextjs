"use client";

import Link from "next/link";
import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { BookOpenText, ChevronLeft, ChevronRight } from "lucide-react";

import { useTheme } from "@/42go/config/ThemeProvider";
import { BookPageReader } from "@/app/(app)/(lingocafe)/books/_components/BookPageReader";
import { BookReaderPreferencesTrigger } from "@/app/(app)/(lingocafe)/books/_components/BookReaderPreferencesPanel";
import type { ReaderBookPage } from "@/app/(app)/(lingocafe)/books/_components/book-types";
import {
  getReaderThemeStyle,
  type ReaderPreferences,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import { Button } from "@/components/ui/button";

type ReaderSurfaceProps = {
  bookPage: ReaderBookPage | null;
  loading: boolean;
  error: string | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  backHref: string;
  readingProgressBps: number;
  headerTitleMode: ReaderHeaderTitleMode;
  preferences: ReaderPreferences;
  onOpenTableOfContents: () => void;
  onOpenPreferences: () => void;
  onNavigatePage: (href: string) => void;
};

type PageProgressProps = {
  bookPage: ReaderBookPage;
  compact?: boolean;
};

type ReaderNavButtonProps = {
  href: string | null;
  direction: "previous" | "next";
  onNavigatePage: (href: string) => void;
  className?: string;
};

type ReaderHeaderActionProps = {
  onClick: () => void;
  icon: typeof BookOpenText;
  label: string;
};

type ReaderHeaderTitleMode = "book" | "page";

type ReaderHeaderProps = {
  backHref: string;
  readingProgressBps: number;
  bookTitle: string;
  pageTitle: string;
  titleMode: ReaderHeaderTitleMode;
  leading: ReactNode;
  trailing: ReactNode;
  heightClassName: string;
  paddingXClassName: string;
  horizontalPaddingPx: number;
  titleTextClassName: string;
};

const MOBILE_SWIPE_THRESHOLD = 72;
const MOBILE_SWIPE_MAX_VERTICAL_DRIFT = 80;
const MIN_HEADER_TITLE_MAX_WIDTH_PX = 96;

const hasActiveTextSelection = () => {
  const selection = window.getSelection();
  return (
    !!selection &&
    !selection.isCollapsed &&
    selection.toString().trim().length > 0
  );
};

const formatLevelLabel = (bookPage: ReaderBookPage) =>
  `${bookPage.book.lang.toUpperCase()} / ${bookPage.book.level.toUpperCase()}`;

const getReaderPageTitle = (bookPage: ReaderBookPage | null) => {
  if (!bookPage) return "Reading";

  const pageTitle = bookPage.page.title.trim();
  const pagePrefix = bookPage.page.prefix?.trim() || "";
  const pageSummary = bookPage.page.summary?.trim() || "";

  if (pagePrefix && pageTitle) {
    return `${pagePrefix}: ${pageTitle}`;
  }

  if (pageTitle) return pageTitle;
  if (pageSummary) return pageSummary;

  return bookPage.book.title;
};

const getCurrentPageIndex = (bookPage: ReaderBookPage) => {
  const currentIndex = bookPage.pages.findIndex(
    (page) => page.pageId === bookPage.page.pageId
  );

  return currentIndex >= 0 ? currentIndex : Math.max(0, bookPage.page.position - 1);
};

const getCurrentPageLabel = (bookPage: ReaderBookPage) => {
  const total = bookPage.pages.length || 1;
  const current = Math.min(total, getCurrentPageIndex(bookPage) + 1);
  return `Sida ${current} av ${total}`;
};

const getBookProgressPercent = (bookPage: ReaderBookPage) => {
  const total = bookPage.pages.length;
  if (total <= 1) return 0;
  return Math.min(100, Math.max(0, (getCurrentPageIndex(bookPage) / (total - 1)) * 100));
};

const ReaderState = ({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
}) => (
  <div className="mx-auto w-full max-w-xl px-6 py-12">
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
  </div>
);

const shouldLetBrowserHandleClick = (
  event: ReactMouseEvent<HTMLAnchorElement>
) => event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.button !== 0;

const ReaderNavButton = ({
  href,
  direction,
  onNavigatePage,
  className = "",
}: ReaderNavButtonProps) => {
  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ChevronLeft : ChevronRight;
  const label = isPrevious ? "Previous page" : "Next page";
  const baseClass =
    "flex h-11 w-11 items-center justify-center rounded-full border text-current shadow-sm transition";
  const baseStyle = {
    borderColor: "var(--reader-border)",
    backgroundColor: "var(--reader-bg)",
    color: "var(--reader-fg)",
  };

  if (!href) {
    return (
      <span
        aria-hidden="true"
        className={`${baseClass} pointer-events-none opacity-40 ${className}`}
        style={baseStyle}
      >
        <Icon className="h-5 w-5" />
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      onClick={(event) => {
        if (shouldLetBrowserHandleClick(event)) return;

        event.preventDefault();
        onNavigatePage(href);
      }}
      className={`${baseClass} hover:opacity-80 ${className}`}
      style={baseStyle}
    >
      <Icon className="h-5 w-5" />
    </Link>
  );
};

const BookProgress = ({
  bookPage,
  onNavigatePage,
  compact = false,
}: PageProgressProps & { onNavigatePage: (href: string) => void }) => (
  <div className={`flex min-w-0 items-center gap-4 ${compact ? "w-full" : "w-full max-w-sm"}`}>
    <ReaderNavButton
      href={bookPage.previous?.href ?? null}
      direction="previous"
      onNavigatePage={onNavigatePage}
    />
    <div className="min-w-0 flex-1 space-y-2 text-center">
      <div className="text-xs" style={{ color: "var(--reader-fg-muted)" }}>
        {getCurrentPageLabel(bookPage)}
      </div>
      <div
        className="relative h-1 rounded-full"
        style={{ backgroundColor: "var(--reader-border)" }}
      >
        <div
          className="absolute left-0 top-0 h-1 rounded-full"
          style={{
            width: `${getBookProgressPercent(bookPage)}%`,
            backgroundColor: "var(--reader-fg)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
          style={{
            left: `calc(${getBookProgressPercent(bookPage)}% - 6px)`,
            backgroundColor: "var(--reader-fg)",
          }}
        />
      </div>
    </div>
    <ReaderNavButton
      href={bookPage.next?.href ?? null}
      direction="next"
      onNavigatePage={onNavigatePage}
    />
  </div>
);

const ReaderHeaderAction = ({
  onClick,
  icon: Icon,
  label,
}: ReaderHeaderActionProps) => (
  <Button
    variant="ghost"
    type="button"
    onClick={onClick}
    aria-label={label}
    className="h-9 w-9 px-0 text-current hover:bg-black/10 hover:text-current dark:hover:bg-white/10 md:h-10 md:w-10"
  >
    <Icon className="h-4 w-4" />
  </Button>
);

const ReaderHeader = ({
  backHref,
  readingProgressBps,
  bookTitle,
  pageTitle,
  titleMode,
  leading,
  trailing,
  heightClassName,
  paddingXClassName,
  horizontalPaddingPx,
  titleTextClassName,
}: ReaderHeaderProps) => {
  const leadingRef = useRef<HTMLDivElement | null>(null);
  const trailingRef = useRef<HTMLDivElement | null>(null);
  const [titleInsetPx, setTitleInsetPx] = useState(horizontalPaddingPx + 48);

  useLayoutEffect(() => {
    const leadingElement = leadingRef.current;
    const trailingElement = trailingRef.current;

    if (!leadingElement || !trailingElement) return;

    let frame = 0;

    const updateTitleInset = () => {
      frame = 0;
      const nextInset = Math.ceil(
        Math.max(
          leadingElement.getBoundingClientRect().width,
          trailingElement.getBoundingClientRect().width
        ) + horizontalPaddingPx
      );

      setTitleInsetPx((current) =>
        current === nextInset ? current : nextInset
      );
    };

    updateTitleInset();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            if (frame) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(updateTitleInset);
          });

    resizeObserver?.observe(leadingElement);
    resizeObserver?.observe(trailingElement);
    window.addEventListener("resize", updateTitleInset);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateTitleInset);
    };
  }, [horizontalPaddingPx]);

  return (
    <header
      className={`relative shrink-0 border-b ${heightClassName} ${paddingXClassName}`}
      style={{ borderColor: "var(--reader-border)" }}
    >
      <span
        aria-hidden="true"
        className="absolute bottom-[-1px] left-0 h-[2px] bg-blue-500"
        style={{ width: `${(readingProgressBps / 10000) * 100}%` }}
      />

      <div className="relative flex h-full items-center justify-between gap-3">
        <div ref={leadingRef} className="relative z-10 flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref} aria-label="Back to books">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          {leading}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-center">
          <div
            className="relative w-full"
            aria-label={titleMode === "page" ? pageTitle : bookTitle}
            role="status"
            style={{
              maxWidth: `max(${MIN_HEADER_TITLE_MAX_WIDTH_PX}px, calc(100% - ${titleInsetPx * 2}px))`,
            }}
          >
            <span className="sr-only">
              {titleMode === "page" ? pageTitle : bookTitle}
            </span>
            <span
              aria-hidden="true"
              className={`block truncate text-center transition-all duration-200 ease-out ${titleTextClassName} ${
                titleMode === "book"
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-1 opacity-0"
              }`}
            >
              {bookTitle}
            </span>
            <span
              aria-hidden="true"
              className={`absolute inset-0 block truncate text-center transition-all duration-200 ease-out ${titleTextClassName} ${
                titleMode === "page"
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
              }`}
            >
              {pageTitle}
            </span>
          </div>
        </div>

        <div
          ref={trailingRef}
          className="relative z-10 ml-auto flex shrink-0 items-center gap-1"
        >
          {trailing}
        </div>
      </div>
    </header>
  );
};

export type { ReaderHeaderTitleMode };

export const BookReaderDesktopSurface = ({
  bookPage,
  loading,
  error,
  scrollRef,
  backHref,
  readingProgressBps,
  headerTitleMode,
  preferences,
  onOpenTableOfContents,
  onOpenPreferences,
  onNavigatePage,
}: ReaderSurfaceProps) => {
  const { resolvedTheme } = useTheme();
  const readerThemeStyle = getReaderThemeStyle(
    preferences,
    resolvedTheme === "dark" ? "dark" : "light"
  );
  const bookTitle = bookPage?.book.title || "Reading";
  const pageTitle = getReaderPageTitle(bookPage);
  const levelLabel = bookPage ? formatLevelLabel(bookPage) : null;

  return (
    <div className="hidden min-h-0 flex-1 bg-background text-foreground md:flex">
      <section
        className="relative flex min-w-0 flex-1 flex-col"
        style={readerThemeStyle}
      >
        <ReaderHeader
          backHref={backHref}
          readingProgressBps={readingProgressBps}
          bookTitle={bookTitle}
          pageTitle={pageTitle}
          titleMode={headerTitleMode}
          leading={
            levelLabel ? (
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: "var(--reader-fg-soft)",
                  color: "var(--reader-fg-muted)",
                }}
              >
                {levelLabel}
              </span>
            ) : null
          }
          trailing={
            <>
              <BookReaderPreferencesTrigger onClick={onOpenPreferences} />
              <ReaderHeaderAction
                onClick={onOpenTableOfContents}
                icon={BookOpenText}
                label="Innehåll"
              />
            </>
          }
          heightClassName="h-[68px]"
          paddingXClassName="px-8"
          horizontalPaddingPx={32}
          titleTextClassName="text-sm font-medium"
        />

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {(!bookPage || loading || error) && (
            <ReaderState loading={loading} error={error} />
          )}
          {!loading && !error && bookPage && (
            <>
              <BookPageReader bookPage={bookPage} preferences={preferences} />
              <div className="mx-auto flex w-full max-w-[680px] items-center justify-center px-1 pb-24 pt-4">
                <BookProgress
                  bookPage={bookPage}
                  onNavigatePage={onNavigatePage}
                />
              </div>
            </>
          )}
        </div>

      </section>
    </div>
  );
};

export const BookReaderMobileSurface = ({
  bookPage,
  loading,
  error,
  scrollRef,
  backHref,
  readingProgressBps,
  headerTitleMode,
  preferences,
  onOpenTableOfContents,
  onOpenPreferences,
  onNavigatePage,
}: ReaderSurfaceProps) => {
  const { resolvedTheme } = useTheme();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const readerThemeStyle = getReaderThemeStyle(
    preferences,
    resolvedTheme === "dark" ? "dark" : "light"
  );
  const bookTitle = bookPage?.book.title || "Reading";
  const pageTitle = getReaderPageTitle(bookPage);
  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (hasActiveTextSelection()) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };
  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start || !bookPage) return;
    if (hasActiveTextSelection()) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < MOBILE_SWIPE_THRESHOLD) return;
    if (Math.abs(deltaY) > MOBILE_SWIPE_MAX_VERTICAL_DRIFT) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

    if (deltaX < 0 && bookPage.next?.href) {
      onNavigatePage(bookPage.next.href);
      return;
    }

    if (deltaX > 0 && bookPage.previous?.href) {
      onNavigatePage(bookPage.previous.href);
    }
  };

  return (
    <div
      className="flex min-h-0 flex-1 bg-background md:hidden"
      style={readerThemeStyle}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ReaderHeader
          backHref={backHref}
          readingProgressBps={readingProgressBps}
          bookTitle={bookTitle}
          pageTitle={pageTitle}
          titleMode={headerTitleMode}
          leading={null}
          trailing={
            <>
              <BookReaderPreferencesTrigger onClick={onOpenPreferences} />
              <ReaderHeaderAction
                onClick={onOpenTableOfContents}
                icon={BookOpenText}
                label="Innehåll"
              />
            </>
          }
          heightClassName="h-16"
          paddingXClassName="px-3"
          horizontalPaddingPx={12}
          titleTextClassName="text-sm font-semibold"
        />

        <div
          ref={scrollRef}
          className="min-w-0 flex-1 overflow-y-auto px-5 py-6"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {(!bookPage || loading || error) && (
            <ReaderState loading={loading} error={error} />
          )}
          {!loading && !error && bookPage && (
            <>
              <BookPageReader bookPage={bookPage} preferences={preferences} />
              <div className="pb-10 pt-4">
                <BookProgress
                  bookPage={bookPage}
                  onNavigatePage={onNavigatePage}
                  compact
                />
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
