"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/42go/config/use-app-config";

export const LogoutAction = () => {
  const config = useAppConfig();
  const redirectUrl = config?.auth?.logout?.url || "/";
  const onClick = () => {
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
    // Prefer NextAuth server-side flow to clear cookies then redirect
    void signOut({ callbackUrl: absUrl, redirect: true });
  };

  return (
    <Button variant="outline" onClick={onClick}>
      Logout
    </Button>
  );
};
