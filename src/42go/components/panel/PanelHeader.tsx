"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelHeaderProps {
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const PanelHeader = ({
  children,
  actions,
  className,
}: PanelHeaderProps) => {
  if (!children && !actions) return null;
  return (
    <div
      className={cn("flex items-start justify-between mb-4 gap-4", className)}
    >
      <div className="space-y-1 flex-1 min-w-0">{children}</div>
      {actions ? (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </div>
  );
};
