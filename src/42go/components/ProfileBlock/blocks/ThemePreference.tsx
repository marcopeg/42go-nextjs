"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { MonitorCog, MoonStar, Sun } from "lucide-react";

import type { ThemeValue } from "@/AppConfig";
import { useProfileBlockHandle } from "@/42go/components/ProfileBlock/ProfileBlockRuntime";
import { SimplePanel } from "@/42go/components/panel";
import { useTheme } from "@/42go/config/ThemeProvider";
import { cn } from "@/lib/utils";

type ThemePreferenceProps = {
  title?: string;
  description?: string;
};

const themeOptions: { value: ThemeValue; label: string; Icon: LucideIcon }[] = [
  { value: "system", label: "Auto", Icon: MonitorCog },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: MoonStar },
];

const normalizeTheme = (value: string | undefined): ThemeValue => {
  if (value === "light" || value === "dark") return value;
  return "system";
};

export const ThemePreference = ({
  title = "Theme",
  description = "Choose how the app appearance should be determined.",
}: ThemePreferenceProps) => {
  const { mounted, setTheme, theme } = useTheme();
  const currentTheme = normalizeTheme(theme);
  const [savedTheme, setSavedTheme] = useState<ThemeValue | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isDirty =
    mounted && savedTheme !== null && currentTheme !== savedTheme;

  useProfileBlockHandle(
    useMemo(
      () => ({
        dirty: isDirty,
        onSaveSuccess: () => {
          setSavedTheme(currentTheme);
          setErrorMessage(null);
        },
      }),
      [currentTheme, isDirty]
    )
  );

  const handleThemeChange = (nextTheme: ThemeValue) => {
    if (!mounted || nextTheme === currentTheme) return;

    const previousTheme = currentTheme;
    const hasSavedTheme = savedTheme !== null;
    setErrorMessage(null);
    setSavedTheme((current) => current ?? previousTheme);

    try {
      setTheme(nextTheme);
    } catch {
      if (!hasSavedTheme) setSavedTheme(null);

      try {
        setTheme(previousTheme);
      } catch {
        // Best effort rollback if persistence or application fails.
      }

      setErrorMessage("Could not update the theme. Reverted to the previous preference.");
    }
  };

  return (
    <SimplePanel title={title} description={description}>
      <div className="space-y-4">
        {!mounted ? (
          <p className="text-sm text-muted-foreground">
            Loading theme preference...
          </p>
        ) : (
          <div
            role="tablist"
            aria-label="Theme"
            className="flex flex-nowrap items-stretch gap-1 overflow-x-auto rounded-lg border border-border bg-muted/20 p-1"
          >
            {themeOptions.map(({ value, label, Icon }) => {
              const active = currentTheme === value;

              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleThemeChange(value)}
                  className={cn(
                    "flex h-10 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-xs font-medium transition-colors outline-none sm:h-12 sm:gap-2 sm:px-2 sm:text-sm",
                    "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    active
                      ? "border-[var(--primary)] bg-primary/5 text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        )}
        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
      </div>
    </SimplePanel>
  );
};
