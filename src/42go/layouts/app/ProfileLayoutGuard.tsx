"use client";

import { useEffect, useState, type ComponentType } from "react";

import type {
  TProfileBeforeGuardReleaseOptions,
  TProfileLayoutGuardConfig,
  TProfileLayoutGuardProps,
  TProfileLayoutGuardSlot,
} from "@/42go/components/ProfileBlock";

type ProfileLayoutGuardProps = {
  guard?: TProfileLayoutGuardConfig;
  slot?: TProfileLayoutGuardSlot;
  onBeforeGuardRelease?: (
    options?: TProfileBeforeGuardReleaseOptions
  ) => void;
};

const defaultFallback = null;

type LoadedGuardState = {
  guard: TProfileLayoutGuardConfig;
  slot: TProfileLayoutGuardSlot;
  component: ComponentType<TProfileLayoutGuardProps>;
};

export const ProfileLayoutGuard = ({
  guard,
  slot = "layout",
  onBeforeGuardRelease,
}: ProfileLayoutGuardProps) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedGuard, setLoadedGuard] = useState<LoadedGuardState | null>(
    null
  );

  useEffect(() => {
    if (slot !== "layout") return;

    const handleProfileComplete = () => {
      setRefreshKey((current) => current + 1);
    };

    window.addEventListener("profile:complete", handleProfileComplete);
    return () =>
      window.removeEventListener("profile:complete", handleProfileComplete);
  }, [slot]);

  useEffect(() => {
    let active = true;

    if (!guard?.loader || guard.slot !== slot) return;

    guard.loader().then((module) => {
      if (active) {
        setLoadedGuard({
          guard,
          slot,
          component: module.default,
        });
      }
    });

    return () => {
      active = false;
    };
  }, [guard, slot]);

  if (!guard || guard.slot !== slot) return null;

  const guardProps: TProfileLayoutGuardProps = {
    refreshKey,
    releaseBeforeGuard: slot === "before" ? onBeforeGuardRelease : undefined,
  };
  const LoadedGuard =
    loadedGuard?.guard === guard && loadedGuard.slot === slot
      ? loadedGuard.component
      : null;

  if (guard.component) {
    const GuardComponent = guard.component;
    return <GuardComponent key={refreshKey} {...guardProps} />;
  }

  if (LoadedGuard) return <LoadedGuard key={refreshKey} {...guardProps} />;

  if (guard.loader) return <>{guard.fallback ?? defaultFallback}</>;

  return null;
};
