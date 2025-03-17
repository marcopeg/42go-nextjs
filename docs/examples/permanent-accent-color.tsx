'use client';

import React, { createContext, useContext, useEffect } from 'react';

// Define the permanent accent color
const PERMANENT_ACCENT_COLOR = {
  name: 'blue',
  value: '221 83% 53%',
  foreground: '0 0% 100%',
};

// Create a simplified context
type AccentColorContextType = {
  accentColor: typeof PERMANENT_ACCENT_COLOR;
};

const AccentColorContext = createContext<AccentColorContextType>({
  accentColor: PERMANENT_ACCENT_COLOR,
});

export const useAccentColor = () => useContext(AccentColorContext);

/**
 * A simplified AccentColorProvider that uses a permanent accent color
 * This replaces the dynamic version in src/components/accent-color-provider.tsx
 */
export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  // Apply the accent color to CSS variables on mount
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', PERMANENT_ACCENT_COLOR.value);
    document.documentElement.style.setProperty(
      '--accent-foreground',
      PERMANENT_ACCENT_COLOR.foreground
    );
    document.documentElement.style.setProperty('--ring', PERMANENT_ACCENT_COLOR.value);
  }, []);

  return (
    <AccentColorContext.Provider
      value={{
        accentColor: PERMANENT_ACCENT_COLOR,
      }}
    >
      {children}
    </AccentColorContext.Provider>
  );
}
