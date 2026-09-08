"use client";

import { BookCheck, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TranslationScopeFab } from "@/components/ui/translation-scope-fab";
import { BookReaderPlaybackControls } from "@/app/(app)/(lingocafe)/books/_components/BookReaderPlaybackControls";
import { getReaderChapterLabel } from "@/app/(app)/(lingocafe)/books/_components/reader-chapter-label";
import type { ReaderBookPage } from "@/app/(app)/(lingocafe)/books/_components/book-types";
import type { ReaderTranslationScope } from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import type { ReaderPlaybackController } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";
import type { useReaderPagination } from "@/app/(app)/(lingocafe)/books/_components/useReaderPagination";

type Props = {
  pagination: ReturnType<typeof useReaderPagination>;
  bookPage: ReaderBookPage;
  playback: ReaderPlaybackController;
  translationScope: ReaderTranslationScope;
  translationGestures: boolean;
  onTranslationScopeChange: (scope: ReaderTranslationScope) => void;
  onOpenTableOfContents: () => void;
  completionPending: boolean;
  onMarkRead: () => void;
};

export const BookReaderPaginatedToolbar = ({
  pagination, bookPage, playback, translationScope, translationGestures, onTranslationScopeChange,
  onOpenTableOfContents, completionPending, onMarkRead,
}: Props) => {
  const chapterLabel = getReaderChapterLabel(bookPage);
  const canComplete = pagination.atEnd && !bookPage.next && !bookPage.completedAt;
  return (
    <footer
      className="shrink-0 px-3 pt-3"
      style={{
        paddingBottom:
          "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <nav aria-label="Reader controls" className="mx-auto flex h-14 max-w-[680px] items-center gap-1">
        <div className="flex size-11 shrink-0 items-center justify-center">
          {bookPage.translation.enabled && bookPage.translation.to && !translationGestures && (
            <TranslationScopeFab scope={translationScope} onScopeChange={onTranslationScopeChange}
              className="size-11 shadow-none [&>svg]:size-5"
              tooltipClassName="border-[var(--reader-popover-border)] bg-[var(--reader-popover-bg)] text-[var(--reader-fg)]" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <Button variant="neutralGhost" style={{ color: "var(--reader-fg)" }} className="size-11 shrink-0 rounded-full p-0" aria-label="Previous screen"
            disabled={!pagination.canPrevious} onClick={() => pagination.turn(-1)}><ChevronLeft className="size-5" /></Button>
          <Button variant="neutralGhost" style={{ color: "var(--reader-fg)" }} className="h-11 min-w-0 shrink px-1 text-xs font-normal"
            aria-label={`${chapterLabel}. Open contents`} title={chapterLabel} onClick={onOpenTableOfContents}>
            <span className="truncate" style={{ color: "var(--reader-fg-muted)" }}>{chapterLabel}</span>
          </Button>
          {canComplete ? (
            <Button variant="neutralGhost" style={{ color: "var(--reader-fg)" }} className="size-11 shrink-0 rounded-full p-0" aria-label="Mark as read"
              title="Mark as read" disabled={completionPending} onClick={onMarkRead}><BookCheck className="size-5" /></Button>
          ) : (
            <Button variant="neutralGhost" style={{ color: "var(--reader-fg)" }} className="size-11 shrink-0 rounded-full p-0" aria-label="Next screen"
              disabled={!pagination.canNext} onClick={() => pagination.turn(1)}><ChevronRight className="size-5" /></Button>
          )}
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center">
          {playback.canPlay && (
            <Button className="size-11 rounded-full p-0" aria-label="Play chapter aloud"
              disabled={playback.isOpen} onClick={() => playback.start()}><Volume2 className="size-5" /></Button>
          )}
        </div>
      </nav>
      <BookReaderPlaybackControls playback={playback} inline />
    </footer>
  );
};
