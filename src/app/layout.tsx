import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { ThemeProvider } from '@/components/theme-provider';
import { AccentColorProvider } from '@/components/accent-color-provider';
import { Footer } from '@/components/footer';
import { TransitionProvider } from '@/components/transition-provider';
import { RouteChangeLoader } from '@/components/route-change-loader';
import { AuthProvider } from '@/lib/auth/auth-provider';

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
                <div className="flex min-h-screen flex-col">
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
              </TransitionProvider>
            </AuthProvider>
          </AccentColorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
