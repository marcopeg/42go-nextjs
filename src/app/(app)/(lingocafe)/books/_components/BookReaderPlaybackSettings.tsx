"use client";

import { useEffect, useRef } from "react";
import { Settings2, X } from "lucide-react";

import { READER_PLAYBACK_SPEEDS } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/model";
import type { ReaderPlaybackController } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const READER_PLAYBACK_SURFACE_CLASSNAME =
  "rounded-2xl border bg-background text-foreground shadow-lg";

type PlaybackToggleProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

const PlaybackToggle = ({
  label,
  checked,
  onCheckedChange,
}: PlaybackToggleProps) => (
  <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-1">
    <span className="text-sm font-medium">{label}</span>
    <Switch
      checked={checked}
      aria-label={label}
      onCheckedChange={onCheckedChange}
    />
  </div>
);

export const BookReaderPlaybackSettings = ({
  playback,
  open,
  onOpenChange,
}: {
  playback: ReaderPlaybackController;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { preferences } = playback;
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const root = rootRef.current;
    if (!root || root.getClientRects().length === 0) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.contains(event.target)) {
        onOpenChange(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  const handleSettingsClick = () => onOpenChange(!open);

  return (
    <div ref={rootRef} className="shrink-0">
      <Button
        type="button"
        variant="neutralGhost"
        onClick={handleSettingsClick}
        aria-label={`Playback settings. Current speed ${playback.speed} times.`}
        aria-expanded={open}
        aria-controls="reader-playback-settings"
        className={cn(
          "h-9 w-14 shrink-0 gap-1 px-1 text-xs font-semibold",
          open && "bg-muted/60"
        )}
      >
        <Settings2 className="h-4 w-4" aria-hidden="true" />
        <span>{playback.speed}×</span>
      </Button>

      {open && (
        <div
          id="reader-playback-settings"
          role="dialog"
          aria-label="Playback settings"
          className={cn(
            "pointer-events-auto absolute inset-x-0 mx-auto w-full max-w-2xl",
            READER_PLAYBACK_SURFACE_CLASSNAME
          )}
          style={{
            bottom: "calc(100% + 0.5rem)",
            zIndex: 2147483647,
          }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Playback settings</h2>
            <Button
              type="button"
              variant="neutralGhost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close playback settings"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div
            className="divide-y overflow-y-auto overscroll-contain pb-2"
            style={{ maxHeight: "min(26rem, calc(100dvh - 10rem))" }}
          >
            <div className="px-4 py-3">
              <div className="mb-2 text-sm font-medium">Speed</div>
              <div
                role="group"
                aria-label="Playback speed"
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                }}
              >
                {READER_PLAYBACK_SPEEDS.map((speed) => {
                  const selected = preferences.speed === speed;
                  return (
                    <Button
                      key={speed}
                      type="button"
                      variant={selected ? "default" : "neutralGhost"}
                      aria-pressed={selected}
                      onClick={() => playback.setSpeed(speed)}
                      className="h-9 px-1 text-xs font-semibold"
                    >
                      {speed}×
                    </Button>
                  );
                })}
              </div>
            </div>

            <PlaybackToggle
              label="Word highlighting"
              checked={preferences.wordHighlighting}
              onCheckedChange={playback.setWordHighlighting}
            />
            <PlaybackToggle
              label="Sentence highlighting"
              checked={preferences.sentenceHighlighting}
              onCheckedChange={playback.setSentenceHighlighting}
            />
            <PlaybackToggle
              label="Reveal as you listen"
              checked={preferences.progressiveReveal}
              onCheckedChange={playback.setProgressiveReveal}
            />
            <PlaybackToggle
              label="Dim previous sentences"
              checked={preferences.dimPreviousSentences}
              onCheckedChange={playback.setDimPreviousSentences}
            />
            <PlaybackToggle
              label="Auto-pause on translation"
              checked={preferences.autoPauseOnTranslation}
              onCheckedChange={playback.setAutoPauseOnTranslation}
            />
            <PlaybackToggle
              label="Auto-pause on settings"
              checked={preferences.autoPauseOnSettings}
              onCheckedChange={playback.setAutoPauseOnSettings}
            />
          </div>
        </div>
      )}
    </div>
  );
};
