import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/lib/config/ThemeProvider";
import { ThemeToggle } from "@/lib/config/ThemeToggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  return {};
}

// Chuck Norris: get the app name from the server-side header logic
import { getAppName } from "@/lib/config/app-config";
import InjectAppName from "@/lib/config/InjectAppName";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appName = await getAppName();
  if (!appName) {
    return (
      <html suppressHydrationWarning lang="en">
        <head />
        <body className={inter.className}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    );
  }

  console.log("RootLayout: Rendering with app name:", appName);
  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <InjectAppName />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <nav className="w-full flex gap-4 p-4 border-b bg-gray-50 dark:bg-gray-800 dark:text-white mb-6">
            <Link href="/" className="font-semibold hover:underline">
              Home
            </Link>
            <Link href="/todos" className="font-semibold hover:underline">
              Todos
            </Link>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </nav>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
