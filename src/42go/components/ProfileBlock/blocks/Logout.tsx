"use client";

import { LogoutAction } from "@/42go/auth/components/LogoutAction";

export const Logout = () => (
  <LogoutAction className="h-11 w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive dark:text-destructive dark:hover:bg-destructive/20" />
);
