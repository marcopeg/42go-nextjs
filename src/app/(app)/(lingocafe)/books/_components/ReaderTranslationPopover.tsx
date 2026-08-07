"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { ReaderTranslationCacheEntry } from "@/app/(app)/(lingocafe)/books/_components/reader-translation-cache";
import type { ReaderTranslationScope } from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import {
  getTranslationPronunciationAccessibleLabel,
  getTranslationPronunciationVisibleLabel,
} from "@/app/(app)/(lingocafe)/books/_components/reader-playback/translation-pronunciation";
import type { LingoCafeLanguageOption } from "@/config/lingocafe/profile-options";

export type ReaderTranslationAnchor = {
  left: number;
  top: number;
  bottom: number;
  width: number;
  containerWidth: number;
  containerViewportLeft: number;
  viewportWidth: number;
  showBelow: boolean;
};

export type ReaderTranslationPopoverState = {
  anchor: ReaderTranslationAnchor;
  status: "choose-language" | "saving-language" | "loading" | "success" | "error";
  translation: string | null;
  source: ReaderTranslationCacheEntry["source"] | null;
  error: string | null;
};

const popoverMaxWidth = 360;
const mobilePopoverBreakpointPx = 768;
const audiobookStartFeedbackMs = 600;

export const getReaderTranslationAnchor = (
  element: HTMLElement,
  container: HTMLElement
): ReaderTranslationAnchor => {
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;

  return {
    left: rect.left - containerRect.left,
    top: rect.top - containerRect.top,
    bottom: rect.bottom - containerRect.top,
    width: rect.width,
    containerWidth: containerRect.width,
    containerViewportLeft: containerRect.left,
    viewportWidth: window.innerWidth,
    showBelow: spaceBelow >= 160 || spaceBelow >= spaceAbove,
  };
};

const getPopoverStyle = (anchor: ReaderTranslationAnchor): CSSProperties => {
  if (anchor.viewportWidth < mobilePopoverBreakpointPx) {
    return {
      position: "absolute",
      left: -anchor.containerViewportLeft,
      top: anchor.showBelow ? anchor.bottom + 8 : anchor.top - 8,
      width: anchor.viewportWidth,
      transform: anchor.showBelow ? undefined : "translateY(-100%)",
      zIndex: 60,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderRadius: 0,
    };
  }

  const width = Math.min(popoverMaxWidth, Math.max(240, anchor.containerWidth - 32));
  const left = Math.min(
    anchor.containerWidth - 16 - width / 2,
    Math.max(16 + width / 2, anchor.left + anchor.width / 2)
  );

  return {
    position: "absolute",
    left,
    top: anchor.showBelow ? anchor.bottom + 8 : anchor.top - 8,
    width,
    transform: anchor.showBelow ? "translateX(-50%)" : "translate(-50%, -100%)",
    zIndex: 60,
  };
};

const getTranslationSourceLabel = (source: ReaderTranslationCacheEntry["source"]) =>
  ({ client: "CL", memory: "MEM", database: "DB", google: "API" })[source];

const ReaderSpeakingIndicator = () => (
  <span aria-hidden="true" className="flex size-3.5 shrink-0 items-center justify-center gap-[2px]">
    <span className="h-2 w-[2px] rounded-full bg-current motion-safe:animate-pulse motion-reduce:opacity-80" style={{ animationDelay: "-300ms", animationDuration: "900ms" }} />
    <span className="h-3 w-[2px] rounded-full bg-current motion-safe:animate-pulse motion-reduce:opacity-80" style={{ animationDelay: "-150ms", animationDuration: "900ms" }} />
    <span className="h-2.5 w-[2px] rounded-full bg-current motion-safe:animate-pulse motion-reduce:opacity-80" style={{ animationDuration: "900ms" }} />
  </span>
);

const ReaderTranslationAction = ({
  label,
  emphasis = false,
  active,
  activeAriaLabel,
  speaking = false,
  onClick,
}: {
  label: string;
  emphasis?: boolean;
  active?: boolean;
  activeAriaLabel?: string;
  speaking?: boolean;
  onClick: () => void;
}) => {
  const [pressed, setPressed] = useState(false);
  const highlighted = active || pressed;

  return (
    <button
      type="button"
      aria-label={active ? activeAriaLabel : undefined}
      aria-pressed={active === undefined ? undefined : active}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") setPressed(true);
      }}
      onKeyUp={() => setPressed(false)}
      onBlur={() => setPressed(false)}
      onClick={onClick}
      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs leading-4 underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 ${highlighted ? "" : "hover:underline hover:opacity-70"} ${emphasis ? "font-semibold" : "font-medium"}`}
      style={{
        backgroundColor: highlighted ? "var(--reader-fg)" : "transparent",
        color: highlighted ? "var(--reader-bg)" : "var(--reader-fg)",
      }}
    >
      <span>{label}</span>
      {speaking && active ? <ReaderSpeakingIndicator /> : <Play aria-hidden="true" className="size-3.5 shrink-0 fill-current" />}
    </button>
  );
};

export const ReaderTranslationPopover = ({
  state,
  scope,
  canListen,
  pronunciationPlaying,
  languageOptions = [],
  onDismiss,
  onPlaySelection,
  onStartAudiobook,
  onLanguageSelect,
}: {
  state: ReaderTranslationPopoverState;
  scope: ReaderTranslationScope;
  canListen: boolean;
  pronunciationPlaying: boolean;
  languageOptions?: LingoCafeLanguageOption[];
  onDismiss: () => void;
  onPlaySelection?: () => void;
  onStartAudiobook?: () => void;
  onLanguageSelect?: (language: string) => void;
}) => {
  const audiobookStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [audiobookStarting, setAudiobookStarting] = useState(false);
  const hasLanguageForm = state.status === "choose-language" || state.status === "saving-language";
  const hasActionLine = state.status === "success" && (state.source !== null || canListen);

  useEffect(() => () => {
    if (audiobookStartTimerRef.current) clearTimeout(audiobookStartTimerRef.current);
  }, []);

  const handleStartAudiobook = () => {
    if (!onStartAudiobook || audiobookStartTimerRef.current) return;
    setAudiobookStarting(true);
    audiobookStartTimerRef.current = setTimeout(() => {
      audiobookStartTimerRef.current = null;
      onStartAudiobook();
    }, audiobookStartFeedbackMs);
  };

  return (
    <div
      data-reader-translation-popover
      className="relative flex flex-col overflow-hidden rounded-md border font-sans backdrop-blur"
      style={{
        ...getPopoverStyle(state.anchor),
        borderColor: "color-mix(in oklab, var(--reader-popover-border) 55%, var(--primary) 45%)",
        backgroundColor: "color-mix(in oklab, var(--reader-bg) 94%, var(--primary) 6%)",
        color: "var(--reader-fg)",
        fontSize: "1rem",
        fontStyle: "normal",
        fontWeight: 400,
        letterSpacing: "normal",
        lineHeight: 1.5,
        textAlign: "left",
        textTransform: "none",
      }}
    >
      {hasLanguageForm ? (
        <div className="min-w-0 px-5 py-3 md:px-4">
          <div className="space-y-3 font-sans">
            <p className="text-sm font-medium">Which language do you want me to translate to?</p>
            <label className="block">
              <span className="sr-only">Translate to</span>
              <select
                value=""
                disabled={state.status === "saving-language"}
                onChange={(event) => {
                  if (event.target.value) onLanguageSelect?.(event.target.value);
                }}
                className="h-10 w-full rounded-md border bg-transparent px-3 text-base shadow-xs outline-none focus-visible:ring-ring/60 focus-visible:ring-[3px] disabled:cursor-wait disabled:opacity-60 md:text-sm"
                style={{ borderColor: "var(--reader-popover-border)", backgroundColor: "var(--reader-bg)", color: "var(--reader-fg)" }}
              >
                <option value="">Choose language</option>
                {languageOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
              </select>
            </label>
            {state.status === "saving-language" ? <p className="text-xs" style={{ color: "var(--reader-fg-muted)" }}>Saving language...</p> : null}
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          </div>
        </div>
      ) : (
        <button type="button" aria-label="Close translation" onClick={onDismiss} className="block min-w-0 px-5 py-3 text-left outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60 md:px-4">
          {state.status === "loading" ? <span style={{ color: "var(--reader-fg-muted)" }}>Translating...</span> : null}
          {state.status === "error" ? <span className="text-destructive">{state.error || "Could not translate."}</span> : null}
          {state.status === "success" ? <span>{state.translation}</span> : null}
        </button>
      )}

      {hasActionLine ? (
        <div className="flex min-w-0 items-baseline gap-2 px-3 pb-[2px] font-sans">
          {state.source ? <span aria-hidden="true" className="mr-auto shrink-0 uppercase tracking-normal" style={{ color: "var(--reader-fg-muted)", fontSize: "6px", lineHeight: "6px", textSizeAdjust: "none", WebkitTextSizeAdjust: "none" }}>{getTranslationSourceLabel(state.source)}</span> : null}
          {canListen && onPlaySelection ? (
            <div className="ml-auto flex min-w-0 items-baseline justify-end gap-4">
              <ReaderTranslationAction label={getTranslationPronunciationVisibleLabel(scope)} active={pronunciationPlaying} activeAriaLabel={getTranslationPronunciationAccessibleLabel(scope, true)} speaking onClick={onPlaySelection} />
              {onStartAudiobook ? <ReaderTranslationAction label="Start audiobook from here" emphasis active={audiobookStarting} onClick={handleStartAudiobook} /> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
