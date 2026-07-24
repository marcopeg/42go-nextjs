"use client";

import { useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

export type NavigationalTabOption<T extends string> = {
  value: T;
  label: string;
  tabId: string;
  panelId: string;
};

type NavigationalTabsProps<T extends string> = {
  ariaLabel: string;
  value: T;
  options: NavigationalTabOption<T>[];
  onValueChange: (value: T) => void;
  className?: string;
};

export const NavigationalTabs = <T extends string,>({
  ariaLabel,
  value,
  options,
  onValueChange,
  className,
}: NavigationalTabsProps<T>) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectTab = (nextIndex: number, focus = false) => {
    onValueChange(options[nextIndex].value);
    if (focus) {
      tabRefs.current[nextIndex]?.focus();
    }
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectTab(nextIndex, true);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={cn("flex border-b bg-background", className)}
    >
      {options.map((option, index) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={option.tabId}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={option.panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => selectTab(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            style={
              index === 0
                ? undefined
                : { borderLeft: "1px solid var(--border)" }
            }
            className={cn(
              "flex h-12 min-w-0 flex-1 items-center justify-center px-3 text-sm font-medium transition-colors outline-none",
              "focus-visible:z-10 focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              selected
                ? "bg-primary/5 text-foreground shadow-[inset_0_-2px_0_var(--primary)]"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
