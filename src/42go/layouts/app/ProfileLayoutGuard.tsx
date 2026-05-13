"use client";

import { useEffect, useState, type ComponentType } from "react";

import type {
  TProfileLayoutGuardConfig,
  TProfileLayoutGuardProps,
} from "@/42go/components/ProfileBlock";

type ProfileLayoutGuardProps = {
  guard?: TProfileLayoutGuardConfig;
};

const defaultFallback = null;

export const ProfileLayoutGuard = ({ guard }: ProfileLayoutGuardProps) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [LoadedGuard, setLoadedGuard] =
    useState<ComponentType<TProfileLayoutGuardProps> | null>(null);

  useEffect(() => {
    const handleProfileComplete = () => {
      setRefreshKey((current) => current + 1);
    };

    window.addEventListener("profile:complete", handleProfileComplete);
    return () =>
      window.removeEventListener("profile:complete", handleProfileComplete);
  }, []);

  useEffect(() => {
    let active = true;

    if (!guard?.loader) return;

    guard.loader().then((module) => {
      if (active) setLoadedGuard(() => module.default);
    });

    return () => {
      active = false;
    };
  }, [guard]);

  if (!guard || guard.slot !== "layout") return null;

  const guardProps: TProfileLayoutGuardProps = { refreshKey };

  if (guard.component) {
    const GuardComponent = guard.component;
    return <GuardComponent key={refreshKey} {...guardProps} />;
  }

  if (LoadedGuard) return <LoadedGuard key={refreshKey} {...guardProps} />;

  if (guard.loader) return <>{guard.fallback ?? defaultFallback}</>;

  return null;
};
