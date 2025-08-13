"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelActionsProps {
  children: ReactNode;
  className?: string;
}

export const PanelActions = ({ children, className }: PanelActionsProps) => (
  <div
    className={cn("flex items-center gap-2", className)}
    aria-label="panel actions"
  >
    {children}
  </div>
);
