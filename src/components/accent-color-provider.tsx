'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccentColor, accentColors } from '@/lib/theme-config';
import appConfig from '@/lib/app.config';

type AccentColorContextType = {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  availableColors: AccentColor[];
};

const AccentColorContext = createContext<AccentColorContextType>({
  accentColor: appConfig.accentColor,
  setAccentColor: () => {},
  availableColors: accentColors,
});

export const useAccentColor = () => useContext(AccentColorContext);

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColor] = useState<AccentColor>(appConfig.accentColor);

  // Apply the accent color to CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor.value);
    document.documentElement.style.setProperty('--accent-foreground', accentColor.foreground);
    document.documentElement.style.setProperty('--ring', accentColor.value);

    // Save the selected accent color to localStorage
    localStorage.setItem('accent-color', accentColor.name);
  }, [accentColor]);

  // Load the saved accent color from localStorage on initial render
  useEffect(() => {
    const savedColor = localStorage.getItem('accent-color');
    if (savedColor) {
      const color = accentColors.find(c => c.name === savedColor);
      if (color) {
        setAccentColor(color);
      }
    }
  }, []);

  return (
    <AccentColorContext.Provider
      value={{
        accentColor,
        setAccentColor,
        availableColors: accentColors,
      }}
    >
      {children}
    </AccentColorContext.Provider>
  );
}
