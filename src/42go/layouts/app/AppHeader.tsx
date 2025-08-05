"use client";

import { ReactNode } from "react";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export const AppHeader = ({
  title,
  subtitle,
  actions,
  className,
}: AppHeaderProps) => {
  return (
    <div
      className={`flex items-center justify-between px-6 h-16 py-4 ${
        className || ""
      }`}
    >
      {/* Page Title/Subtitle */}
      <div className="flex flex-col gap-1 min-h-0">
        <h1 className="text-lg font-semibold leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground leading-tight">
            {subtitle}
          </p>
        )}
      </div>

      {/* Header Actions on the right */}
      <div className="flex items-center gap-4">{actions}</div>
    </div>
  );
};
