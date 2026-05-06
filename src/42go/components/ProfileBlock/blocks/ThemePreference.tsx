"use client";

import { useMemo, useState } from "react";

import type { ThemeValue } from "@/AppConfig";
import { SimplePanel } from "@/42go/components/panel";
import { useProfileBlockHandle } from "@/42go/components/ProfileBlock/ProfileBlockRuntime";
import { useTheme } from "@/42go/config/ThemeProvider";
import { useProfile } from "@/42go/profile/client";

type ThemePreferenceProps = {
  title?: string;
  description?: string;
};

const themeOptions: { value: ThemeValue; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const normalizeTheme = (value: string | undefined): ThemeValue => {
  if (value === "light" || value === "dark") return value;
  return "system";
};

export const ThemePreference = ({
  title = "Theme Preferences",
  description = "Choose how the app should look on this device.",
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
          <label className="block space-y-2 text-sm font-medium">
            <span>Theme</span>
            <select
              value={selectedTheme}
              onChange={(event) => {
                const nextTheme = normalizeTheme(event.target.value);

                setCommittedThemeOverride(null);
                setDraftTheme(
                  nextTheme === currentTheme ? null : nextTheme
                );
              }}
              disabled={saving}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </SimplePanel>
  );
};
