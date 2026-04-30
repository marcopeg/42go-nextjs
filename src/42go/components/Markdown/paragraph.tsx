import React from "react";

export function createP(params?: { className?: string }) {
  const P = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
  >(({ children, ...props }, ref) => (
    <p className={params?.className || "my-4"} {...props} ref={ref}>
      {children}
    </p>
  ));
  P.displayName = "MarkdownParagraph";
  return P;
}
