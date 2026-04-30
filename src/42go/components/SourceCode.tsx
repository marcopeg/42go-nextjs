"use client";

import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface SourceCodeProps {
  language: string;
  children: string;
}

export function SourceCode({ language, children }: SourceCodeProps) {
  return (
    <div className="my-4 rounded-md overflow-hidden dark:border dark:border-neutral-600">
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: "0",
        }}
      >
        {children.trim()}
      </SyntaxHighlighter>
    </div>
  );
}
