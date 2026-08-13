"use client";

import { Volume2 } from "lucide-react";
import type { CSSProperties } from "react";

import type { ReaderTranslationScope } from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import type { ReaderPlaybackController } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";
import { ExpandableFab } from "@/components/ui/expandable-fab";
import { TranslationScopeFab } from "@/components/ui/translation-scope-fab";

type BookReaderFloatingActionBarProps = {
  playback: ReaderPlaybackController;
  translationAvailable: boolean;
  translationScope: ReaderTranslationScope;
  onTranslationScopeChange: (scope: ReaderTranslationScope) => void;
  readerThemeStyle: CSSProperties;
};

const floatingBarStyle: CSSProperties = {
  position: "fixed",
  left: "calc(env(safe-area-inset-left) + 1.25rem)",
  right: "calc(env(safe-area-inset-right) + 1.25rem)",
  bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)",
  zIndex: 1000,
};

const translationTooltipClassName =
  "border-[var(--reader-popover-border)] bg-[var(--reader-popover-bg)] text-[var(--reader-fg)] data-[highlighted]:bg-[var(--reader-hover-bg)] data-[highlighted]:text-[var(--reader-fg)]";

const getReaderThemeVariables = (style: CSSProperties): CSSProperties =>
  Object.fromEntries(
    Object.entries(style).filter(([property]) =>
      property.startsWith("--reader-")
    )
  ) as CSSProperties;

export const BookReaderFloatingActionBar = ({
  playback,
  translationAvailable,
  translationScope,
  onTranslationScopeChange,
  readerThemeStyle,
}: BookReaderFloatingActionBarProps) => {
  if (playback.isOpen || (!translationAvailable && !playback.canPlay)) {
    return null;
  }

  const renderTranslationFab = () =>
    translationAvailable ? (
      <TranslationScopeFab
        scope={translationScope}
        onScopeChange={onTranslationScopeChange}
        style={getReaderThemeVariables(readerThemeStyle)}
        tooltipClassName={translationTooltipClassName}
      />
    ) : null;

  return (
    <div
      role="region"
      aria-label="Reader actions"
      className="pointer-events-none grid min-w-0 grid-cols-[1fr_auto_1fr] items-end"
      style={floatingBarStyle}
    >
      <div className="pointer-events-auto justify-self-start md:hidden">
        {renderTranslationFab()}
      </div>

      <div aria-hidden="true" />

      <div className="pointer-events-auto flex items-center gap-3 justify-self-end">
        <div className="hidden md:block">{renderTranslationFab()}</div>
        {playback.canPlay ? (
          <ExpandableFab
            label="Play page aloud"
            icon={<Volume2 aria-hidden="true" className="size-6" />}
            onClick={() => playback.start()}
          />
        ) : null}
      </div>
    </div>
  );
};
