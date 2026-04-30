"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelFooterProps {
  children: ReactNode;
  className?: string;
}

export const PanelFooter = ({ children, className }: PanelFooterProps) => (
  <div className={cn("mt-4", className)}>{children}</div>
);
