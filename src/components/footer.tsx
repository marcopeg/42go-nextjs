import Link from 'next/link';

import { cn } from '@/lib/utils';
import { DbTimeDisplay } from './db-time-display';

export function Footer({ className }: { className?: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn('border-t', className)}>
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center px-8 md:flex-col md:items-start md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {currentYear} Your Company. All rights reserved.
          </p>
          <DbTimeDisplay className="mt-1" />
        </div>
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
      </div>
    </footer>
  );
}
