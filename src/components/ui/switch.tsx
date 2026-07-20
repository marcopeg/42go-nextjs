"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type SwitchProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "onChange"
> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      onCheckedChange,
      onClick,
      className,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      {...props}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      data-slot="switch"
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange?.(!checked);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border outline-none transition-colors duration-200 ease-out",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        checked
          ? "border-primary/60 bg-primary/25"
          : "border-input bg-muted-foreground/30",
        className
      )}
    >
      <span
        aria-hidden="true"
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none absolute left-px top-px block size-5 rounded-full shadow-xs transition-[transform,background-color] duration-200 ease-out",
          checked
            ? "translate-x-5 bg-primary ring-1 ring-primary-foreground/70"
            : "translate-x-0 bg-background ring-1 ring-foreground/10 dark:bg-foreground"
        )}
      />
    </button>
  )
);

Switch.displayName = "Switch";
