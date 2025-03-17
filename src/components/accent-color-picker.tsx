'use client';

import React from 'react';
import { Check, Palette } from 'lucide-react';
import { useAccentColor } from './accent-color-provider';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function AccentColorPicker() {
  const { accentColor, setAccentColor, availableColors } = useAccentColor();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span
            className="absolute bottom-1 right-1 h-2 w-2 rounded-full"
            style={{ backgroundColor: `hsl(${accentColor.value})` }}
          />
          <span className="sr-only">Choose accent color</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableColors.map(color => (
          <DropdownMenuItem
            key={color.name}
            onClick={() => setAccentColor(color)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: `hsl(${color.value})` }}
              />
              <span className="capitalize">{color.name}</span>
            </div>
            {accentColor.name === color.name && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
