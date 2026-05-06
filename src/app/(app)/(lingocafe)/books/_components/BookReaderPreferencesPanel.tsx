"use client";

import { useEffect, useMemo } from "react";
import { CaseSensitive, Minus, Plus, X } from "lucide-react";

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
  onResetPreferences: () => void;
  mobile?: boolean;
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
    aria-label="Open reading preferences"
    className={cn(
      "text-current hover:bg-black/10 hover:text-current dark:hover:bg-white/10",
      className
    )}
  >
    <CaseSensitive className="h-5 w-5" />
  </Button>
);

export const BookReaderPreferencesPanel = ({
  open,
  onOpenChange,
  preferences,
  onPreferencesChange,
  onResetPreferences,
  mobile = false,
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

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0",
        mobile ? "z-[680] md:hidden" : "z-[690] hidden md:block"
      )}
    >
      <button
        type="button"
        aria-label="Close reading preferences"
        className="absolute inset-0 bg-black/30"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reading preferences"
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col border-l bg-background text-foreground shadow-2xl",
          mobile ? "max-w-full" : "max-w-[420px]"
        )}
      >
        <div className="border-b px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Reading
              </p>
              <h2 className="text-lg font-semibold">Preferences</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Close reading preferences"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-4">
            <PreviewCard preferences={preferences} mobile={mobile} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
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
                  preferences.fontSizeIndex >=
                  READER_FONT_SIZE_OPTIONS.length - 1
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {!mobile && (
              <div className="grid grid-cols-10 gap-2">
                {READER_FONT_SIZE_OPTIONS.map((size, index) => {
                  const active = index === preferences.fontSizeIndex;
                  return (
                    <button
                      key={size}
                      type="button"
                      aria-label={`Set font size to ${size}px`}
                      aria-pressed={active}
                      onClick={() =>
                        onPreferencesChange({ fontSizeIndex: index })
                      }
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
                These colors take over the reading canvas in light and dark
                theme.
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

          <section className="mt-8 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              Stored on this device only. Local storage, not your profile. The
              cloud can wait.
            </p>
          </section>

          <div className="h-6" />
        </div>

        <div className="border-t px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onResetPreferences}
          >
            Reset reading preferences
          </Button>
        </div>
      </div>
    </div>
  );
};
