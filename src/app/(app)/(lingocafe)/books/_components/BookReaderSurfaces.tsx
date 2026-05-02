"use client";

import Link from "next/link";
import type { RefObject } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Sun,
  Type,
} from "lucide-react";

import { BookCover } from "@/app/(app)/(lingocafe)/books/_components/BookCover";
import { BookPageReader } from "@/app/(app)/(lingocafe)/books/_components/BookPageReader";
import type {
  ReaderBookPage,
  ReaderBookPageSummary,
} from "@/app/(app)/(lingocafe)/books/_components/book-types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ReaderSurfaceProps = {
  bookPage: ReaderBookPage | null;
  loading: boolean;
  error: string | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  backHref: string;
  readingProgressBps: number;
};

type PageProgressProps = {
  bookPage: ReaderBookPage;
  compact?: boolean;
};

type ReaderNavButtonProps = {
  href: string | null;
  direction: "previous" | "next";
  className?: string;
};

const formatLevelLabel = (bookPage: ReaderBookPage) =>
  `${bookPage.book.lang.toUpperCase()} / ${bookPage.book.level.toUpperCase()}`;

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

const ReaderToolbarPlaceholders = ({ mobile = false }: { mobile?: boolean }) => (
  <div className="flex items-center gap-1">
    {!mobile && (
      <>
        <Button variant="ghost" size="icon" type="button" disabled aria-label="Typography settings">
          <Type className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" type="button" disabled aria-label="Theme settings">
          <Sun className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" type="button" disabled aria-label="Bookmark page">
          <Bookmark className="h-5 w-5" />
        </Button>
      </>
    )}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" type="button" aria-label="Reader menu">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>Innehåll</DropdownMenuItem>
        <DropdownMenuItem disabled>Bokmärken</DropdownMenuItem>
        <DropdownMenuItem disabled>Inställningar</DropdownMenuItem>
        <DropdownMenuItem disabled>Aa</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

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

const ReaderNavButton = ({ href, direction, className = "" }: ReaderNavButtonProps) => {
  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ChevronLeft : ChevronRight;
  const label = isPrevious ? "Previous page" : "Next page";
  const baseClass =
    "flex h-11 w-11 items-center justify-center rounded-full border text-current shadow-sm transition";

  if (!href) {
    return (
      <span
        aria-hidden="true"
        className={`${baseClass} pointer-events-none border-border/60 bg-muted text-muted-foreground opacity-40 ${className}`}
      >
        <Icon className="h-5 w-5" />
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={`${baseClass} border-neutral-900 bg-neutral-950 text-white hover:bg-neutral-800 ${className}`}
    >
      <Icon className="h-5 w-5" />
    </Link>
  );
};

const BookProgress = ({ bookPage, compact = false }: PageProgressProps) => (
  <div className={`flex min-w-0 items-center gap-4 ${compact ? "w-full" : "w-full max-w-sm"}`}>
    <ReaderNavButton href={bookPage.previous?.href ?? null} direction="previous" />
    <div className="min-w-0 flex-1 space-y-2 text-center">
      <div className="text-xs text-muted-foreground">{getCurrentPageLabel(bookPage)}</div>
      <div className="relative h-1 rounded-full bg-border">
        <div
          className="absolute left-0 top-0 h-1 rounded-full bg-neutral-950"
          style={{ width: `${getBookProgressPercent(bookPage)}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-neutral-950"
          style={{ left: `calc(${getBookProgressPercent(bookPage)}% - 6px)` }}
        />
      </div>
    </div>
    <ReaderNavButton href={bookPage.next?.href ?? null} direction="next" />
  </div>
);

const SidePageRow = ({
  page,
  currentPageId,
}: {
  page: ReaderBookPageSummary;
  currentPageId: string;
}) => {
  const current = page.pageId === currentPageId;

  return (
    <Link
      href={page.href}
      className={`flex items-center gap-3 border-b px-5 py-4 text-sm transition hover:bg-muted/70 ${
        current ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
      }`}
    >
      <span className="w-5 shrink-0 text-xs">{page.position}.</span>
      <span className="min-w-0 flex-1 truncate">{page.title}</span>
      {current && (
        <span className="flex h-4 w-4 items-end gap-0.5 text-muted-foreground" aria-label="Current page">
          <span className="h-1.5 w-0.5 rounded-full bg-current" />
          <span className="h-3 w-0.5 rounded-full bg-current" />
          <span className="h-2 w-0.5 rounded-full bg-current" />
        </span>
      )}
    </Link>
  );
};

const ReaderSidePanel = ({
  bookPage,
  backHref,
}: {
  bookPage: ReaderBookPage;
  backHref: string;
}) => (
  <aside className="hidden h-full w-[320px] shrink-0 flex-col border-r bg-background md:flex">
    <div className="flex h-[68px] items-center border-b px-6">
      <Button variant="ghost" size="icon" asChild>
        <Link href={backHref} aria-label="Back to book details">
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </Button>
    </div>

    <div className="border-b px-6 py-5">
      <div className="flex gap-4">
        <BookCover
          book={bookPage.book}
          className="w-24 shrink-0 rounded-sm"
          sizes="96px"
        />
        <div className="min-w-0 pt-5">
          <h2 className="line-clamp-3 text-lg font-semibold leading-tight">
            {bookPage.book.title}
          </h2>
          <p className="mt-2 truncate text-sm text-muted-foreground">
            {bookPage.book.author}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="h-1 flex-1 rounded-full bg-border">
          <div
            className="h-1 rounded-full bg-neutral-950"
            style={{ width: `${getBookProgressPercent(bookPage)}%` }}
          />
        </div>
        <span>{Math.round(getBookProgressPercent(bookPage))}%</span>
      </div>
    </div>

    <div className="grid grid-cols-2 border-b text-sm">
      <button type="button" className="border-b-2 border-neutral-950 px-3 py-4 font-medium">
        Innehåll
      </button>
      <button type="button" className="px-3 py-4 text-muted-foreground" disabled>
        Bokmärken
      </button>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto">
      {bookPage.pages.map((page) => (
        <SidePageRow
          key={page.pageId}
          page={page}
          currentPageId={bookPage.page.pageId}
        />
      ))}
    </div>
  </aside>
);

export const BookReaderDesktopSurface = ({
  bookPage,
  loading,
  error,
  scrollRef,
  backHref,
  readingProgressBps,
}: ReaderSurfaceProps) => (
  <div className="fixed inset-0 z-[650] hidden bg-background text-foreground md:flex">
    {bookPage && <ReaderSidePanel bookPage={bookPage} backHref={backHref} />}
    {!bookPage && <div className="hidden w-[320px] shrink-0 border-r md:block" />}

    <section className="flex min-w-0 flex-1 flex-col">
      <header className="relative flex h-[68px] shrink-0 items-center justify-between border-b px-8">
        <span
          aria-hidden="true"
          className="absolute bottom-[-1px] left-0 h-[2px] bg-blue-500"
          style={{ width: `${(readingProgressBps / 10000) * 100}%` }}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {bookPage?.book.title || "Reading"}
            {bookPage && (
              <span className="ml-3 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                {formatLevelLabel(bookPage)}
              </span>
            )}
          </div>
        </div>
        <ReaderToolbarPlaceholders />
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {(!bookPage || loading || error) && <ReaderState loading={loading} error={error} />}
        {!loading && !error && bookPage && (
          <>
            <BookPageReader bookPage={bookPage} />
            <div className="mx-auto flex w-full max-w-[680px] items-center justify-center px-1 pb-24 pt-4">
              <BookProgress bookPage={bookPage} />
            </div>
          </>
        )}
      </div>
    </section>
  </div>
);

export const BookReaderMobileSurface = ({
  bookPage,
  loading,
  error,
  scrollRef,
  backHref,
  readingProgressBps,
}: ReaderSurfaceProps) => (
  <div className="fixed inset-0 z-[600] bg-background md:hidden">
    <div className="absolute inset-0 flex min-w-0 flex-col" style={{ height: "100dvh" }}>
      <header className="relative flex h-16 shrink-0 items-center justify-between border-b px-3">
        <span
          aria-hidden="true"
          className="absolute bottom-[-1px] left-0 h-[2px] bg-blue-500"
          style={{ width: `${(readingProgressBps / 10000) * 100}%` }}
        />
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref} aria-label="Back to book details">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 px-2 text-center">
          <div className="truncate text-sm font-semibold">
            {bookPage?.book.title || "Reading"}
          </div>
        </div>
        <ReaderToolbarPlaceholders mobile />
      </header>

      <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto px-5 py-6">
        {(!bookPage || loading || error) && <ReaderState loading={loading} error={error} />}
        {!loading && !error && bookPage && (
          <>
            <BookPageReader bookPage={bookPage} />
            <div className="pb-10 pt-4">
              <BookProgress bookPage={bookPage} compact />
            </div>
          </>
        )}
      </div>
    </div>
  </div>
);
