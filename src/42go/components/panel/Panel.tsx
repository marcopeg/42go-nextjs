"use client";
import type { ReactNode, ElementType } from "react";
import {
  PanelProvider,
  type PanelVariant,
  type PanelPadding,
  type PanelGap,
} from "./PanelContext";
import { cn } from "@/lib/utils";

const variantClasses: Record<PanelVariant, string> = {
  default: "bg-card border",
  muted: "bg-card border", // TODO differentiate when design ready
  outline: "bg-card border", // TODO differentiate
};

const paddingClasses: Record<PanelPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
};

export interface PanelProps {
  children: ReactNode;
  as?: ElementType;
  variant?: PanelVariant;
  padding?: PanelPadding;
  gap?: PanelGap;
  className?: string;
}

export const Panel = ({
  children,
  as: Comp = "div",
  variant = "default",
  padding = "md",
  gap = "md",
  className,
}: PanelProps) => {
  return (
    <PanelProvider value={{ variant, padding, gap }}>
      <Comp
        className={cn(
          "rounded-lg",
          variantClasses[variant],
          paddingClasses[padding],
          className
        )}
      >
        {children}
      </Comp>
    </PanelProvider>
  );
};
