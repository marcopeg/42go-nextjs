'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Example of a page without the accent color picker
 * This is a simplified version of src/app/page.tsx
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {/* Only the theme toggle is included, no accent color picker */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Welcome to Next.js</CardTitle>
          <CardDescription>A clean setup with Next.js, Tailwind CSS, and shadcn/ui</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Get started by editing app/page.tsx
          </p>
          {/* The button still uses the accent color, which is now permanent */}
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            Get Started
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
