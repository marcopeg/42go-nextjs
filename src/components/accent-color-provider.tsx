'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import appConfig, { AccentColor } from '@/lib/config';

type AccentColorContextType = {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  availableColors: AccentColor[];
};

const AccentColorContext = createContext<AccentColorContextType>({
  accentColor: appConfig.theme.resolvedAccentColor,
  setAccentColor: () => {},
  availableColors: appConfig.theme.accentColors,
});

export const useAccentColor = () => useContext(AccentColorContext);

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColor] = useState<AccentColor>(appConfig.theme.resolvedAccentColor);

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
      const color = appConfig.theme.accentColors.find((c: AccentColor) => c.name === savedColor);
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
        availableColors: appConfig.theme.accentColors,
      }}
    >
      {children}
    </AccentColorContext.Provider>
  );
}
