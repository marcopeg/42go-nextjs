"use client";

import type { ConversationBand } from "@/app/(app)/(lingocafe)/conversations/_components/types";
import { cn } from "@/lib/utils";

const options: Array<{
  id: ConversationBand;
  label: string;
  levels: string;
}> = [
  { id: "beginner", label: "Beginner", levels: "A1" },
  { id: "intermediate", label: "Intermediate", levels: "A2 + B1" },
  { id: "advanced", label: "Advanced", levels: "B2" },
];

export const ConversationBandFilter = ({
  value,
  onChange,
}: {
  value: ConversationBand;
  onChange: (value: ConversationBand) => void;
}) => (
  <section aria-labelledby="conversation-level-heading" className="space-y-2">
    <div>
      <h2 id="conversation-level-heading" className="text-base font-semibold">
        Practice level
      </h2>
      <p className="text-sm text-muted-foreground">
        Choose the dialogue difficulty for this view.
      </p>
    </div>
    <div
      role="group"
      aria-label="Conversation practice level"
      className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/20 p-1"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "min-h-11 rounded-md border px-2 py-1.5 text-center outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
            value === option.id
              ? "border-primary bg-primary/10 text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <span className="block truncate text-sm font-medium">
            {option.label}
          </span>
          <span className="block text-[11px] font-semibold uppercase tracking-wide">
            {option.levels}
          </span>
        </button>
      ))}
    </div>
  </section>
);
