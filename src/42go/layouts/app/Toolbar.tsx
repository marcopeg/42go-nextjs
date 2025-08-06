"use client";

import { ToolbarActions } from "./ToolbarActions";
import { type TActionItem } from "./types";

interface ToolbarProps {
  title: string;
  subtitle?: string;
  actions?: TActionItem[];
  className?: string;
}

export const Toolbar = ({
  title,
  subtitle,
  actions,
  className,
}: ToolbarProps) => {
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

      {/* Toolbar Actions on the right */}
      <ToolbarActions actions={actions} />
    </div>
  );
};
