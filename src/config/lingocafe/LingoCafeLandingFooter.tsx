"use client";

import Image from 'next/image';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/42go/config/ThemeProvider';
import { Button } from '@/components/ui/button';

export const LingoCafeLandingLogo = () => (
  <section className="mx-auto flex w-full justify-center px-6">
    <div className="w-[180px] rounded-xl p-4 dark:bg-white">
      <Image
        src="/app-icons/lingocafe/ui.png"
        alt="LingoCafe logo"
        width={1024}
        height={1024}
        className="h-auto w-full"
      />
    </div>
  </section>
);

export const LingoCafeLandingThemeSwitch = () => {
  const { mounted, setTheme, theme } = useTheme();

  return (
    <section className="mx-auto flex w-full justify-center px-6">
      <div className="inline-flex items-center gap-1 rounded-md border bg-background/60 p-1">
        <Button
          type="button"
          variant={mounted && theme === 'light' ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          disabled={!mounted}
          aria-pressed={mounted ? theme === 'light' : undefined}
          onClick={() => setTheme('light')}
        >
          <Sun className="h-4 w-4" />
          <span className="sr-only">Light theme</span>
        </Button>
        <Button
          type="button"
          variant={mounted && theme === 'dark' ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          disabled={!mounted}
          aria-pressed={mounted ? theme === 'dark' : undefined}
          onClick={() => setTheme('dark')}
        >
          <Moon className="h-4 w-4" />
          <span className="sr-only">Dark theme</span>
        </Button>
      </div>
    </section>
  );
};
