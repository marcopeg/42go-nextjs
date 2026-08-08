"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type PersonaAvatarProps = {
  displayName: string;
  avatarUrl?: string | null;
  avatarFallbackUrl?: string | null;
  className?: string;
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
}: PersonaAvatarProps) => {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const src = [avatarUrl, avatarFallbackUrl].find(
    (candidate): candidate is string =>
      Boolean(candidate && !failedSources.includes(candidate))
  );

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-[10px] font-semibold text-muted-foreground shadow-sm",
        className
      )}
    >
      <span>{initials}</span>
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          sizes="36px"
          className="object-cover"
          onError={() => {
            setFailedSources((current) =>
              current.includes(src) ? current : [...current, src]
            );
          }}
        />
      ) : null}
    </span>
  );
};
