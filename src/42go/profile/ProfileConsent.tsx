"use client";

import { createElement } from "react";

import type { TConsentConfig, TConsentItem } from "@/42go/profile";

type ProfileConsentProps = {
  items?: TConsentConfig["items"];
  values: Record<string, boolean>;
  onChange: (name: string, value: boolean) => void;
  disabled?: boolean;
  submitted?: boolean;
  showRequiredMarker?: boolean;
  control?: "checkbox" | "switch";
};

const markdownTokenPattern =
  /(\[[^\]\n]+\]\([^) \n]+\)|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\n)/g;

const renderMarkdownText = (value: string) =>
  value.split(markdownTokenPattern).map((part, index) => {
    if (!part) return null;

    if (part === "\n") {
      return <br key={index} />;
    }

    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const match = part.match(/^\[([^\]\n]+)\]\(([^) \n]+)\)$/);

      if (match) {
        return (
          <a
            key={index}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
            onClick={(event) => event.stopPropagation()}
          >
            {renderMarkdownText(match[1])}
          </a>
        );
      }
    }

    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return part;
  });

const renderConsentLabel = (item: TConsentItem) =>
  typeof item.label === "function"
    ? createElement(item.label)
    : typeof item.label === "string"
      ? renderMarkdownText(item.label)
      : item.label;

export const ProfileConsent = ({
  items = [],
  values,
  onChange,
  disabled = false,
  submitted = false,
  showRequiredMarker = true,
  control = "checkbox",
}: ProfileConsentProps) => (
  <div className="space-y-4">
    {items.map((item) => {
      const checked = values[item.name] === true;
      const invalid = submitted && item.required && !checked;
      const label = renderConsentLabel(item);

      if (control === "switch") {
        return (
          <div
            key={item.name}
            onClick={() => {
              if (!disabled) onChange(item.name, !checked);
            }}
            className={
              invalid
                ? "flex cursor-pointer items-start justify-between gap-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
                : "flex cursor-pointer items-start justify-between gap-4 rounded-md border border-transparent p-3 text-sm"
            }
          >
            <span className={invalid ? "text-destructive" : undefined}>
              {label}
              {showRequiredMarker && item.required && (
                <span className="ml-1 text-muted-foreground">(required)</span>
              )}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={checked}
              aria-invalid={invalid}
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                onChange(item.name, !checked);
              }}
              className={
                checked
                  ? "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-emerald-600 transition-colors duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:ring-2 aria-invalid:ring-destructive/40"
                  : "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-muted-foreground/30 transition-colors duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:ring-2 aria-invalid:ring-destructive/40"
              }
            >
              <span
                className={
                  checked
                    ? "translate-x-6 inline-block size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
                    : "translate-x-1 inline-block size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
                }
              />
            </button>
          </div>
        );
      }

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
            {showRequiredMarker && item.required && (
              <span className="ml-1 text-muted-foreground">(required)</span>
            )}
          </span>
        </label>
      );
    })}
  </div>
);
