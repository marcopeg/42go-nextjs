"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ReaderContentSkeletonProps = {
  variant: "book" | "conversation";
};

export const READER_PANEL_OPEN_ANIMATION_MS = 300;

export const useReaderEntrySkeleton = () => {
  const [pending, setPending] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setPending(false),
      READER_PANEL_OPEN_ANIMATION_MS
    );

    return () => window.clearTimeout(timer);
  }, []);

  return pending;
};

const ReaderSkeletonBlock = ({ className }: { className: string }) => (
  <Skeleton
    aria-hidden="true"
    className={cn("motion-reduce:animate-none", className)}
    style={{ backgroundColor: "var(--reader-fg-soft)" }}
  />
);

const BookContentSkeleton = () => (
  <div className="relative mx-auto flex w-full max-w-[680px] flex-col px-1 pb-16 pt-10 md:px-0 md:pb-24 md:pt-24">
    <div className="flex flex-col items-center">
      <ReaderSkeletonBlock className="h-4 w-24" />
      <ReaderSkeletonBlock className="mt-4 h-9 w-3/4 max-w-lg" />
      <ReaderSkeletonBlock className="mt-3 h-8 w-1/2 max-w-sm" />
      <div className="mt-8 flex w-52 items-center gap-3" aria-hidden="true">
        <ReaderSkeletonBlock className="h-px flex-1 rounded-none" />
        <ReaderSkeletonBlock className="size-2 rounded-full" />
        <ReaderSkeletonBlock className="h-px flex-1 rounded-none" />
      </div>
      <ReaderSkeletonBlock className="mt-8 h-4 w-5/6 max-w-xl" />
      <ReaderSkeletonBlock className="mt-3 h-4 w-2/3 max-w-md" />
    </div>

    <div className="mt-12 space-y-8">
      {[
        ["w-full", "w-[94%]", "w-3/4"],
        ["w-full", "w-[88%]", "w-2/3"],
        ["w-[97%]", "w-full", "w-4/5"],
        ["w-full", "w-[91%]", "w-[72%]"],
        ["w-[95%]", "w-full", "w-3/5"],
      ].map((paragraph, paragraphIndex) => (
        <div key={paragraphIndex} className="space-y-3">
          {paragraph.map((width) => (
            <ReaderSkeletonBlock key={width} className={cn("h-5", width)} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const conversationTurns = [
  { right: false, width: "w-[72%]", height: "h-16" },
  { right: true, width: "w-[58%]", height: "h-14" },
  { right: false, width: "w-[66%]", height: "h-20" },
  { right: true, width: "w-[76%]", height: "h-16" },
  { right: false, width: "w-[54%]", height: "h-14" },
  { right: true, width: "w-[68%]", height: "h-20" },
] as const;

const ConversationContentSkeleton = () => (
  <div className="w-full">
    <div className="mb-12 flex flex-col items-center text-center">
      <ReaderSkeletonBlock className="mt-4 h-9 w-4/5 max-w-lg" />
      <ReaderSkeletonBlock className="mt-3 h-8 w-1/2 max-w-sm" />
      <div className="mt-8 flex w-52 items-center gap-3" aria-hidden="true">
        <ReaderSkeletonBlock className="h-px flex-1 rounded-none" />
        <ReaderSkeletonBlock className="size-2 rounded-full" />
        <ReaderSkeletonBlock className="h-px flex-1 rounded-none" />
      </div>
      <ReaderSkeletonBlock className="mt-8 h-4 w-5/6 max-w-xl" />
      <ReaderSkeletonBlock className="mt-3 h-4 w-2/3 max-w-md" />
    </div>

    <div className="space-y-5" aria-hidden="true">
      {conversationTurns.map((turn, index) => (
        <div
          key={index}
          className={cn("flex items-end gap-2", turn.right && "flex-row-reverse")}
        >
          <ReaderSkeletonBlock className="size-8 shrink-0 rounded-full" />
          <ReaderSkeletonBlock
            className={cn("max-w-[calc(100%_-_2.5rem)] rounded-2xl", turn.width, turn.height)}
          />
        </div>
      ))}
    </div>
  </div>
);

export const ReaderContentSkeleton = ({
  variant,
}: ReaderContentSkeletonProps) => {
  const label = variant === "book" ? "Loading book page" : "Loading conversation";

  return (
    <div role="status" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}…</span>
      {variant === "book" ? (
        <BookContentSkeleton />
      ) : (
        <ConversationContentSkeleton />
      )}
    </div>
  );
};
