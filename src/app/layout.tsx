import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { ThemeProvider } from '@/components/theme-provider';
import { AccentColorProvider } from '@/components/accent-color-provider';
import { TransitionProvider } from '@/components/transition-provider';
import { RouteChangeLoader } from '@/components/route-change-loader';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { LayoutProvider } from '@/components/layout/layout-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cursor Next Boilerplate',
  description: 'Create Apps with Cursor and Next.js',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AccentColorProvider>
            <AuthProvider>
              <RouteChangeLoader />
              <TransitionProvider>
                <LayoutProvider>{children}</LayoutProvider>
              </TransitionProvider>
            </AuthProvider>
          </AccentColorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
