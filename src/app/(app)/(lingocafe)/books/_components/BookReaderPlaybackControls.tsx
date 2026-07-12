"use client";

import { useState } from "react";
import { Pause, Play, Volume2, X } from "lucide-react";

import type { ReaderPlaybackController } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";
import { Button } from "@/components/ui/button";

export const BookReaderPlaybackControls = ({
  playback,
}: {
  playback: ReaderPlaybackController;
}) => {
  const [draftProgress, setDraftProgress] = useState<number | null>(null);
  const [seeking, setSeeking] = useState(false);

  if (!playback.isOpen) {
    return (
      <div className="pointer-events-auto z-[70] flex h-24 shrink-0 items-start justify-end px-5 pt-2 md:h-28 md:px-8">
        <div className="flex max-w-[min(22rem,calc(100vw-2.5rem))] flex-col items-end gap-2">
          {!playback.canPlay && playback.unavailableReason && (
            <div
              role="status"
              className="rounded-full border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur"
            >
              {playback.unavailableReason}
            </div>
          )}
          <Button
            type="button"
            size="icon"
            onClick={playback.start}
            disabled={!playback.canPlay}
            aria-label={
              playback.canPlay
                ? "Play page aloud"
                : playback.unavailableReason || "Playback unavailable"
            }
            title={playback.unavailableReason || "Play page aloud"}
            className="h-14 w-14 rounded-full shadow-xl"
          >
            <Volume2 className="h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  const isActivelyAdvancing =
    playback.status === "playing" || playback.status === "delay";
  const displayedProgress =
    seeking && draftProgress !== null ? draftProgress : playback.progressBps;
  const commitSeek = () => {
    setSeeking(false);
    if (draftProgress !== null && draftProgress !== playback.progressBps) {
      playback.seek(draftProgress);
    }
    setDraftProgress(null);
  };

  return (
    <div className="pointer-events-auto z-[70] flex h-24 shrink-0 items-start justify-center px-3 pt-2 md:px-6">
      <div
        role="region"
        aria-label="Page playback"
        className="flex w-full max-w-2xl flex-nowrap items-center gap-2.5 rounded-2xl border bg-background/95 p-2.5 text-foreground shadow-2xl backdrop-blur md:gap-3 md:px-4"
      >
        <Button
          type="button"
          variant="neutralGhost"
          size="icon"
          onClick={playback.togglePause}
          aria-label={isActivelyAdvancing ? "Pause playback" : "Resume playback"}
          className="h-9 w-9 shrink-0"
        >
          {isActivelyAdvancing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="neutralGhost"
          onClick={playback.cycleSpeed}
          aria-label={`Playback speed ${playback.speed} times. Change speed.`}
          className="h-9 w-12 shrink-0 px-1 text-xs font-semibold"
        >
          {playback.speed}×
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            type="range"
            min={0}
            max={10000}
            step={1}
            value={displayedProgress}
            onPointerDown={() => {
              setSeeking(true);
              setDraftProgress(playback.progressBps);
            }}
            onPointerUp={commitSeek}
            onPointerCancel={() => {
              setSeeking(false);
              setDraftProgress(null);
            }}
            onChange={(event) => {
              const value = Number(event.target.value);
              setDraftProgress(value);
            }}
            onKeyUp={(event) => {
              if (
                event.key === "ArrowLeft" ||
                event.key === "ArrowRight" ||
                event.key === "Home" ||
                event.key === "End" ||
                event.key === "PageUp" ||
                event.key === "PageDown"
              ) {
                playback.seek(Number(event.currentTarget.value));
              }
            }}
            onBlur={commitSeek}
            aria-label="Playback position"
            className="h-2 min-w-0 flex-1 cursor-pointer accent-primary"
          />
          <output className="w-11 shrink-0 text-right text-sm tabular-nums text-muted-foreground md:w-10 md:text-xs">
            {Math.round(displayedProgress / 100)}%
          </output>
        </div>

        <Button
          type="button"
          variant="neutralGhost"
          size="icon"
          onClick={playback.close}
          aria-label="Close playback"
          className="h-10 w-10 shrink-0 md:h-9 md:w-9"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
