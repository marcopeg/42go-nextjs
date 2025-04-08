'use client';

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CustomCodeBlockProps {
  language: string;
  children: string;
}

export default function CustomCodeBlock({ language, children }: CustomCodeBlockProps) {
  return (
    <SyntaxHighlighter
      language={language}
      style={vscDarkPlus}
      customStyle={{
        borderRadius: '0.375rem',
        margin: '1rem 0',
      }}
    >
      {children.trim()}
    </SyntaxHighlighter>
  );
}
