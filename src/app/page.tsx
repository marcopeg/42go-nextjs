import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { AccentColorPicker } from '@/components/accent-color-picker';
import { AccentColorDemo } from '@/components/accent-color-demo';
import { PageTransition } from '@/components/page-transition';
import { UIAnimation } from '@/components/ui-animation';

export default function Home() {
  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="absolute top-4 right-4 flex gap-2">
          <UIAnimation type="fade" delay={0.3}>
            <AccentColorPicker />
          </UIAnimation>
          <UIAnimation type="fade" delay={0.4}>
            <ThemeToggle />
          </UIAnimation>
        </div>
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <UIAnimation type="slide" direction="down" delay={0.1}>
              <CardTitle>Welcome to Next.js</CardTitle>
            </UIAnimation>
            <UIAnimation type="slide" direction="down" delay={0.2}>
              <CardDescription>
                A clean setup with Next.js, Tailwind CSS, and shadcn/ui
              </CardDescription>
            </UIAnimation>
          </CardHeader>
          <CardContent>
            <UIAnimation type="fade" delay={0.3}>
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                Get started by editing app/page.tsx
              </p>
            </UIAnimation>
            <UIAnimation type="scale" delay={0.4} whileHover whileTap>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                Get Started
              </Button>
            </UIAnimation>

            <UIAnimation type="fade" delay={0.5}>
              <AccentColorDemo />
            </UIAnimation>
          </CardContent>
        </Card>
      </main>
    </PageTransition>
  );
}
