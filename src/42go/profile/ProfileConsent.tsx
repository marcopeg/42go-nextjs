"use client";

import { createElement } from "react";

import type { TConsentConfig, TConsentItem } from "@/42go/profile";

type ProfileConsentProps = {
  items?: TConsentConfig["items"];
  values: Record<string, boolean>;
  onChange: (name: string, value: boolean) => void;
  disabled?: boolean;
  submitted?: boolean;
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
}: ProfileConsentProps) => (
  <div className="space-y-4">
    {items.map((item) => {
      const checked = values[item.name] === true;
      const invalid = submitted && item.required && !checked;
      const label = renderConsentLabel(item);

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
