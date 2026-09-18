"use client";

import Link from "next/link";
import type { MouseEvent as ReactMouseEvent } from "react";
import { BookOpenText } from "lucide-react";

import { Modal } from "@/42go/components/modal";
import type { ReaderBookPage, ReaderBookPageSummary } from "@/app/(app)/(lingocafe)/books/_components/book-types";
import { BookCover } from "@/app/(app)/(lingocafe)/books/_components/BookCover";
import { Button } from "@/components/ui/button";

type BookReaderTableOfContentsProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  bookPage: ReaderBookPage | null;
  bookInfoHref: string;
  onNavigatePage: (href: string) => void;
  preserveDocumentScroll?: boolean;
};

type ContentsGroup =
  | {
      kind: "section";
      page: ReaderBookPageSummary;
      chapters: ReaderBookPageSummary[];
    }
  | {
      kind: "chapter";
      page: ReaderBookPageSummary;
    };

const isSection = (page: ReaderBookPageSummary) =>
  page.kind.toLowerCase() === "part";

const buildContentsGroups = (pages: ReaderBookPageSummary[]) =>
  pages.reduce<ContentsGroup[]>((groups, page) => {
    if (isSection(page)) {
      groups.push({ kind: "section", page, chapters: [] });
      return groups;
    }

    const previousGroup = groups[groups.length - 1];
    if (previousGroup?.kind === "section") {
      previousGroup.chapters.push(page);
    } else {
      groups.push({ kind: "chapter", page });
    }

    return groups;
  }, []);

const getCurrentPageIndex = (bookPage: ReaderBookPage) => {
  const currentIndex = bookPage.pages.findIndex(
    (page) => page.pageId === bookPage.page.pageId
  );

  return currentIndex >= 0 ? currentIndex : Math.max(0, bookPage.page.position - 1);
};

const getBookProgressPercent = (bookPage: ReaderBookPage) => {
  const total = bookPage.pages.length;
  if (total <= 1) return 0;
  return Math.min(100, Math.max(0, (getCurrentPageIndex(bookPage) / (total - 1)) * 100));
};

const TableOfContentsRow = ({
  page,
  currentPageId,
  onSelect,
  onNavigatePage,
  variant = "chapter",
}: {
  page: ReaderBookPageSummary;
  currentPageId: string;
  onSelect: () => void;
  onNavigatePage: (href: string) => void;
  variant?: "section" | "chapter";
}) => {
  const current = page.pageId === currentPageId;
  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    onSelect();
    if (!current) onNavigatePage(page.href);
  };

  return (
    <Link
      href={page.href}
      onClick={handleClick}
      className={`group flex min-w-0 items-center gap-3 rounded-xl border px-4 text-sm outline-none transition hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 ${
        variant === "section" ? "min-h-12 py-3" : "min-h-11 py-2.5"
      } ${
        current ? "border-foreground/20 bg-muted text-foreground" : "text-muted-foreground"
      }`}
    >
      <span className="w-6 shrink-0 text-xs font-medium tabular-nums">{page.position}.</span>
      <span className="min-w-0 flex-1">
        {variant === "section" && (
          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Section
          </span>
        )}
        <span className={variant === "section" ? "block truncate font-semibold text-foreground" : "block truncate"}>
          {page.title}
        </span>
      </span>
      {current && (
        <span
          className="flex h-4 w-4 items-end gap-0.5 text-muted-foreground"
          aria-label="Current page"
        >
          <span className="h-1.5 w-0.5 rounded-full bg-current" />
          <span className="h-3 w-0.5 rounded-full bg-current" />
          <span className="h-2 w-0.5 rounded-full bg-current" />
        </span>
      )}
    </Link>
  );
};

export const BookReaderTableOfContents = ({
  open,
  onOpenChange,
  bookPage,
  bookInfoHref,
  onNavigatePage,
  preserveDocumentScroll = false,
}: BookReaderTableOfContentsProps) => {
  const handleSelectPage = () => {
    onOpenChange(false);
  };
  const contentsGroups = bookPage ? buildContentsGroups(bookPage.pages) : [];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Contents"
      subtitle={bookPage ? `${bookPage.pages.length} pages` : "Book structure"}
      ariaLabel="Table of contents"
      preserveDocumentScroll={preserveDocumentScroll}
      presentation="panel"
      anchor="right"
      size="md"
      bodyClassName="px-5 py-5"
      footer={
        <Button type="button" variant="outline" className="w-full" asChild>
          <Link href={bookInfoHref} onClick={() => onOpenChange(false)}>
            Book info
          </Link>
        </Button>
      }
    >
      {!bookPage ? (
        <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
          Contents will show up when the page finishes loading.
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-[28px] border bg-muted/20 p-4">
            <Link
              href={bookInfoHref}
              onClick={() => onOpenChange(false)}
              className="-m-2 flex gap-4 rounded-2xl p-2 outline-none transition hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label={`Open book info for ${bookPage.book.title}`}
            >
              <BookCover
                book={bookPage.book}
                className="w-20 shrink-0 rounded-sm"
                sizes="80px"
              />
              <div className="min-w-0 pt-3">
                <h2 className="line-clamp-3 text-base font-semibold leading-tight">
                  {bookPage.book.title}
                </h2>
                <p className="mt-2 truncate text-sm text-muted-foreground">
                  {bookPage.book.author}
                </p>
              </div>
            </Link>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="h-1 flex-1 rounded-full bg-border">
                <div
                  className="h-1 rounded-full bg-foreground"
                  style={{ width: `${getBookProgressPercent(bookPage)}%` }}
                />
              </div>
              <span>{Math.round(getBookProgressPercent(bookPage))}%</span>
            </div>
          </section>

          <div className="flex items-center gap-2 px-1 text-sm font-medium">
            <BookOpenText className="h-4 w-4" />
            <span>Contents</span>
          </div>

          <div className="space-y-4">
            {contentsGroups.map((group) =>
              group.kind === "section" ? (
                <section key={group.page.pageId} className="space-y-2" aria-label={`Section: ${group.page.title}`}>
                  <TableOfContentsRow
                    page={group.page}
                    variant="section"
                    currentPageId={bookPage.page.pageId}
                    onSelect={handleSelectPage}
                    onNavigatePage={onNavigatePage}
                  />
                  {group.chapters.length > 0 && (
                    <div className="ml-5 border-l border-border pl-3" aria-label={`Chapters in ${group.page.title}`}>
                      <div className="space-y-1.5">
                        {group.chapters.map((chapter) => (
                          <TableOfContentsRow
                            key={chapter.pageId}
                            page={chapter}
                            currentPageId={bookPage.page.pageId}
                            onSelect={handleSelectPage}
                            onNavigatePage={onNavigatePage}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              ) : (
                <TableOfContentsRow
                  key={group.page.pageId}
                  page={group.page}
                  currentPageId={bookPage.page.pageId}
                  onSelect={handleSelectPage}
                  onNavigatePage={onNavigatePage}
                />
              )
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
