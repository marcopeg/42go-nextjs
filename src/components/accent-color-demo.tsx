'use client';

import React from 'react';
import { useAccentColor } from './accent-color-provider';

export function AccentColorDemo() {
  const { accentColor } = useAccentColor();

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-medium">
        Accent Color: <span className="capitalize">{accentColor.name}</span>
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-accent p-4 text-accent-foreground">Accent Background</div>
        <div className="rounded-lg border border-accent p-4 text-accent">Accent Text</div>
        <div className="rounded-lg bg-background p-4 ring-2 ring-accent">Accent Ring</div>
        <div className="rounded-lg bg-muted p-4">
          <span className="underline decoration-accent decoration-2">Accent Underline</span>
        </div>
      </div>
    </div>
  );
}
