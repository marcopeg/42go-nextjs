'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Settings,
  Users,
  FileText,
  Bell,
  X,
} from 'lucide-react';
import { AppTitle } from '@/components/app-title';
import { UserAvatar } from '@/components/auth/user-avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAccentColor } from '@/components/accent-color-provider';

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
  {
    title: 'Users',
    href: '/users',
    icon: Users,
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
];

export function SidebarMenu({ isCollapsed, toggleCollapse, closeMobileMenu }: SidebarMenuProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const { accentColor } = useAccentColor();

  return (
    <div className="flex h-full flex-col border-r bg-background relative">
      {/* Mobile Close Button */}
      {closeMobileMenu && (
        <div className="flex justify-end p-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={closeMobileMenu}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Collapse Toggle Button - Positioned absolutely */}
      <div className="absolute -right-3 top-[21px] z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleCollapse}
          className="h-6 w-6 rounded-full p-0 shadow-md border border-border flex items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-200"
          style={{
            backgroundColor: isHovered ? `hsl(${accentColor.value})` : '',
            color: isHovered ? `hsl(${accentColor.foreground})` : '',
            borderColor: isHovered ? `hsl(${accentColor.value})` : '',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </div>

      {/* App Title & Logo - Top Section */}
      <header className="border-b border-border overflow-hidden">
        <div className="flex items-center justify-center h-16 max-h-16 px-6 overflow-hidden">
          <div className="flex items-center overflow-hidden">
            {!isCollapsed ? (
              <div className="overflow-hidden flex-1 min-w-0 flex flex-col justify-end pb-2">
                <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
                  <AppTitle showIcon={true} showSubtitle={false} />
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-center h-16">
                <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
                  <AppTitle
                    showIcon={true}
                    showSubtitle={false}
                    showTitle={false}
                    iconOnly={true}
                  />
                </Link>
              </div>
            )}
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
                  'flex items-center px-3 py-2 text-sm transition-all duration-200 cursor-pointer relative border group',
                  isActive
                    ? 'text-foreground font-bold border-transparent rounded-none' +
                        (!isCollapsed ? ' translate-x-1' : '')
                    : 'text-muted-foreground hover:text-foreground border-transparent rounded-none font-medium',
                  'hover:rounded-md hover:border-accent',
                  isCollapsed && 'justify-center px-0'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-transform duration-200',
                    !isCollapsed && !isActive ? 'group-hover:translate-x-1' : '',
                    isCollapsed ? 'mr-0' : 'mr-2'
                  )}
                />
                {!isCollapsed && (
                  <span
                    className={cn(
                      'transition-transform duration-200',
                      isActive ? '' : 'group-hover:translate-x-1'
                    )}
                  >
                    {item.title}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Section - Bottom */}
      {session?.user && (
        <div className="border-t">
          <Link
            href="/settings"
            className={cn(
              'flex items-center p-4 text-sm font-medium transition-all duration-200 cursor-pointer border border-transparent group',
              'hover:rounded-md hover:border-accent',
              isCollapsed ? 'justify-center' : 'justify-between'
            )}
          >
            <div className="flex items-center">
              <UserAvatar
                className={cn(
                  'h-8 w-8 transition-transform duration-200',
                  !isCollapsed ? 'group-hover:translate-x-1' : '',
                  isCollapsed ? 'mr-0' : 'mr-2'
                )}
              />
              {!isCollapsed && (
                <div className="flex flex-col truncate transition-transform duration-200 group-hover:translate-x-1">
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
