"use client";

import { ToolbarActions } from "./ToolbarActions";
import { type TActionItem, type BackBtnConfig } from "./types";
import { BackBtn as BackButton } from "./BackBtn";

interface ToolbarProps {
  title: React.ReactNode;
  subtitle?: string;
  actions?: TActionItem[];
  className?: string;
  backBtn?: BackBtnConfig;
}

export const Toolbar = ({
  title,
  subtitle,
  actions,
  className,
  backBtn,
}: ToolbarProps) => {
  const hasBack = !!backBtn?.to;

  return (
    <div
      className={`flex items-center justify-between px-6 h-16 py-4 ${
        className || ""
      }`}
    >
      {/* Left: optional mobile back + title */}
      <div className="flex items-center gap-3 min-h-0">
        {hasBack && <BackButton backBtn={backBtn!} />}
        <div className="flex flex-col gap-1 min-h-0">
          <h1 className="text-lg font-semibold leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground leading-tight">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Toolbar Actions on the right */}
      <ToolbarActions actions={actions} />
    </div>
  );
};
