import React from "react";

export function createBlockquote(params?: { className?: string }) {
  const Blockquote = React.forwardRef<
    HTMLQuoteElement,
    React.ComponentPropsWithoutRef<"blockquote">
  >(({ children, ...props }, ref) => (
    <blockquote
      className={
        params?.className || "border-l-4 border-primary pl-4 py-1 bg-primary/5"
      }
      {...props}
      ref={ref}
    >
      {children}
    </blockquote>
  ));
  Blockquote.displayName = "MarkdownBlockquote";
  return Blockquote;
}
