"use client";

import { useMemo, useState } from "react";
import {
  CaseSensitive,
  LoaderCircle,
  Minus,
  MonitorCog,
  MoonStar,
  Plus,
  Sun,
} from "lucide-react";

import type { ThemeValue } from "@/AppConfig";
import { Modal } from "@/42go/components/modal";
import { useTheme } from "@/42go/config/ThemeProvider";
import { cn } from "@/42go/utils/utils";
import { BookReaderPlaybackPreferencesEditor } from "@/app/(app)/(lingocafe)/books/_components/BookReaderPlaybackPreferencesEditor";
import { ReaderSettingSegmentedControl } from "@/app/(app)/(lingocafe)/books/_components/ReaderSettingSegmentedControl";
import type { ReaderPlaybackController } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";
import {
  getAvailableReaderForegrounds,
  getReaderBackground,
  getReaderFont,
  getReaderFontSize,
  getReaderThemeStyle,
  READER_APP_BACKGROUND_KEY,
  READER_APP_FOREGROUND_KEY,
  READER_BACKGROUND_OPTIONS,
  READER_FONT_OPTIONS,
  READER_FONT_SIZE_OPTIONS,
  type ReaderPreferences,
  type ReaderTranslationScope,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import { Button } from "@/components/ui/button";
import {
  NavigationalTabs,
  type NavigationalTabOption,
} from "@/components/ui/navigational-tabs";

type BookReaderPreferencesPanelProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  preferences: ReaderPreferences;
  onPreferencesChange: (next: Partial<ReaderPreferences>) => void;
  translationScope: ReaderTranslationScope;
  onTranslationScopeChange: (next: ReaderTranslationScope) => void;
  canResetPreferences: boolean;
  onResetPreferences: () => void;
  playback: ReaderPlaybackController;
};

type ReaderPreferencesTab = "reading" | "listening";
type ListeningAvailability = "pending" | "available" | "unavailable";

const readerPreferencesTabs: NavigationalTabOption<ReaderPreferencesTab>[] = [
  {
    value: "reading",
    label: "Reading",
    tabId: "reader-preferences-reading-tab",
    panelId: "reader-preferences-reading-panel",
  },
  {
    value: "listening",
    label: "Listening",
    tabId: "reader-preferences-listening-tab",
    panelId: "reader-preferences-listening-panel",
  },
];

const themeOptions: {
  value: ThemeValue;
  label: string;
  Icon: typeof MonitorCog;
}[] = [
  { value: "system", label: "Auto", Icon: MonitorCog },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: MoonStar },
];

const normalizeTheme = (value: string | undefined): ThemeValue => {
  if (value === "light" || value === "dark") return value;
  return "system";
};

const PreferenceSwatch = ({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "flex w-16 shrink-0 flex-col items-center gap-2 text-center",
      active ? "text-foreground" : "text-muted-foreground"
    )}
  >
    <span
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-sm transition",
        active ? "scale-105 border-primary" : "border-border"
      )}
      style={{ backgroundColor: color }}
    >
      {active && (
        <span className="h-3 w-3 rounded-full border border-white/70 bg-white/80" />
      )}
    </span>
    <span className="text-xs font-medium">{label}</span>
  </button>
);

const FontOptionButton = ({
  label,
  sample,
  family,
  active,
  onClick,
}: {
  label: string;
  sample: string;
  family: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full rounded-2xl border px-4 py-3 text-left transition",
      active
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/50"
    )}
  >
    <div className="text-base font-semibold" style={{ fontFamily: family }}>
      {label}
    </div>
    <div
      className="mt-1 text-sm text-muted-foreground"
      style={{ fontFamily: family }}
    >
      {sample}
    </div>
  </button>
);

const PreviewCard = ({
  preferences,
}: {
  preferences: ReaderPreferences;
}) => {
  const font = getReaderFont(preferences);
  const fontSize = getReaderFontSize(preferences);
  const { resolvedTheme } = useTheme();
  const themeStyle = getReaderThemeStyle(
    preferences,
    resolvedTheme === "dark" ? "dark" : "light"
  );

  return (
    <div className="rounded-2xl border p-4 shadow-sm" style={themeStyle}>
      <h3
        className="font-semibold leading-tight"
        style={{ fontFamily: font.family, fontSize: `${fontSize}px` }}
      >
        Lorem ipsum
      </h3>
      <p
        className="mt-3 leading-[1.55]"
        style={{ fontFamily: font.family, fontSize: `${fontSize}px` }}
      >
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </p>
    </div>
  );
};

export const BookReaderPreferencesTrigger = ({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) => (
  <Button
    variant="ghost"
    size="icon"
    type="button"
    onClick={onClick}
    aria-label="Settings"
    className={cn(
      "h-9 w-9 px-0 text-current hover:bg-black/10 hover:text-current dark:hover:bg-white/10 md:h-10 md:w-10",
      className
    )}
  >
    <CaseSensitive className="h-4 w-4" />
  </Button>
);

export const BookReaderPreferencesPanel = ({
  open,
  onOpenChange,
  preferences,
  onPreferencesChange,
  translationScope,
  onTranslationScopeChange,
  canResetPreferences,
  onResetPreferences,
  playback,
}: BookReaderPreferencesPanelProps) => {
  const [activeTab, setActiveTab] =
    useState<ReaderPreferencesTab>("reading");
  const [listeningAvailability, setListeningAvailability] =
    useState<ListeningAvailability>("pending");
  const [previousOpen, setPreviousOpen] = useState(open);
  const { mounted, resolvedTheme, setTheme, theme } = useTheme();
  const currentTheme = normalizeTheme(theme);
  const font = getReaderFont(preferences);
  const fontSize = getReaderFontSize(preferences);
  const background = getReaderBackground(preferences);
  const usesAutoBackground = background.key === READER_APP_BACKGROUND_KEY;
  const foregrounds = useMemo(
    () =>
      getAvailableReaderForegrounds(
        preferences.backgroundKey,
        resolvedTheme === "dark" ? "dark" : "light"
      ),
    [preferences.backgroundKey, resolvedTheme]
  );
  const selectBackground = (backgroundKey: string) => {
    if (backgroundKey === READER_APP_BACKGROUND_KEY) {
      onPreferencesChange({
        backgroundKey,
        foregroundKey: READER_APP_FOREGROUND_KEY,
      });
      return;
    }

    const nextForegrounds = getAvailableReaderForegrounds(
      backgroundKey,
      resolvedTheme === "dark" ? "dark" : "light"
    );
    const hasCurrentForeground = nextForegrounds.some(
      (option) => option.key === preferences.foregroundKey
    );
    const fallbackForeground =
      nextForegrounds.find(
        (option) => option.key !== READER_APP_FOREGROUND_KEY
      ) ?? nextForegrounds[0];

    onPreferencesChange({
      backgroundKey,
      ...(!hasCurrentForeground && fallbackForeground
        ? { foregroundKey: fallbackForeground.key }
        : {}),
    });
  };
  const requestResetPreferences = () => {
    if (!canResetPreferences) return;
    const confirmed = window.confirm(
      "Reset your custom reader appearance settings to defaults?"
    );
    if (!confirmed) return;
    onResetPreferences();
  };
  if (open !== previousOpen) {
    setPreviousOpen(open);
    setActiveTab("reading");
    setListeningAvailability(
      !open || playback.capabilityPending
        ? "pending"
        : playback.canPlay
          ? "available"
          : "unavailable"
    );
  } else if (
    open &&
    listeningAvailability === "pending" &&
    !playback.capabilityPending
  ) {
    setListeningAvailability(
      playback.canPlay ? "available" : "unavailable"
    );
  }

  const showTabs = listeningAvailability === "available";
  const showReading = !showTabs || activeTab === "reading";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      presentation="panel"
      anchor="right"
      size="md"
      title="Reader Preferences"
      ariaLabel="Reader preferences"
      headerClassName="md:h-[68px] md:px-8"
      bodyClassName="px-0 py-0 md:pb-6"
    >
      {listeningAvailability === "pending" ? (
        <div
          role="status"
          className="flex min-h-48 flex-col items-center justify-center gap-3 px-5 py-10 text-center text-sm text-muted-foreground"
        >
          <LoaderCircle
            className="h-6 w-6 animate-spin text-primary"
            aria-hidden="true"
          />
          <span>Checking listening availability...</span>
        </div>
      ) : (
        <>
          {showTabs ? (
            <NavigationalTabs
              ariaLabel="Reader preferences"
              value={activeTab}
              options={readerPreferencesTabs}
              onValueChange={setActiveTab}
            />
          ) : null}

          {showReading ? (
            <div
              id={showTabs ? "reader-preferences-reading-panel" : undefined}
              role={showTabs ? "tabpanel" : undefined}
              aria-labelledby={
                showTabs ? "reader-preferences-reading-tab" : undefined
              }
            >
              <div className="sticky top-0 z-10 border-b bg-background px-5 py-4 md:mb-6 md:border-0 md:pb-4 md:pt-6">
                <PreviewCard preferences={preferences} />
              </div>

              <div className="px-5 py-6 md:py-0">
        <section className="space-y-4">
          <div>
            <h3 className="font-semibold">Theme</h3>
            <p className="text-sm text-muted-foreground">
              Choose how the app appearance should be determined.
            </p>
          </div>

          {!mounted ? (
            <p className="text-sm text-muted-foreground">
              Loading theme preference...
            </p>
          ) : (
            <ReaderSettingSegmentedControl
              ariaLabel="Theme"
              value={currentTheme}
              options={themeOptions}
              onValueChange={setTheme}
            />
          )}
        </section>

        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Font size</h3>
            </div>
            <div className="rounded-full border px-3 py-1 text-sm font-semibold">
              {fontSize}px
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Decrease font size"
              onClick={() =>
                onPreferencesChange({
                  fontSizeIndex: Math.max(0, preferences.fontSizeIndex - 1),
                })
              }
              disabled={preferences.fontSizeIndex <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>

            <input
              type="range"
              min={0}
              max={READER_FONT_SIZE_OPTIONS.length - 1}
              step={1}
              value={preferences.fontSizeIndex}
              onChange={(event) =>
                onPreferencesChange({
                  fontSizeIndex: Number(event.target.value),
                })
              }
              className="h-2 flex-1 cursor-pointer accent-primary"
              aria-label="Reading font size"
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Increase font size"
              onClick={() =>
                onPreferencesChange({
                  fontSizeIndex: Math.min(
                    READER_FONT_SIZE_OPTIONS.length - 1,
                    preferences.fontSizeIndex + 1
                  ),
                })
              }
              disabled={
                preferences.fontSizeIndex >= READER_FONT_SIZE_OPTIONS.length - 1
              }
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <div>
            <h3 className="font-semibold">Font family</h3>
            <p className="text-sm text-muted-foreground">
              Web-safe choices built for long reads.
            </p>
          </div>
          <div className="space-y-3">
            {READER_FONT_OPTIONS.map((option) => (
              <FontOptionButton
                key={option.key}
                label={option.label}
                sample={option.sample}
                family={option.family}
                active={option.key === font.key}
                onClick={() =>
                  onPreferencesChange({ fontFamilyKey: option.key })
                }
              />
            ))}
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <div>
            <h3 className="font-semibold">Background</h3>
            <p className="text-sm text-muted-foreground">
              These colors take over the reading canvas in light and dark theme.
            </p>
          </div>
          <div className="-mx-1 overflow-x-auto pb-2 md:mx-0 md:overflow-visible md:pb-0">
            <div className="flex gap-4 px-1 md:grid md:grid-cols-3 md:px-0">
              {READER_BACKGROUND_OPTIONS.map((option) => (
                <PreferenceSwatch
                  key={option.key}
                  label={option.label}
                  color={option.value}
                  active={option.key === background.key}
                  onClick={() => selectBackground(option.key)}
                />
              ))}
            </div>
          </div>
        </section>

        <div
          aria-hidden={usesAutoBackground}
          className={cn(
            "overflow-hidden transition-[max-height,opacity,margin-top] duration-300 ease-out",
            usesAutoBackground
              ? "mt-0 max-h-0 opacity-0"
              : "mt-8 max-h-72 opacity-100"
          )}
        >
          <section className="space-y-4">
            <div>
              <h3 className="font-semibold">Text color</h3>
              <p className="text-sm text-muted-foreground">
                Only high-contrast matches survive this cage match.
              </p>
            </div>
            <div className="-mx-1 overflow-x-auto pb-2 md:mx-0 md:overflow-visible md:pb-0">
              <div className="flex gap-4 px-1 md:grid md:grid-cols-3 md:px-0">
                {foregrounds.map((option) => (
                  <PreferenceSwatch
                    key={option.key}
                    label={option.label}
                    color={option.value}
                    active={option.key === preferences.foregroundKey}
                    onClick={() =>
                      onPreferencesChange({ foregroundKey: option.key })
                    }
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-8 space-y-4">
          <div>
            <h3 className="font-semibold">Translation</h3>
            <p className="text-sm text-muted-foreground">
              Choose how much text is translated when you tap the reader.
            </p>
          </div>
          <div
            role="tablist"
            aria-label="Translation scope"
            className="flex flex-nowrap items-stretch gap-1 overflow-x-auto rounded-lg border border-border bg-muted/20 p-1"
          >
            {[
              { value: "sentence", label: "Translate full sentence" },
              { value: "word", label: "Translate single word" },
            ].map(({ value, label }) => {
              const selected = translationScope === value;

              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() =>
                    onTranslationScopeChange(
                      value === "word" ? "word" : "sentence"
                    )
                  }
                  className={cn(
                    "flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-md border px-2 text-center text-xs font-medium transition-colors outline-none sm:text-sm",
                    "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    selected
                      ? "border-[var(--primary)] bg-primary/5 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <Button
            type="button"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>

          {canResetPreferences && (
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={requestResetPreferences}
            >
              Reset reading preferences
            </Button>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          These preferences are stored on your device.
        </p>
              </div>
            </div>
          ) : (
            <div
              id="reader-preferences-listening-panel"
              role="tabpanel"
              aria-labelledby="reader-preferences-listening-tab"
              className="px-5 py-6"
            >
              <BookReaderPlaybackPreferencesEditor
                playback={playback}
                variant="panel"
              />
            </div>
          )}
        </>
      )}
    </Modal>
  );
};
