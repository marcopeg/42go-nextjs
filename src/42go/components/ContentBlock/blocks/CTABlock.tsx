import * as React from "react";
import Link from "next/link";
import { cn } from "@/42go/utils/utils";
import { Button } from "@/components/ui/button";

// Icon resolver: direct Lucide import (static mapping for common icons, fallback to null)
import * as LucideIcons from "lucide-react";
const resolveIcon = (iconName?: string) => {
  if (!iconName) return null;
  // PascalCase only, e.g. "Download"
  return (
    (
      LucideIcons as unknown as Record<
        string,
        React.ComponentType<{ className?: string }>
      >
    )[iconName] || null
  );
};

const spacingClasses = {
  none: "",
  sm: "my-4",
  md: "my-8",
  lg: "my-12",
  xl: "my-16",
} as const;

const isExternalUrl = (href: string): boolean => /^https?:\/\//.test(href);

const validateColor = (color: string): boolean =>
  /^(#[0-9a-fA-F]{3,8}|rgb|hsl|var\(--[\w-]+\)|[\w-]+)$/.test(color);

const sanitizeColors = (colors?: {
  background?: string;
  foreground?: string;
}) => {
  if (!colors) return undefined;
  return {
    background:
      colors.background && validateColor(colors.background)
        ? colors.background
        : undefined,
    foreground:
      colors.foreground && validateColor(colors.foreground)
        ? colors.foreground
        : undefined,
  };
};

export interface CTAAction {
  href: string;
  label: string;
  icon?: string;
  target?: "_blank" | "_self";
  rel?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "xl" | "hero";
}

export interface CTAConfig {
  type: "cta";
  action: CTAAction;
  secondary?: CTAAction;
  align?: "center" | "left" | "right";
  direction?: "row" | "column";
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
  colors?: {
    background?: string;
    foreground?: string;
  };
  className?: string;
}

interface ActionButtonProps {
  action: CTAAction;
  customColors?: { background?: string; foreground?: string };
  isSecondary?: boolean;
}

// Map CTAAction size to Button size ("md"/"xl" → "lg")
const mapButtonSize = (
  size?: string
): "default" | "sm" | "lg" | "hero" | "icon" | undefined => {
  if (!size) return "hero";
  if (size === "sm" || size === "hero" || size === "lg" || size === "icon")
    return size;
  // Map "md" and "xl" to "lg"
  if (size === "md" || size === "xl") return "lg";
  if (size === "default") return "default";
  return "hero";
};

const ActionButton = ({
  action,
  customColors,
  isSecondary,
}: ActionButtonProps) => {
  const IconComponent = resolveIcon(action.icon) as React.ComponentType<{
    className?: string;
  }> | null;
  const isExternal = isExternalUrl(action.href);
  const style = customColors
    ? {
        backgroundColor: customColors.background,
        color: customColors.foreground,
      }
    : undefined;
  const variant = action.variant || (isSecondary ? "outline" : "default");
  const size = mapButtonSize(action.size);
  const rel = action.target === "_blank" ? "noopener noreferrer" : action.rel;

  if (isExternal) {
    return (
      <a href={action.href} target="_blank" rel={rel}>
        <Button variant={variant} size={size} style={style}>
          <span className="flex items-center gap-2">
            {IconComponent && <IconComponent />}
            {action.label}
          </span>
        </Button>
      </a>
    );
  }
  // Use asChild to render Button as anchor for Next.js Link
  return (
    <Link href={action.href} passHref>
      <Button asChild variant={variant} size={size} style={style}>
        <span className="flex items-center gap-2">
          {IconComponent && <IconComponent />}
          {action.label}
        </span>
      </Button>
    </Link>
  );
};

export const CTABlock = ({
  action,
  secondary,
  align = "center",
  direction = "row",
  spacing = "md",
  colors,
  className,
}: CTAConfig) => {
  const sanitizedColors = sanitizeColors(colors);
  const flexDirection =
    direction === "column" ? "flex-col" : "flex-col sm:flex-row";

  // Determine alignment classes based on direction and align setting
  const alignClasses = (() => {
    if (direction === "row") {
      if (align === "center") return "items-center justify-center";
      if (align === "right") return "items-center justify-end";
      return "items-center justify-start"; // left
    }
    // column direction: main axis vertical, align horizontal via items-*
    if (align === "center") return "items-center justify-start";
    if (align === "right") return "items-end justify-start";
    return "items-start justify-start"; // left
  })();
  return (
    <div
      className={cn(
        `flex ${flexDirection} gap-4 sm:gap-6`,
        alignClasses,
        spacingClasses[spacing],
        className
      )}
      data-block="cta"
    >
      <ActionButton action={action} customColors={sanitizedColors} />
      {secondary && (
        <ActionButton
          action={secondary}
          customColors={sanitizedColors}
          isSecondary
        />
      )}
    </div>
  );
};
