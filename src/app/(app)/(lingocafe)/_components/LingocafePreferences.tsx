"use client";

import { useCallback, useMemo, useState } from "react";

import { SimplePanel } from "@/42go/components/panel";
import { useProfileBlockHandle } from "@/42go/components/ProfileBlock/ProfileBlockRuntime";
import { useProfile } from "@/42go/profile/client";
import { getLingoCafeReaderLanguages } from "@/config/lingocafe/profile-options";

const languages = getLingoCafeReaderLanguages();

export const LingocafePreferences = () => {
  const { profile, setProfileValue, loading, saving } = useProfile();
  const [submitted, setSubmitted] = useState(false);
  const ownLang = typeof profile.ownLang === "string" ? profile.ownLang : "";
  const targetLang =
    typeof profile.targetLang === "string" ? profile.targetLang : "";
  const targetLevel =
    typeof profile.targetLevel === "string" ? profile.targetLevel : "";
  const disabled = loading || saving;
  const missing = !ownLang || !targetLang || !targetLevel;

  const validate = useCallback(() => {
    setSubmitted(true);

    if (missing) {
      return {
        ok: false as const,
        message: "Choose your language, learning language, and level.",
      };
    }

    return { ok: true as const };
  }, [missing]);

  useProfileBlockHandle(useMemo(() => ({ validate }), [validate]));

  return (
    <SimplePanel
      title="Language Preferences"
      description="Set how LingoCafe chooses your reading material."
    >
      <div className="space-y-5">
        {submitted && missing && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Choose your language, learning language, and level.
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading language preferences...
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block space-y-2 text-sm font-medium">
              <span>Your language</span>
              <select
                value={ownLang}
                onChange={(event) =>
                  setProfileValue("ownLang", event.target.value)
                }
                disabled={disabled}
                aria-invalid={submitted && !ownLang}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive"
              >
                <option value="">Choose language</option>
                {languages.own.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Learning language</span>
              <select
                value={targetLang}
                onChange={(event) =>
                  setProfileValue("targetLang", event.target.value)
                }
                disabled={disabled}
                aria-invalid={submitted && !targetLang}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive"
              >
                <option value="">Choose language</option>
                {languages.target.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Level</span>
              <select
                value={targetLevel}
                onChange={(event) =>
                  setProfileValue("targetLevel", event.target.value)
                }
                disabled={disabled}
                aria-invalid={submitted && !targetLevel}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive"
              >
                <option value="">Choose level</option>
                {languages.levels.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </SimplePanel>
  );
};
