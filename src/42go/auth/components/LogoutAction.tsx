"use client";

import type { ComponentProps } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/42go/config/use-app-config";
import { configureEventTracker, flushEvents, trackEvent } from "@/42go/events/client";

type LogoutActionProps = {
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
};

export const LogoutAction = ({
  className,
  variant = "outline",
}: LogoutActionProps) => {
  const config = useAppConfig();
  const redirectUrl = config?.auth?.logout?.url || "/";
  const onClick = async () => {
    // Ensure NextAuth clears session/cookies first, then redirect via configured URL
    const absUrl = (() => {
      if (typeof window === "undefined") return redirectUrl;
      try {
        const isAbs = /^(https?:)?\/\//i.test(redirectUrl);
        if (isAbs) return redirectUrl;
        const base = window.location.origin;
        return redirectUrl.startsWith("/")
          ? `${base}${redirectUrl}`
          : `${base}/${redirectUrl}`;
      } catch {
        return redirectUrl;
      }
    })();
    configureEventTracker(config?.app?.events);
    trackEvent("user.logout");
    await flushEvents({ keepalive: true });
    // Prefer NextAuth server-side flow to clear cookies then redirect
    void signOut({ callbackUrl: absUrl, redirect: true });
  };

  return (
    <Button variant={variant} onClick={onClick} className={className}>
      Logout
    </Button>
  );
};
