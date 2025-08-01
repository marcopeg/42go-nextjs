import React from "react";
import { SourceCode } from "../SourceCode";

export function createCode(params?: { className?: string }) {
  const Code = React.forwardRef<
    HTMLElement,
    React.ComponentPropsWithoutRef<"code">
  >(({ children, className, ...props }, ref) => {
    // ReactMarkdown detection: check if code has a language class
    // Inline code typically doesn't have className, block code has language-* className
    const hasLanguageClass = className && /language-\w+/.test(className);
    const isBlockCode =
      hasLanguageClass || (className && className.includes("language-"));
    const isInline = !isBlockCode;

    const baseClass = params?.className || "font-mono text-sm";
    const inlineClass = isInline
      ? "bg-muted-foreground/10 px-1.5 py-0.5 rounded"
      : "block w-full bg-muted-foreground/10 p-4 rounded-md border overflow-x-auto";

    // For block code, we might want syntax highlighting
    if (!isInline) {
      const match = /language-(\w+)/.exec(className || "");
      return (
        <SourceCode language={match ? match[1] : "plaintext"}>
          {String(children).replace(/\n$/, "")}
        </SourceCode>
      );
    }

    return (
      <code
        {...props}
        className={[baseClass, inlineClass, className]
          .filter(Boolean)
          .join(" ")}
        ref={ref}
      >
        {children}
      </code>
    );
  });
  Code.displayName = "MarkdownCode";
  return Code;
}

export function createPre(params?: { className?: string }) {
  const Pre = React.forwardRef<
    HTMLPreElement,
    React.ComponentPropsWithoutRef<"pre">
  >(({ children, className, ...props }, ref) => {
    const baseClass = params?.className || "";

    return (
      <pre
        {...props}
        ref={ref}
        className={[baseClass, className].filter(Boolean).join(" ")}
      >
        {children}
      </pre>
    );
  });
  Pre.displayName = "MarkdownPre";
  return Pre;
}
