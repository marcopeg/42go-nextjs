"use client";

import { useCallback, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleOff, Clock3, Gauge, Zap } from "lucide-react";

import { SimplePanel } from "@/42go/components/panel";
import { useProfileBlockHandle } from "@/42go/components/ProfileBlock";
import { useProfile } from "@/42go/profile/client";
import {
  isQuicklistAutoRefreshLevel,
  QUICKLIST_AUTO_REFRESH_PROFILE_KEY,
  type QuicklistAutoRefreshLevel,
  resolveQuicklistAutoRefreshLevel,
} from "@/config/quicklist/profile-options";
import { cn } from "@/lib/utils";

const levelOptions: {
  value: QuicklistAutoRefreshLevel;
  label: string;
  description: string;
  Icon: LucideIcon;
}[] = [
  { value: "off", label: "Off", description: "Manual only", Icon: CircleOff },
  { value: "slow", label: "Slow", description: "Every 30 seconds", Icon: Clock3 },
  { value: "medium", label: "Medium", description: "Every 15 seconds", Icon: Gauge },
  { value: "fast", label: "Fast", description: "Every 5 seconds", Icon: Zap },
];

export const QuicklistPreferences = () => {
  const { profile, setProfileValue, loading, saving } = useProfile();
  const rawLevel = profile[QUICKLIST_AUTO_REFRESH_PROFILE_KEY];
  const level = resolveQuicklistAutoRefreshLevel(rawLevel);
  const disabled = loading || saving;

  const validate = useCallback(() => {
    if (rawLevel === undefined || isQuicklistAutoRefreshLevel(rawLevel)) {
      return { ok: true as const };
    }

    return {
      ok: false as const,
      message: "Choose a valid automatic refresh speed.",
    };
  }, [rawLevel]);

  useProfileBlockHandle(useMemo(() => ({ validate }), [validate]));

  if (loading) {
    return (
      <SimplePanel title="Automatic list refresh">
        <p className="text-sm text-muted-foreground">
          Loading refresh preference...
        </p>
      </SimplePanel>
    );
  }

  return (
    <SimplePanel
      title="Automatic list refresh"
      description="Choose how often an open list checks for changes. Medium (15 seconds) is the default."
    >
      <div
        role="tablist"
        aria-label="Automatic list refresh speed"
        className="flex flex-nowrap items-stretch gap-1 overflow-x-auto rounded-lg border border-border bg-muted/20 p-1"
      >
        {levelOptions.map(({ value, label, description, Icon }) => {
          const active = level === value;

          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${label}: ${description}`}
              title={description}
              disabled={disabled}
              onClick={() => {
                if (!active) {
                  setProfileValue(QUICKLIST_AUTO_REFRESH_PROFILE_KEY, value);
                }
              }}
              className={cn(
                "flex h-10 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-xs font-medium transition-colors outline-none sm:h-12 sm:gap-2 sm:px-2 sm:text-sm",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                "disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-[var(--primary)] bg-primary/5 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </SimplePanel>
  );
};
