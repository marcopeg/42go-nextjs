import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { ThemeProvider } from '@/components/theme-provider';
import { AccentColorProvider } from '@/components/accent-color-provider';
import { TransitionProvider } from '@/components/transition-provider';
import { RouteChangeProvider } from '@/components/route-change-provider';
import { RouteChangeLoader } from '@/components/route-change-loader';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { LayoutProvider } from '@/components/layout-provider';
import { Toaster } from '@/components/ui/toaster';
import appConfig from '@/lib/config';
import { auth } from '@/lib/auth/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: appConfig.title,
  description: appConfig.subtitle || 'Create Apps with Cursor and Next.js',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AccentColorProvider>
            <TransitionProvider>
              <RouteChangeProvider>
                <RouteChangeLoader />
                <AuthProvider session={session}>
                  <LayoutProvider>{children}</LayoutProvider>
                </AuthProvider>
              </RouteChangeProvider>
              <Toaster />
            </TransitionProvider>
          </AccentColorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
