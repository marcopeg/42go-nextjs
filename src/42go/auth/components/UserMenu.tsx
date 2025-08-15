"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useAppConfig } from "@/42go/config/use-app-config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { data: session, status } = useSession();
  const appConfig = useAppConfig();

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" asChild>
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  const handleSignOut = () => {
    const callbackUrl = appConfig?.auth?.logout?.url || "/";
    signOut({ callbackUrl });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-full">
          <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold text-sm">
            {session.user?.name?.charAt(0).toUpperCase() ||
              session.user?.email?.charAt(0).toUpperCase() ||
              "U"}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-sm">
          <div className="font-medium">{session.user?.name || "User"}</div>
          <div className="text-muted-foreground">{session.user?.email}</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">Dashboard</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
