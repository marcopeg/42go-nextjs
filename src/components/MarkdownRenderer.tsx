'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CustomCodeBlock from './CustomCodeBlock';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <CustomCodeBlock language={match[1]}>
              {String(children).replace(/\n$/, '')}
            </CustomCodeBlock>
          ) : (
            <code
              className={`${className} bg-muted px-1.5 py-0.5 rounded-sm text-foreground`}
              {...props}
            >
              {children}
            </code>
          );
        },
        // Style block quotes and other elements to match app theme
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-primary pl-4 italic">{children}</blockquote>
          );
        },
        h1({ children }) {
          return <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-2xl font-bold mt-8 mb-3">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-xl font-bold mt-6 mb-3">{children}</h3>;
        },
        // Style links to match primary color
        a({ href, children }) {
          return (
            <a
              href={href}
              className="text-primary hover:text-primary/80 underline underline-offset-2"
            >
              {children}
            </a>
          );
        },
        // Style tables for better readability
        table({ children }) {
          return (
            <div className="my-6 w-full overflow-y-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-muted/50">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody className="divide-y divide-border">{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="m-0 border-t p-0 even:bg-muted/20">{children}</tr>;
        },
        th({ children }) {
          return <th className="border border-border px-4 py-2 text-left font-bold">{children}</th>;
        },
        td({ children }) {
          return <td className="border border-border px-4 py-2 text-left">{children}</td>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
