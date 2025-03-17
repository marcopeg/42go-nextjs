'use client';

import React from 'react';
import appConfig from '@/lib/config';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type AppTitleProps = {
  className?: string;
  showIcon?: boolean;
  showSubtitle?: boolean;
};

export function AppTitle({ className, showIcon = true, showSubtitle = true }: AppTitleProps) {
  const { title, subtitle, icon } = appConfig;

  // Determine if the icon is a component or a string (URL/path)
  const IconComponent = typeof icon !== 'string' ? icon : null;
  const iconIsUrl = typeof icon === 'string';

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
        </>
      )}

      <div className="flex flex-col">
        <span className="font-bold">{title}</span>
        {showSubtitle && subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
