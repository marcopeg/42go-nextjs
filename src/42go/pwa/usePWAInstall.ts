"use client";

import { useContext } from "react";

import {
  PWAInstallContext,
  type TPWAInstallContext,
} from "@/42go/pwa/PWAInstallProvider";

export const usePWAInstall = (): TPWAInstallContext => {
  const context = useContext(PWAInstallContext);
  if (!context) {
    throw new Error("usePWAInstall must be used inside PWAInstallProvider");
  }
  return context;
};
