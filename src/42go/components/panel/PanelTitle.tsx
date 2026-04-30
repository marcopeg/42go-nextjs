"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelTitleProps {
  children: ReactNode;
  className?: string;
}

export const PanelTitle = ({ children, className }: PanelTitleProps) => (
  <h3 className={cn("text-lg font-semibold", className)}>{children}</h3>
);
