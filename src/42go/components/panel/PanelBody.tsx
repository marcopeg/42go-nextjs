"use client";
import type { ReactNode } from "react";
import { usePanelContext } from "./PanelContext";
import { cn } from "@/lib/utils";

const gapMap = {
  none: "",
  sm: "space-y-2",
  md: "space-y-4",
  lg: "space-y-6",
} as const;

export interface PanelBodyProps {
  children: ReactNode;
  className?: string;
}

export const PanelBody = ({ children, className }: PanelBodyProps) => {
  const { gap } = usePanelContext();
  return <div className={cn(gapMap[gap], className)}>{children}</div>;
};
