"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { MonitorCog, MoonStar, Sun } from "lucide-react";

import type { ThemeValue } from "@/AppConfig";
import { SimplePanel } from "@/42go/components/panel";
import { useProfileBlockHandle } from "@/42go/components/ProfileBlock/ProfileBlockRuntime";
import { useTheme } from "@/42go/config/ThemeProvider";
import { useProfile } from "@/42go/profile/client";
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
  const { saving } = useProfile();
  const currentTheme = normalizeTheme(theme);
  const [draftTheme, setDraftTheme] = useState<ThemeValue | null>(null);
  const [committedThemeOverride, setCommittedThemeOverride] =
    useState<ThemeValue | null>(null);
  const pendingAppliedTheme =
    committedThemeOverride && committedThemeOverride !== currentTheme
      ? committedThemeOverride
      : null;
  const selectedTheme = draftTheme ?? pendingAppliedTheme ?? currentTheme;
  const dirty = mounted && draftTheme !== null && draftTheme !== currentTheme;

  useProfileBlockHandle(
    useMemo(
      () => ({
        dirty,
        onSaveSuccess: () => {
          if (!draftTheme) return;

          setCommittedThemeOverride(draftTheme);
          setTheme(draftTheme);
          setDraftTheme(null);
        },
      }),
      [dirty, draftTheme, setTheme]
    )
  );

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
            className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/20 p-1"
          >
            {themeOptions.map(({ value, label, Icon }) => {
              const active = selectedTheme === value;

              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={saving}
                  onClick={() => {
                    setCommittedThemeOverride(null);
                    setDraftTheme(value === currentTheme ? null : value);
                  }}
                  className={cn(
                    "flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-sm font-medium transition-colors outline-none sm:h-12 sm:gap-2",
                    "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    "disabled:cursor-not-allowed disabled:opacity-60",
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
      </div>
    </SimplePanel>
  );
};
