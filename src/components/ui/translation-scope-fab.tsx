"use client";

import { Languages } from "lucide-react";
import { useId, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/42go/utils/utils";

export type TranslationScopeFabScope = "sentence" | "word";

type TranslationScopeFabProps = {
  scope: TranslationScopeFabScope;
  onScopeChange: (scope: TranslationScopeFabScope) => void;
  className?: string;
  style?: CSSProperties;
  tooltipClassName?: string;
};

const getNextScope = (scope: TranslationScopeFabScope): TranslationScopeFabScope =>
  scope === "sentence" ? "word" : "sentence";

export const TranslationScopeFab = ({
  scope,
  onScopeChange,
  className,
  style,
  tooltipClassName,
}: TranslationScopeFabProps) => {
  const tooltipId = useId();
  const nextScope = getNextScope(scope);
  const scopeBadge = scope === "word" ? "W" : "S";
  const accessibleLabel = `Translation mode: ${scope}. Activate to switch translation mode to ${nextScope}.`;
  const tooltipLabel = `Click here to switch translation mode to ${nextScope}.`;

  return (
    <div className="group relative inline-flex" style={style}>
      <Button
        type="button"
        size="fab"
        aria-pressed={scope === "word"}
        aria-label={accessibleLabel}
        aria-describedby={tooltipId}
        onClick={() => onScopeChange(nextScope)}
        className={cn(
          "relative size-14 touch-manipulation rounded-full p-0 shadow-xl transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.98]",
          className
        )}
      >
        <Languages aria-hidden="true" className="size-6" />
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center overflow-hidden rounded-full bg-primary-foreground text-[11px] font-bold leading-none text-primary ring-2 ring-primary"
        >
          <span
            key={scope}
            className="absolute inset-0 flex items-center justify-center animate-[translation-scope-label-roll-up_180ms_ease-out] motion-reduce:animate-none"
          >
            {scopeBadge}
          </span>
        </span>
      </Button>
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-[calc(100%+0.75rem)] left-0 z-[1100] hidden w-max max-w-64 rounded-lg border border-border bg-popover px-3 py-2 text-xs font-medium normal-case text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 md:block",
          tooltipClassName
        )}
      >
        {tooltipLabel}
      </span>
    </div>
  );
};
