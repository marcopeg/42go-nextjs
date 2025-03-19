'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LayoutDashboard, Settings, X } from 'lucide-react';
import { AppTitle } from '@/components/app-title';
import { UserAvatar } from '@/components/auth/user-avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarMenuProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  closeMobileMenu?: () => void;
}

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function SidebarMenu({ isCollapsed, toggleCollapse, closeMobileMenu }: SidebarMenuProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r bg-background">
      {/* Mobile Close Button */}
      {closeMobileMenu && (
        <div className="flex justify-end p-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={closeMobileMenu}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* App Title & Logo - Top Section */}
      <header className="border-b border-border overflow-hidden">
        <div className="flex items-center justify-between h-16 max-h-16 px-6 overflow-hidden">
          <div className="flex items-center overflow-hidden">
            {!isCollapsed ? (
              <div className="overflow-hidden flex-1 min-w-0 flex flex-col justify-end pb-2">
                <AppTitle showIcon={true} showSubtitle={false} />
              </div>
            ) : (
              <div className="h-16"></div>
            )}
          </div>
          <div className="flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={toggleCollapse}>
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer relative',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  isCollapsed && 'justify-center px-0'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-sm" />
                )}
                <item.icon className={cn('h-5 w-5', isCollapsed ? 'mr-0' : 'mr-2')} />
                {!isCollapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Section - Bottom */}
      {session?.user && (
        <div className="border-t">
          <Link
            href="/settings/profile"
            className={cn(
              'flex items-center p-4 text-sm font-medium transition-colors cursor-pointer hover:underline',
              isCollapsed ? 'justify-center' : 'justify-between'
            )}
          >
            <div className="flex items-center">
              <UserAvatar className={cn('h-8 w-8', isCollapsed ? 'mr-0' : 'mr-2')} />
              {!isCollapsed && (
                <div className="flex flex-col truncate">
                  {session.user.name && (
                    <span className="font-medium truncate">{session.user.name}</span>
                  )}
                  {session.user.email && (
                    <span className="text-xs text-muted-foreground truncate">
                      {session.user.email}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
