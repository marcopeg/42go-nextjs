"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type ReaderSettingSegmentedOption<T extends string | number> = {
  value: T;
  label: string;
  Icon?: LucideIcon;
};

export const ReaderSettingSegmentedControl = <
  T extends string | number,
>({
  ariaLabel,
  value,
  options,
  onValueChange,
  className,
}: {
  ariaLabel: string;
  value: T;
  options: ReaderSettingSegmentedOption<T>[];
  onValueChange: (value: T) => void;
  className?: string;
}) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className={cn(
      "flex flex-nowrap items-stretch gap-1 overflow-x-auto rounded-lg border border-border bg-muted/20 p-1",
      className
    )}
  >
    {options.map(({ value: optionValue, label, Icon }) => {
      const selected = value === optionValue;

      return (
        <button
          key={optionValue}
          type="button"
          aria-pressed={selected}
          onClick={() => onValueChange(optionValue)}
          className={cn(
            "flex h-10 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-xs font-medium transition-colors outline-none sm:h-12 sm:gap-2 sm:px-2 sm:text-sm",
            "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            selected
              ? "border-primary bg-primary/5 text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {Icon ? (
            <Icon
              className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate">{label}</span>
        </button>
      );
    })}
  </div>
);
