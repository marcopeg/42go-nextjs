import type { TAppConfig } from "@/42go/config/app-config";
import { Toolbar } from "./Toolbar";
import { Footer } from "./Footer";

interface PublicLayoutProps {
  children: React.ReactNode;
  config: TAppConfig;
}

export function PublicLayout({ children, config }: PublicLayoutProps) {
  const toolbarDisabled = config?.public?.toolbar?.disabled ?? false;
  const footerDisabled = config?.public?.footer?.disabled ?? false;
  return (
    <div className="flex min-h-screen flex-col">
      {!toolbarDisabled && <Toolbar config={config} />}
      <main className="flex-1 w-full">{children}</main>
      {!footerDisabled && <Footer />}
    </div>
  );
}
