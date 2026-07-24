"use client";

import { READER_PLAYBACK_SPEEDS } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/model";
import type { ReaderPlaybackSpeed } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/model";
import type { ReaderPlaybackController } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";
import {
  ReaderSettingSegmentedControl,
  type ReaderSettingSegmentedOption,
} from "@/app/(app)/(lingocafe)/books/_components/ReaderSettingSegmentedControl";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const playbackSpeedOptions: ReaderSettingSegmentedOption<ReaderPlaybackSpeed>[] =
  READER_PLAYBACK_SPEEDS.map((speed) => ({
    value: speed,
    label: `${speed}×`,
  }));

type PlaybackToggleProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  variant: "compact" | "panel";
};

const PlaybackToggle = ({
  label,
  checked,
  onCheckedChange,
  variant,
}: PlaybackToggleProps) => (
  <div
    className={cn(
      "flex min-h-11 items-center justify-between gap-4",
      variant === "compact" ? "px-4 py-1" : "px-4 py-2"
    )}
  >
    <span className="text-sm font-medium">{label}</span>
    <Switch
      checked={checked}
      aria-label={label}
      onCheckedChange={onCheckedChange}
    />
  </div>
);

export const BookReaderPlaybackPreferencesEditor = ({
  playback,
  variant = "compact",
}: {
  playback: ReaderPlaybackController;
  variant?: "compact" | "panel";
}) => {
  const { preferences } = playback;
  const toggles = [
    {
      label: "Word highlighting",
      checked: preferences.wordHighlighting,
      onCheckedChange: playback.setWordHighlighting,
    },
    {
      label: "Sentence highlighting",
      checked: preferences.sentenceHighlighting,
      onCheckedChange: playback.setSentenceHighlighting,
    },
    {
      label: "Reveal as you listen",
      checked: preferences.progressiveReveal,
      onCheckedChange: playback.setProgressiveReveal,
    },
    {
      label: "Dim previous sentences",
      checked: preferences.dimPreviousSentences,
      onCheckedChange: playback.setDimPreviousSentences,
    },
    {
      label: "Auto-pause on translation",
      checked: preferences.autoPauseOnTranslation,
      onCheckedChange: playback.setAutoPauseOnTranslation,
    },
    {
      label: "Auto-pause on settings",
      checked: preferences.autoPauseOnSettings,
      onCheckedChange: playback.setAutoPauseOnSettings,
    },
  ];

  const toggleRows = toggles.map((toggle) => (
    <PlaybackToggle key={toggle.label} {...toggle} variant={variant} />
  ));

  return (
    <div
      className={cn(
        variant === "compact"
          ? "divide-y overflow-y-auto overscroll-contain pb-2"
          : "space-y-6"
      )}
      style={
        variant === "compact"
          ? { maxHeight: "min(26rem, calc(100dvh - 10rem))" }
          : undefined
      }
    >
      <section className={variant === "compact" ? "px-4 py-3" : "space-y-3"}>
        <div>
          <h3 className="text-sm font-semibold">Speed</h3>
          {variant === "panel" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Choose the pace used for page and word playback.
            </p>
          ) : null}
        </div>
        <ReaderSettingSegmentedControl
          ariaLabel="Playback speed"
          value={preferences.speed}
          options={playbackSpeedOptions}
          onValueChange={playback.setSpeed}
        />
      </section>

      {variant === "compact" ? (
        toggleRows
      ) : (
        <section>
          <div className="mb-3">
            <h3 className="font-semibold">Playback behavior</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Changes apply immediately and stay on this device.
            </p>
          </div>
          <div className="divide-y rounded-2xl border">{toggleRows}</div>
        </section>
      )}
    </div>
  );
};
