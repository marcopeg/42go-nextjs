"use client";

import { useEffect, useRef } from "react";
import { Settings2, X } from "lucide-react";

import { BookReaderPlaybackPreferencesEditor } from "@/app/(app)/(lingocafe)/books/_components/BookReaderPlaybackPreferencesEditor";
import type { ReaderPlaybackController } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const READER_PLAYBACK_SURFACE_CLASSNAME =
  "rounded-2xl border bg-background text-foreground shadow-lg";

export const BookReaderPlaybackSettings = ({
  playback,
  open,
  onOpenChange,
}: {
  playback: ReaderPlaybackController;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
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

          <BookReaderPlaybackPreferencesEditor playback={playback} />
        </div>
      )}
    </div>
  );
};
