'use client';

import { signOut } from 'next-auth/react';
import { useCachedSession } from '@/lib/auth/use-cached-session';
import Link from 'next/link';
import { UserAvatar } from './user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import appConfig from '@/lib/config';
import { MenuItem } from '@/types/menu';

export function UserMenu() {
  const { data: session } = useCachedSession();
  const publicMenuItems = appConfig.landing?.user?.menu || [];

  if (!session?.user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/login">
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            Login
          </Button>
        </Link>
      </div>
    );
  }

  // Filter menu items based on authentication status
  const menuItems = publicMenuItems.filter((item: MenuItem) => {
    // Show all items for authenticated users
    if (session?.user) return true;
    // For non-authenticated users, only show items that don't require auth
    return !item.requiresAuth;
  });

  // Handle menu item actions
  const handleMenuItemClick = (item: MenuItem) => {
    if (item.action === 'logout') {
      signOut({ callbackUrl: '/' });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <UserAvatar />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-3 px-4 py-3">
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

        {menuItems.map((item: MenuItem, index: number) => (
          <DropdownMenuItem
            key={index}
            asChild={item.action !== 'logout'}
            onClick={() => item.action === 'logout' && handleMenuItemClick(item)}
          >
            {item.action === 'logout' ? (
              <div className="flex w-full cursor-pointer items-center border border-transparent hover:border-accent">
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </div>
            ) : (
              <Link
                href={item.href}
                className="flex w-full cursor-pointer items-center border border-transparent hover:border-accent"
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
