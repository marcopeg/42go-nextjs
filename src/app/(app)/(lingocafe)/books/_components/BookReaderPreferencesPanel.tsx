"use client";

import { useEffect, useMemo, useState } from "react";
import { CaseSensitive, Minus, Plus } from "lucide-react";

import { Modal } from "@/42go/components/modal";
import { useTheme } from "@/42go/config/ThemeProvider";
import { cn } from "@/42go/utils/utils";
import {
  getAvailableReaderForegrounds,
  getReaderBackground,
  getReaderFont,
  getReaderFontSize,
  getReaderThemeStyle,
  READER_BACKGROUND_OPTIONS,
  READER_FONT_OPTIONS,
  READER_FONT_SIZE_OPTIONS,
  type ReaderPreferences,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import { Button } from "@/components/ui/button";

type BookReaderPreferencesPanelProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  preferences: ReaderPreferences;
  onPreferencesChange: (next: Partial<ReaderPreferences>) => void;
  canResetPreferences: boolean;
  onResetPreferences: () => void;
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
  mobile = false,
}: {
  preferences: ReaderPreferences;
  mobile?: boolean;
}) => {
  const font = getReaderFont(preferences);
  const fontSize = getReaderFontSize(preferences);
  const { resolvedTheme } = useTheme();
  const themeStyle = getReaderThemeStyle(
    preferences,
    resolvedTheme === "dark" ? "dark" : "light"
  );

  return (
    <div
      className={cn(
        "rounded-[28px] border shadow-sm",
        mobile ? "p-4" : "p-5"
      )}
      style={themeStyle}
    >
      <p
        className="text-xs uppercase tracking-[0.22em]"
        style={{ color: "var(--reader-fg-muted)" }}
      >
        Live preview
      </p>
      <h3
        className={cn(
          "font-semibold leading-tight",
          mobile ? "mt-2 text-[1.5em]" : "mt-3 text-[1.8em]"
        )}
        style={{ fontFamily: font.family, fontSize: `${fontSize}px` }}
      >
        Lorem ipsum
      </h3>
      <p
        className={cn(mobile ? "mt-3 leading-[1.55]" : "mt-4 leading-[1.8]")}
        style={{ fontFamily: font.family, fontSize: `${fontSize}px` }}
      >
        {mobile
          ? "Short preview text for quick visual checks."
          : "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet."}
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
    aria-label="Inställningar"
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
  canResetPreferences,
  onResetPreferences,
}: BookReaderPreferencesPanelProps) => {
  const { resolvedTheme } = useTheme();
  const font = getReaderFont(preferences);
  const fontSize = getReaderFontSize(preferences);
  const background = getReaderBackground(preferences);
  const foregrounds = useMemo(
    () =>
      getAvailableReaderForegrounds(
        preferences.backgroundKey,
        resolvedTheme === "dark" ? "dark" : "light"
      ),
    [preferences.backgroundKey, resolvedTheme]
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  const requestResetPreferences = () => {
    if (!canResetPreferences) return;
    const confirmed = window.confirm(
      "Reset your custom reader appearance settings to defaults?"
    );
    if (!confirmed) return;
    onResetPreferences();
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      presentation="panel"
      anchor="right"
      size="md"
      title="Preferences"
      subtitle="Reading"
      ariaLabel="Reading preferences"
      headerClassName="md:h-[68px] md:px-8"
      bodyClassName="px-0 py-0 md:px-5 md:py-6"
    >
      <div className="sticky top-0 z-10 border-b bg-background/95 px-5 py-4 backdrop-blur md:static md:mb-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <PreviewCard preferences={preferences} mobile={isMobile} />
      </div>

      <div className="px-5 py-6 md:p-0">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Font size</h3>
              <p className="text-sm text-muted-foreground">
                Ten stops. No nonsense.
              </p>
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

          {!isMobile && (
            <div className="grid grid-cols-10 gap-2">
              {READER_FONT_SIZE_OPTIONS.map((size, index) => {
                const active = index === preferences.fontSizeIndex;
                return (
                  <button
                    key={size}
                    type="button"
                    aria-label={`Set font size to ${size}px`}
                    aria-pressed={active}
                    onClick={() => onPreferencesChange({ fontSizeIndex: index })}
                    className={cn(
                      "h-6 rounded-full border transition",
                      active
                        ? "border-primary bg-primary"
                        : "border-border bg-muted hover:border-primary/50"
                    )}
                  />
                );
              })}
            </div>
          )}
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
                  onClick={() =>
                    onPreferencesChange({ backgroundKey: option.key })
                  }
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-4">
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

        {canResetPreferences && (
          <section className="mt-8 border-t pt-6">
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={requestResetPreferences}
            >
              Reset reading preferences
            </Button>
          </section>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          These preferences are stored on your device.
        </p>
      </div>

    </Modal>
  );
};
