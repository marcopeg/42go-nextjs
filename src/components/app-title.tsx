'use client';

import React from 'react';
import appConfig from '@/lib/config';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type AppTitleProps = {
  className?: string;
  showIcon?: boolean;
  showSubtitle?: boolean;
  showTitle?: boolean;
  iconOnly?: boolean;
};

export function AppTitle({
  className,
  showIcon = true,
  showSubtitle = true,
  showTitle = true,
  iconOnly = false,
}: AppTitleProps) {
  const { title, subtitle, icon } = appConfig;

  // Determine if the icon is a component or a string (URL/path)
  const IconComponent = typeof icon !== 'string' ? icon : null;
  const iconIsUrl = typeof icon === 'string';

  // Get first letter of title for fallback
  const firstLetter = title.charAt(0).toUpperCase();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showIcon && (
        <>
          {IconComponent && <IconComponent className="h-6 w-6" />}
          {iconIsUrl && (
            <div className="h-6 w-6 relative">
              <Image src={icon as string} alt={`${title} logo`} fill className="object-contain" />
            </div>
          )}
          {!IconComponent && !iconIsUrl && (
            <div className="h-6 w-6 rounded-md bg-accent text-accent-foreground flex items-center justify-center font-semibold text-sm">
              {firstLetter}
            </div>
          )}
        </>
      )}

      {!iconOnly && (
        <div className="flex flex-col">
          {showTitle && <span className="font-bold">{title}</span>}
          {showSubtitle && subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
