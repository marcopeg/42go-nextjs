"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelDescriptionProps {
  children: ReactNode;
  className?: string;
}

export const PanelDescription = ({
  children,
  className,
}: PanelDescriptionProps) => (
  <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
);
