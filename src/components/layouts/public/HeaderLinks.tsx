import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ToolbarLinkConfig } from "@/AppConfig";

interface HeaderLinksProps {
  links?: ToolbarLinkConfig[];
}

export function HeaderLinks({ links }: HeaderLinksProps) {
  if (!links || links.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {links.map((link, index) => {
        const linkStyles = cn(
          // Base link styles
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          "px-3 py-1.5", // Size sm equivalent
          // Style variants
          link.style === "primary" &&
            "bg-primary text-primary-foreground shadow hover:bg-primary/90",
          link.style === "secondary" &&
            "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
          (!link.style || link.style === "ghost") &&
            "hover:bg-accent hover:text-accent-foreground",
          // Responsive behavior - hide on small screens unless sticky
          link.sticky ? "block" : "hidden sm:block"
        );

        return (
          <Link
            key={`${link.href}-${index}`}
            href={link.href}
            className={linkStyles}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
