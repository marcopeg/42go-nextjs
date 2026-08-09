"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type PersonaAvatarProps = {
  displayName: string;
  avatarUrl?: string | null;
  avatarFallbackUrl?: string | null;
  className?: string;
  nameAlign?: "left" | "right";
  size?: "sm" | "default";
};

const getInitials = (displayName: string) => {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  return `${words[0]?.[0] || "?"}${words.length > 1 ? words.at(-1)?.[0] || "" : ""}`.toUpperCase();
};

export const PersonaAvatar = ({
  displayName,
  avatarUrl,
  avatarFallbackUrl,
  className,
  nameAlign = "left",
  size = "default",
}: PersonaAvatarProps) => {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [showName, setShowName] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const src = [avatarUrl, avatarFallbackUrl].find(
    (candidate): candidate is string =>
      Boolean(candidate && !failedSources.includes(candidate))
  );

  useEffect(() => {
    if (!showName) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setShowName(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowName(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showName]);

  const usesTap = () =>
    window.matchMedia("(max-width: 767px)").matches ||
    !window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  return (
    <span
      ref={rootRef}
      className={cn(
        "relative inline-flex shrink-0",
        size === "sm" ? "size-7" : "size-9",
        className
      )}
    >
      <button
        type="button"
        aria-label={`Speaker: ${displayName}`}
        aria-describedby={showName ? tooltipId : undefined}
        aria-expanded={showName}
        className={cn(
          "relative inline-flex touch-manipulation items-center justify-center overflow-hidden rounded-full border bg-muted font-semibold text-muted-foreground shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          size === "sm" ? "size-7 text-[9px]" : "size-9 text-[10px]"
        )}
        onClick={() => {
          if (usesTap()) setShowName((current) => !current);
        }}
        onFocus={(event) => {
          if (
            !usesTap() &&
            event.currentTarget.matches(":focus-visible")
          ) {
            setShowName(true);
          }
        }}
        onBlur={() => setShowName(false)}
        onMouseEnter={() => {
          if (!usesTap()) setShowName(true);
        }}
        onMouseLeave={() => {
          if (!usesTap()) setShowName(false);
        }}
      >
        <span>{initials}</span>
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            unoptimized
            sizes={size === "sm" ? "28px" : "36px"}
            className="object-cover"
            onError={() => {
              setFailedSources((current) =>
                current.includes(src) ? current : [...current, src]
              );
            }}
          />
        ) : null}
      </button>
      {showName ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute bottom-full z-50 mb-2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md",
            nameAlign === "right" ? "right-0" : "left-0"
          )}
        >
          {displayName}
        </span>
      ) : null}
    </span>
  );
};
