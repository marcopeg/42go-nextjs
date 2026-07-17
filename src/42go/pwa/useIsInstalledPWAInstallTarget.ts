"use client";

import { useEffect, useSyncExternalStore } from "react";

import { PWA_INSTALL_TARGET_SESSION_KEY } from "@/42go/pwa/constants";
import {
  getPWAInstallTargetMarker,
  isInstalledPWAInstallTarget,
} from "@/42go/pwa/install-target-context";
import { usePWAInstall } from "@/42go/pwa/usePWAInstall";

const PWA_INSTALL_TARGET_CHANGE_EVENT = "42go:pwa-install-target-change";

const subscribeToInstallTarget = (onChange: () => void) => {
  window.addEventListener(PWA_INSTALL_TARGET_CHANGE_EVENT, onChange);
  return () =>
    window.removeEventListener(PWA_INSTALL_TARGET_CHANGE_EVENT, onChange);
};

const readStoredTargetId = () => {
  try {
    return sessionStorage.getItem(PWA_INSTALL_TARGET_SESSION_KEY);
  } catch {
    return null;
  }
};

export const useIsInstalledPWAInstallTarget = (targetId: string) => {
  const { isStandalone } = usePWAInstall();
  const isInstalledTarget = useSyncExternalStore(
    subscribeToInstallTarget,
    () => {
      const launchTargetId = getPWAInstallTargetMarker(window.location.search);
      return isInstalledPWAInstallTarget({
        isStandalone,
        launchTargetId,
        storedTargetId: readStoredTargetId(),
        targetId,
      });
    },
    () => false
  );

  useEffect(() => {
    if (!isStandalone || !targetId) return;

    const launchTargetId = getPWAInstallTargetMarker(window.location.search);
    if (launchTargetId !== targetId) return;

    try {
      sessionStorage.setItem(PWA_INSTALL_TARGET_SESSION_KEY, targetId);
      window.dispatchEvent(new Event(PWA_INSTALL_TARGET_CHANGE_EVENT));
    } catch {
      // The launch marker remains sufficient when storage is unavailable.
    }
  }, [isStandalone, targetId]);

  return isInstalledTarget;
};
