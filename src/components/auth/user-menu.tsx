'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Settings, LogOut, LayoutDashboard } from 'lucide-react';
import { UserAvatar } from './user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Login
          </Button>
        </Link>
        <Link href="/login?mode=register">
          <Button size="sm">Create Account</Button>
        </Link>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <UserAvatar />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {session.user.name && <p className="font-medium">{session.user.name}</p>}
            {session.user.email && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {session.user.email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex w-full cursor-pointer items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex w-full p-2">
          <Link
            href="/settings"
            className="flex w-1/2 cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
          <button
            className="flex w-1/2 cursor-pointer items-center justify-end rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
