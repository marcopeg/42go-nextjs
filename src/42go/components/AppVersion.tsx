import { APP_VERSION } from "@/42go/lib/app-version";

export const AppVersion = () => (
  <p className="pt-2 text-center text-[10px] tracking-[0.08em] text-neutral-400 dark:text-neutral-800">
    v{APP_VERSION}
  </p>
);
