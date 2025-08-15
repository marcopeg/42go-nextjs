"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/42go/config/use-app-config";

export const LogoutAction = () => {
  const config = useAppConfig();
  const redirectUrl = config?.auth?.logout?.url || "/";
  const onClick = () => {
    // Ensure NextAuth clears session/cookies, then redirect via callbackUrl
    void signOut({ callbackUrl: redirectUrl });
  };

  return (
    <Button variant="outline" onClick={onClick}>
      Logout
    </Button>
  );
};
