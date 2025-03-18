'use client';

import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LucideIcon } from 'lucide-react';

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
  stickyHeader?: boolean;
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
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-[calc(100vh-4rem)] -mx-6">
        {/* Header */}
        <header
          className={cn(
            'border-b border-border overflow-hidden',
            stickyHeader && 'sticky top-0 bg-background z-10'
          )}
          style={{ height: '64px' }}
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
                  'overflow-hidden flex-1 min-w-0',
                  subtitle ? 'flex flex-col justify-center' : 'flex flex-col justify-end pb-2'
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
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

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-16 px-6 pt-6">{children}</main>

        {/* Bottom Bar */}
        {bottomBar && (
          <footer
            className={cn(
              'px-6 py-4 border-t flex items-center justify-between',
              bottomBar.sticky && 'sticky bottom-0 bg-background z-10'
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
