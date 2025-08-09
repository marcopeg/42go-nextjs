import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getAppInfo } from "@/42go/config/app-config";
import { InjectAppName } from "@/42go/config/InjectAppName";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import "./tokens.css";
import "./tailwind.css";

// Expose Inter via CSS variable to integrate with Tailwind's font-sans token
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const generateMetadata = async (): Promise<Metadata> => {
  const { config } = await getAppInfo();
  return config?.public?.meta || {};
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { name, config } = await getAppInfo();
  const themeDefault = config?.theme?.default;

  // Conditionally render the app's body based on a recognised configuration
  // TODO: redirect to a default app?
  const body = name ? (
    <Providers defaultTheme={themeDefault}>{children}</Providers>
  ) : (
    <Providers defaultTheme={themeDefault}>not found</Providers>
  );

  return (
    <html suppressHydrationWarning lang="en" className={inter.variable}>
      <head>
        <InjectAppName name={name} />
      </head>
      {/* Use Tailwind font token so themes and utilities stay consistent */}
      <body className="font-sans">
        {body}
        <Toaster richColors />
      </body>
    </html>
  );
};

export default RootLayout;
