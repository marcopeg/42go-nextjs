'use client';

import { useCachedSession } from '@/lib/auth/use-cached-session';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AppTitle } from '@/components/app-title';
import { UserAvatar } from '@/components/auth/user-avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAccentColor } from '@/components/accent-color-provider';
import appConfig from '@/lib/config';
import { MenuItem } from '@/types/menu';
import { useUserGrants } from '@/lib/auth/use-user-grants';

interface SidebarMenuProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  closeMobileMenu?: () => void;
}

// Get sidebar menu items from config
const topMenuItems: MenuItem[] = appConfig.app?.menu?.top || [];
const bottomMenuItems: MenuItem[] = appConfig.app?.menu?.bottom || [];

// Separate component for menu items to use hooks properly
function MenuItemComponent({
  item,
  isCollapsed,
  closeMobileMenu,
}: {
  item: MenuItem;
  isCollapsed: boolean;
  closeMobileMenu?: () => void;
}) {
  const pathname = usePathname();
  const hasRequiredGrants = useUserGrants(item.grants);

  // Skip rendering if user doesn't have required grants
  if (!hasRequiredGrants) {
    return null;
  }

  const isActive = pathname === item.href;

  return (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        'flex items-center px-3 py-2 text-sm transition-all duration-200 cursor-pointer relative border group',
        isActive
          ? 'text-foreground font-bold border-transparent rounded-none' +
              (!isCollapsed && !closeMobileMenu ? ' translate-x-1' : '') +
              (closeMobileMenu ? ' border-accent rounded-md' : '')
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
}

export function SidebarMenu({ isCollapsed, toggleCollapse, closeMobileMenu }: SidebarMenuProps) {
  const { data: session } = useCachedSession();
  const { accentColor } = useAccentColor();
  const [isHovered, setIsHovered] = useState(false);

  // Get mobile menu width from config or default to 80%
  const mobileMenuWidth = appConfig.app?.mobile?.menu?.width || '80%';

  // Function to render menu items
  const renderMenuItems = (items: MenuItem[]) => {
    return items.map((item: MenuItem) => (
      <MenuItemComponent
        key={item.href}
        item={item}
        isCollapsed={isCollapsed}
        closeMobileMenu={closeMobileMenu}
      />
    ));
  };

  return (
    <div
      className="flex h-full flex-col border-r bg-background/70 backdrop-blur-sm relative"
      style={{ width: closeMobileMenu ? mobileMenuWidth : 'auto' }}
    >
      {/* Collapse Toggle Button - Positioned absolutely */}
      <div className="absolute -right-3 top-[21px] z-10 hidden md:block">
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
        {closeMobileMenu ? (
          // Mobile header with app title and close button on same line
          <div className="flex items-center h-16 px-4 w-full">
            <div className="flex-grow overflow-hidden mr-2">
              <Link href="/app/dashboard" className="hover:opacity-80 transition-opacity">
                <AppTitle showIcon={true} showSubtitle={false} className="truncate" />
              </Link>
            </div>
            <div className="flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMobileMenu}
                className="flex items-center justify-center"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close menu</span>
              </Button>
            </div>
          </div>
        ) : (
          // Desktop header
          <div
            className={cn(
              'flex items-center h-16 max-h-16 overflow-hidden',
              isCollapsed ? 'justify-center px-0' : 'px-6'
            )}
          >
            {!isCollapsed ? (
              <div className="overflow-hidden flex-1 min-w-0 flex flex-col justify-end pb-2">
                <Link href="/app/dashboard" className="hover:opacity-80 transition-opacity">
                  <AppTitle showIcon={true} showSubtitle={false} />
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-center h-16">
                <Link href="/app/dashboard" className="hover:opacity-80 transition-opacity">
                  <AppTitle
                    className="mx-auto"
                    showIcon={true}
                    showSubtitle={false}
                    showTitle={false}
                    iconOnly={true}
                  />
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Top Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">{renderMenuItems(topMenuItems)}</nav>
      </div>

      {/* Bottom Navigation Items & User Section */}
      <div className="border-t">
        <nav className="space-y-1 p-3">{renderMenuItems(bottomMenuItems)}</nav>

        {session?.user && (
          <div className="border-t">
            <Link
              href="/app/settings"
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
    </div>
  );
}
