import type { TAppConfig } from "@/42go/config/app-config";
import { Toolbar } from "./Toolbar";
import { Footer } from "./Footer";

interface PublicLayoutProps {
  children: React.ReactNode;
  config: TAppConfig;
}

export function PublicLayout({ children, config }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Toolbar config={config} />
      <main className="flex-1 w-full">{children}</main>
      <Footer />
    </div>
  );
}
