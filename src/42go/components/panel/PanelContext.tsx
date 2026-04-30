"use client";
import { createContext, useContext } from "react";

export type PanelVariant = "default" | "muted" | "outline";
export type PanelPadding = "none" | "sm" | "md"; // sizes map to tailwind padding classes
export type PanelGap = "none" | "sm" | "md" | "lg";

export interface PanelContextValue {
  variant: PanelVariant;
  padding: PanelPadding;
  gap: PanelGap;
}

const PanelContext = createContext<PanelContextValue | null>(null);

export const usePanelContext = (): PanelContextValue => {
  const ctx = useContext(PanelContext);
  if (!ctx) {
    throw new Error("Panel sub-component used outside <Panel>");
  }
  return ctx;
};

export const PanelProvider = PanelContext.Provider;
