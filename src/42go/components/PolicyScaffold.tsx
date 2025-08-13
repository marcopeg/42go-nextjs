"use client";

import type { ReactNode } from "react";

export interface PolicyScaffoldProps {
  panels?: number; // approximate number of placeholder panels
  className?: string;
  children?: ReactNode; // optional custom extra placeholders
}

// Simple shimmer utility class (tailwind driven)
// Uses animate-pulse plus layered gradient backgrounds for a subtle effect.
const baseBlock =
  "rounded-md bg-muted/40 dark:bg-muted/20 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:dark:via-white/10";

// Tailwind keyframes (fallback: rely on animate-pulse if custom not present)
// If custom keyframes not defined in tailwind config, animate-pulse still gives movement.

export const PolicyScaffold = ({
  panels = 4,
  className = "",
  children,
}: PolicyScaffoldProps) => {
  const rows = Array.from({ length: panels });
  return (
    <div className={`flex flex-col gap-8 py-12 items-stretch ${className}`}>
      {/* Hero / Title Placeholder */}
      <div className="space-y-4 max-w-3xl mx-auto w-full">
        <div className={`${baseBlock} h-8 w-2/3 mx-auto`} />
        <div className={`${baseBlock} h-4 w-1/2 mx-auto`} />
      </div>

      {/* Panel Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((_, i) => (
          <div
            key={i}
            className={`${baseBlock} h-40 p-4 flex flex-col gap-4 animate-pulse`}
          >
            <div className={`${baseBlock} h-5 w-2/3 animate-pulse`} />
            <div className={`${baseBlock} h-3 w-full animate-pulse`} />
            <div className={`${baseBlock} h-3 w-5/6 animate-pulse`} />
            <div className={`${baseBlock} h-3 w-4/6 animate-pulse`} />
            <div className="mt-auto flex gap-2">
              <div className={`${baseBlock} h-8 w-16 animate-pulse`} />
              <div className={`${baseBlock} h-8 w-20 animate-pulse`} />
            </div>
          </div>
        ))}
      </div>

      {/* Optional Custom Placeholders */}
      {children}
    </div>
  );
};

export default PolicyScaffold;
