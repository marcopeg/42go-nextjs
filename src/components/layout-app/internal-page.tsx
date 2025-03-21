'use client';

import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LucideIcon } from 'lucide-react';
import { PageContentTransition } from '@/components/page-content-transition';

interface ActionProps {
  icon?: LucideIcon;
  text?: string;
  tooltip?: string;
  onClick?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

interface InternalPageProps {
  title: string;
  subtitle?: string;
  leftAction?: ActionProps;
  rightActions?: ActionProps[];
  bottomBar?: {
    leftContent?: ReactNode;
    rightActions?: ActionProps[];
    sticky?: boolean;
  };
  children: ReactNode;
  stickyHeader?: boolean | 'always' | 'never';
}

export function InternalPage({
  title,
  subtitle,
  leftAction,
  rightActions,
  bottomBar,
  children,
  stickyHeader = true,
}: InternalPageProps) {
  // Determine header sticky classes based on the value of stickyHeader
  const getHeaderStickyClasses = () => {
    if (stickyHeader === 'always') {
      return 'sticky top-0 bg-background z-20';
    } else if (stickyHeader === 'never') {
      return 'relative !static position-static';
    } else if (stickyHeader === true) {
      return 'md:sticky md:top-0 md:bg-background md:z-20 relative';
    }
    return 'relative !static position-static';
  };

  // Get inline styles for the header
  const getHeaderStyles = () => {
    if (stickyHeader === 'always') {
      return { position: 'sticky' as const, top: 0 };
    } else if (stickyHeader === 'never') {
      return { position: 'static' as const, top: 'auto' };
    } else if (stickyHeader === true) {
      // Use CSS media queries for the default case (handled in className)
      return {};
    }
    return { position: 'static' as const, top: 'auto' };
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full -mx-6 relative">
        {/* Header */}
        <header
          className={cn('border-b border-border overflow-hidden w-full', getHeaderStickyClasses())}
          style={getHeaderStyles()}
        >
          <div className="flex items-center justify-between h-16 max-h-16 px-6 overflow-hidden">
            <div className="flex items-center overflow-hidden">
              {leftAction && (
                <div className="mr-4 flex-shrink-0">
                  <ActionButton {...leftAction} />
                </div>
              )}
              <div
                className={cn(
                  'overflow-hidden flex-1 min-w-0 flex flex-col',
                  subtitle ? 'justify-center' : 'justify-end pb-0'
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h1 className="text-2xl font-bold tracking-tight truncate ">{title}</h1>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="max-w-[300px]">
                    {title}
                  </TooltipContent>
                </Tooltip>

                {subtitle && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-muted-foreground truncate text-sm">{subtitle}</p>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-[300px]">
                      {subtitle}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {rightActions && rightActions.length > 0 && (
              <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                {rightActions.map((action, index) => (
                  <ActionButton key={index} {...action} />
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Main Content with Animation */}
        <main className="flex-1 px-6 pt-6 pb-16 overflow-y-auto overflow-x-auto max-w-full">
          <div className="min-w-full">
            <PageContentTransition>{children}</PageContentTransition>
          </div>
        </main>

        {/* Bottom Bar */}
        {bottomBar && (
          <footer
            className={cn(
              'px-6 py-4 border-t flex items-center justify-between w-full',
              bottomBar.sticky ? 'sticky bottom-0 bg-background z-20' : 'relative'
            )}
          >
            <div>{bottomBar.leftContent}</div>
            {bottomBar.rightActions && bottomBar.rightActions.length > 0 && (
              <div className="flex items-center space-x-2">
                {bottomBar.rightActions.map((action, index) => (
                  <ActionButton key={index} {...action} />
                ))}
              </div>
            )}
          </footer>
        )}
      </div>
    </TooltipProvider>
  );
}

function ActionButton({ icon: Icon, text, tooltip, onClick, variant = 'outline' }: ActionProps) {
  // Ensure at least one of text or icon is provided
  if (!Icon && !text) {
    return null;
  }

  const buttonContent = (
    <Button variant={variant} onClick={onClick} size={!text && Icon ? 'icon' : 'default'}>
      {Icon && <Icon className="h-4 w-4" />}
      {text && <span className="truncate max-w-[120px]">{text}</span>}
    </Button>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}
