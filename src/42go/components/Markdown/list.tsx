import React from "react";

export function createUL(params?: { className?: string }) {
  const UL = React.forwardRef<
    HTMLUListElement,
    React.HTMLAttributes<HTMLUListElement>
  >(({ children, ...props }, ref) => (
    <ul
      className={params?.className || "list-disc pl-6 space-y-2 my-4"}
      {...props}
      ref={ref}
    >
      {children}
    </ul>
  ));
  UL.displayName = "MarkdownUnorderedList";
  return UL;
}

export function createOL(params?: { className?: string }) {
  const OL = React.forwardRef<
    HTMLOListElement,
    React.HTMLAttributes<HTMLOListElement>
  >(({ children, ...props }, ref) => (
    <ol
      className={params?.className || "list-decimal pl-6 space-y-2 my-4"}
      {...props}
      ref={ref}
    >
      {children}
    </ol>
  ));
  OL.displayName = "MarkdownOrderedList";
  return OL;
}

export function createLI(params?: { className?: string }) {
  const LI = React.forwardRef<
    HTMLLIElement,
    React.LiHTMLAttributes<HTMLLIElement>
  >(({ children, ...props }, ref) => (
    <li className={params?.className || "ml-2"} {...props} ref={ref}>
      {children}
    </li>
  ));
  LI.displayName = "MarkdownListItem";
  return LI;
}
