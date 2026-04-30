import React from "react";
import Link from "next/link";

export const cleanupHref = (href: string) => {
  // Remove file extension
  let cleaned = href.replace(/\.[^/.]+$/, "");

  // remove initial "./"
  if (cleaned.startsWith("./")) {
    cleaned = cleaned.replace("./", "");
  }

  // Remove "readme" or "index" (case insensitive)
  cleaned = cleaned.replace(/(\/|^)(readme|index)$/i, "");

  return cleaned;
};

const getHref = (originalHref: string | undefined, basePath?: string) => {
  // If no href is provided, return a fallback
  if (!originalHref) return "#";

  // Absolute path:
  if (
    originalHref.startsWith("/") ||
    originalHref.toLowerCase().startsWith("http")
  )
    return cleanupHref(originalHref);

  // Relative path:
  if (originalHref.startsWith("./")) {
    return ["", basePath, cleanupHref(originalHref)]
      .join("/")
      .replaceAll(/\/\//g, "/");
  }

  // Fallback
  return "#";
};

export function createLink(params?: { className?: string; basePath?: string }) {
  const LinkComponent = React.forwardRef<
    HTMLAnchorElement,
    React.AnchorHTMLAttributes<HTMLAnchorElement>
  >(({ href, children, ...props }, ref) => (
    <Link
      href={getHref(href, params?.basePath)}
      className={
        params?.className ||
        "text-neutral-500 font-extralight hover:text-primary transition-colors"
      }
      ref={ref}
      {...props}
    >
      {children}
    </Link>
  ));
  LinkComponent.displayName = "MarkdownLink";
  return LinkComponent;
}
