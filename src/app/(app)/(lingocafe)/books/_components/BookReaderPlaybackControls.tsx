"use client";

import { useState, type CSSProperties } from "react";
import { Pause, Play, Volume2, X } from "lucide-react";

import {
  BookReaderPlaybackSettings,
  READER_PLAYBACK_SURFACE_CLASSNAME,
} from "@/app/(app)/(lingocafe)/books/_components/BookReaderPlaybackSettings";
import type { ReaderPlaybackController } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const BookReaderPlaybackControls = ({
  playback,
}: {
  playback: ReaderPlaybackController;
}) => {
  const [draftProgress, setDraftProgress] = useState<number | null>(null);
  const [seeking, setSeeking] = useState(false);
  const floatingFabStyle: CSSProperties = {
    position: "fixed",
    right: "calc(env(safe-area-inset-right) + 1.25rem)",
    bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)",
    zIndex: 1000,
  };
  const floatingPlayerStyle: CSSProperties = {
    position: "fixed",
    left: "0.75rem",
    right: "0.75rem",
    bottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
    zIndex: 1000,
  };

  if (!playback.isOpen && !playback.canPlay) {
    return null;
  }

  if (!playback.isOpen) {
    return (
      <div
        className="pointer-events-auto flex max-w-[min(22rem,calc(100vw-2.5rem))] touch-manipulation flex-col items-end gap-2"
        style={floatingFabStyle}
      >
        <Button
          type="button"
          size="icon"
          onClick={() => playback.start()}
          aria-label="Play page aloud"
          title="Play page aloud"
          className="h-14 w-14 rounded-full shadow-xl"
        >
          <Volume2 className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  const isActivelyAdvancing =
    playback.status === "playing" || playback.status === "delay";
  const displayedProgress =
    seeking && draftProgress !== null ? draftProgress : playback.progressBps;
  const commitSeek = (progress = draftProgress) => {
    setSeeking(false);
    playback.previewSeek(null);
    if (progress !== null && progress !== playback.progressBps) {
      playback.seek(progress);
    }
    setDraftProgress(null);
  };
  const cancelSeek = () => {
    setSeeking(false);
    setDraftProgress(null);
    playback.previewSeek(null);
  };

  return (
    <div
      className="pointer-events-auto flex min-w-0 touch-manipulation justify-center md:left-6 md:right-6"
      style={floatingPlayerStyle}
    >
        <div
          role="region"
          aria-label="Page playback"
          className={cn(
            "pointer-events-auto flex w-full max-w-2xl flex-nowrap items-center gap-2.5 p-2.5 md:gap-3 md:px-4",
            READER_PLAYBACK_SURFACE_CLASSNAME
          )}
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

        <BookReaderPlaybackSettings
          playback={playback}
          open={playback.settingsOpen}
          onOpenChange={playback.setSettingsOpen}
        />

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
              playback.previewSeek(playback.progressBps);
            }}
            onPointerUp={() => commitSeek()}
            onPointerCancel={cancelSeek}
            onChange={(event) => {
              const value = Number(event.target.value);
              setSeeking(true);
              setDraftProgress(value);
              playback.previewSeek(value);
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
                commitSeek(Number(event.currentTarget.value));
              }
            }}
            onBlur={() => commitSeek()}
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
