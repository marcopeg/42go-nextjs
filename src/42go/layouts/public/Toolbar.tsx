import Link from "next/link";
import type { AppConfig } from "@/42go/config/app-config";
import { AppTitle } from "./AppTitle";
import { ToolbarActions } from "./ToolbarActions";

export async function Toolbar({ config }: { config: AppConfig }) {
  const toolbarHref = config?.public?.toolbar?.href || "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full flex justify-center">
        <div className="w-full flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href={toolbarHref} className="flex items-center space-x-2">
              <AppTitle config={config} />
            </Link>
          </div>
          <ToolbarActions actions={config?.public?.toolbar?.actions} />
        </div>
      </div>
    </header>
  );
}
