"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "./format";

export { formatRelativeTime } from "./format";

interface DisplayDateProps {
  date: Date | string | null | undefined;
  className?: string;
  interactive?: boolean;
}

export const DisplayDate = ({
  date,
  className = "",
  interactive = true,
}: DisplayDateProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!showTooltip) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setShowTooltip(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [showTooltip]);

  if (!date) {
    return <span className={className}>—</span>;
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  // Check for invalid date
  if (isNaN(dateObj.getTime())) {
    return <span className={className}>—</span>;
  }

  const relativeTime = formatRelativeTime(dateObj);
  const fullDate = dateObj.toLocaleString();
  const dateTime = dateObj.toISOString();
  const dateClassName = cn(
    "cursor-help rounded-sm underline decoration-dotted underline-offset-2",
    className
  );

  if (!interactive) {
    return (
      <time className={dateClassName} dateTime={dateTime} title={fullDate}>
        {relativeTime}
      </time>
    );
  }

  return (
    <span ref={rootRef} className="relative inline-block">
      <button
        type="button"
        className={cn(
          dateClassName,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        aria-expanded={showTooltip}
        aria-label={`${relativeTime}. ${fullDate}`}
        title={fullDate}
        onClick={() => setShowTooltip((current) => !current)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {relativeTime}
      </button>
      {showTooltip && (
        <span role="tooltip" className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md pointer-events-none">
          {fullDate}
        </span>
      )}
    </span>
  );
};
