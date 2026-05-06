"use client";

import { LogoutAction } from "@/42go/auth/components/LogoutAction";

export const Logout = () => (
  <LogoutAction
    variant="link"
    className="h-11 w-full text-destructive hover:text-destructive"
  />
);
