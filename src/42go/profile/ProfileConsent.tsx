"use client";

import { createElement } from "react";

import type { TConsentConfig } from "@/42go/profile";

type ProfileConsentProps = {
  items?: TConsentConfig["items"];
  values: Record<string, boolean>;
  onChange: (name: string, value: boolean) => void;
  disabled?: boolean;
  submitted?: boolean;
};

export const ProfileConsent = ({
  items = [],
  values,
  onChange,
  disabled = false,
  submitted = false,
}: ProfileConsentProps) => (
  <div className="space-y-4">
    {items.map((item) => {
      const checked = values[item.name] === true;
      const invalid = submitted && item.required && !checked;
      const label =
        typeof item.label === "function"
          ? createElement(item.label)
          : item.label;

      return (
        <label key={item.name} className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(item.name, event.target.checked)}
            disabled={disabled}
            aria-invalid={invalid}
            className="mt-1 size-4 rounded border-input accent-primary aria-invalid:outline aria-invalid:outline-2 aria-invalid:outline-destructive"
          />
          <span className={invalid ? "text-destructive" : undefined}>
            {label}
            {item.required && (
              <span className="ml-1 text-muted-foreground">(required)</span>
            )}
          </span>
        </label>
      );
    })}
  </div>
);
