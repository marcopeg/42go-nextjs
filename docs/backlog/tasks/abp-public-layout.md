# Public Layout [abp]

Add a self contained component that implements a basic public layout that should be optimistically used in landing pages and public areas of a website.

This layout must be responsive and tested for SSR.

# Desired file structure

- src
  - components
    - layouts
      - public
        - index.ts
        - PublicLayout.tsx
        - ...other support interal components
      - other layouts...

# Where To Use It

In this first task, I'd like to apply this layout to the home page and login page.

Ideally stuff like the app's name, icon, subtitle and menu comes from the dynamic configuration using `@/lib/config/app-config.ts` so to be able to render those informations statically at server side time.

Instead the part with the user menu should be sensible to the logged-in status and should NOT be rendered on the server, but just on the frontend.

# Import Files

The following files come from the previous project where we already reached a decent level of layout functionalities.

**public-layout.tsx**

```tsx
"use client";

import { PublicHeader } from "./public-header";
import { Footer } from "@/components/footer";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

**public-header.tsx**

```tsx
"use client";

import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { AppTitle } from "@/components/app-title";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <AppTitle />
          </Link>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
```

**footer.tsx**

```tsx
import Link from "next/link";

import { cn } from "@/lib/utils";
import { DbTimeDisplay } from "./db-time-display";
import { ThemeToggle } from "./theme-toggle";
import { AccentColorPicker } from "./accent-color-picker";

export function Footer({ className }: { className?: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("border-t", className)}>
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center px-8 md:flex-col md:items-start md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {currentYear} Your Company. All rights reserved.
          </p>
          <DbTimeDisplay className="mt-1" />
        </div>
        <div className="flex flex-col items-center gap-4">
          <nav className="flex gap-4 sm:gap-6">
            <Link
              href="/privacy"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Terms
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <AccentColorPicker />
          </div>
        </div>
      </div>
    </footer>
  );
}
```

**app-title.tsx**

```tsx
"use client";

import React from "react";
import appConfig from "@/lib/config";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
  const IconComponent = typeof icon !== "string" ? icon : null;
  const iconIsUrl = typeof icon === "string";

  // Get first letter of title for fallback
  const firstLetter = title.charAt(0).toUpperCase();

  // For icon-only display, we need a simpler layout
  if (iconOnly) {
    return (
      <div className={cn("flex justify-center items-center", className)}>
        {IconComponent && <IconComponent className="h-6 w-6" />}
        {iconIsUrl && (
          <div className="h-6 w-6 relative">
            <Image
              src={icon as string}
              alt={`${title} logo`}
              fill
              className="object-contain"
            />
          </div>
        )}
        {!IconComponent && !iconIsUrl && (
          <div className="h-6 w-6 rounded-md bg-accent text-accent-foreground flex items-center justify-center font-semibold text-sm">
            {firstLetter}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && (
        <>
          {IconComponent && <IconComponent className="h-6 w-6" />}
          {iconIsUrl && (
            <div className="h-6 w-6 relative">
              <Image
                src={icon as string}
                alt={`${title} logo`}
                fill
                className="object-contain"
              />
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
```
