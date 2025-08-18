import Link from "next/link";
import { cn } from "@/42go/utils/utils";
import { ThemeToggle } from "@/42go/config/ThemeToggle";

// Simple placeholder components
function DbTimeDisplay({ className }: { className?: string }) {
  const currentTime = new Date().toLocaleString();
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      Server time: {currentTime}
    </span>
  );
}

function AccentColorPicker() {
  return (
    <div className="text-xs text-muted-foreground">
      Color picker (placeholder)
    </div>
  );
}

export function Footer({ className }: { className?: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("border-t", className)} tabIndex={-1}>
      <div className="w-full flex justify-center">
        <div
          className="w-full flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0 px-4"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center md:items-start">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              &copy; {currentYear} Your Company. All rights reserved.
            </p>
            <DbTimeDisplay className="mt-1" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <nav className="flex gap-4 sm:gap-6">
              <Link
                href="/privacy"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Terms
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <AccentColorPicker />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
