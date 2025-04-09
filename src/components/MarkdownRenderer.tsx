'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CustomCodeBlock from './CustomCodeBlock';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MarkdownRendererProps {
  content: string;
  skipFirstHeading?: boolean;
  title?: string; // Optional title to compare against first heading
  components?: Record<string, React.ComponentType<{ [key: string]: unknown }>>;
}

export default function MarkdownRenderer({
  content,
  skipFirstHeading = false,
  title,
  components: customComponents = {},
}: MarkdownRendererProps) {
  const pathname = usePathname();

  // Process content to handle first h1 if needed
  const processedContent = useMemo(() => {
    if (!skipFirstHeading) return content;

    // Check if the content starts with an h1 and strip it if needed
    const h1Regex = /^#\s+(.+?)(?:\n|$)/;
    const h1Match = content.match(h1Regex);

    if (h1Match) {
      const headingText = h1Match[1];
      // If title is provided, only remove if it matches
      if (!title || title.trim() === headingText.trim()) {
        return content.replace(h1Regex, '');
      }
    }

    // Also check for alternate h1 syntax (underlined with ===)
    const altH1Regex = /^(.+?)\n=+\s*(?:\n|$)/;
    const altH1Match = content.match(altH1Regex);

    if (altH1Match) {
      const headingText = altH1Match[1];
      // If title is provided, only remove if it matches
      if (!title || title.trim() === headingText.trim()) {
        return content.replace(altH1Regex, '');
      }
    }

    return content;
  }, [content, skipFirstHeading, title]);

  // Transform relative links to valid routes
  const transformLink = (href: string): string => {
    if (!href) return '#';

    // Only transform if it's a relative link
    if (href.startsWith('./') || href.startsWith('../')) {
      // Case 1: Handle relative paths with .md or .mdx extension
      if (href.endsWith('.md') || href.endsWith('.mdx')) {
        // Remove the extension
        const withoutExtension = href.replace(/\.(md|mdx)$/, '');

        // Convert to docs path
        if (href.startsWith('./')) {
          return `/docs/${withoutExtension.substring(2).toLowerCase()}`;
        } else if (href.startsWith('../')) {
          // Handle parent directory references
          const segments = pathname.split('/').filter(Boolean);
          segments.pop(); // Remove current file

          // Go up one more level for each ../ pattern
          let parentCount = 0;
          let remainingPath = withoutExtension;

          while (remainingPath.startsWith('../')) {
            parentCount++;
            remainingPath = remainingPath.substring(3);
          }

          // Remove parent directories from segments based on parentCount
          const parentSegments = segments.slice(0, Math.max(1, segments.length - parentCount));

          // Build the new path (lowercase)
          return `/${parentSegments.join('/')}/${remainingPath.toLowerCase()}`;
        }
      }
      // Case 2: Handle relative links without explicit extension
      else {
        // Assume it's a document link without extension
        const docPath = href;

        if (href.startsWith('./')) {
          return `/docs/${docPath.substring(2).toLowerCase()}`;
        } else if (href.startsWith('../')) {
          // Handle parent directory references
          const segments = pathname.split('/').filter(Boolean);
          segments.pop(); // Remove current file

          // Go up one more level for each ../ pattern
          let parentCount = 0;
          let remainingPath = docPath;

          while (remainingPath.startsWith('../')) {
            parentCount++;
            remainingPath = remainingPath.substring(3);
          }

          // Remove parent directories from segments based on parentCount
          const parentSegments = segments.slice(0, Math.max(1, segments.length - parentCount));

          // Build the new path (lowercase)
          return `/${parentSegments.join('/')}/${remainingPath.toLowerCase()}`;
        }
      }
    }

    // Return the original href if no transformation was needed
    return href;
  };

  // Helper function to create anchor IDs from heading text
  const createAnchorId = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-'); // Replace spaces with hyphens
  };

  // Create a heading component with anchor
  const createHeadingWithAnchor = (
    Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
    className: string
  ) => {
    const HeadingComponent = ({ children }: { children: React.ReactNode }) => {
      const childrenAsString = React.Children.toArray(children)
        .map(child => (typeof child === 'string' ? child : ''))
        .join('');

      const id = createAnchorId(childrenAsString);

      return (
        <Tag id={id} className={className}>
          {children}
          <a
            href={`#${id}`}
            className="ml-2 text-muted-foreground opacity-0 hover:opacity-100 text-sm"
            aria-hidden
          >
            #
          </a>
        </Tag>
      );
    };

    // Set display name to fix linter error
    HeadingComponent.displayName = `${Tag}WithAnchor`;

    return HeadingComponent;
  };

  // Default components to use when rendering markdown
  const defaultComponents = {
    code({ inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <CustomCodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CustomCodeBlock>
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
      return <blockquote className="border-l-4 border-primary pl-4 italic">{children}</blockquote>;
    },
    h1: createHeadingWithAnchor('h1', 'text-3xl font-bold mt-8 mb-4 group'),
    h2: createHeadingWithAnchor('h2', 'text-2xl font-bold mt-8 mb-3 group'),
    h3: createHeadingWithAnchor('h3', 'text-xl font-bold mt-6 mb-3 group'),
    h4: createHeadingWithAnchor('h4', 'text-lg font-bold mt-6 mb-3 group'),
    h5: createHeadingWithAnchor('h5', 'text-base font-bold mt-6 mb-3 group'),
    h6: createHeadingWithAnchor('h6', 'text-sm font-bold mt-6 mb-3 group'),
    // Style lists for better readability
    ul({ children }) {
      return <ul className="list-disc pl-6 space-y-2 my-4">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal pl-6 space-y-2 my-4">{children}</ol>;
    },
    li({ children }) {
      return <li className="ml-2">{children}</li>;
    },
    // Transform links and apply styles
    a({ href, children }) {
      const transformedHref = transformLink(href);

      return (
        <Link
          href={transformedHref}
          className="text-primary hover:text-primary/80 underline underline-offset-2"
        >
          {children}
        </Link>
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
  };

  // Merge the default components with any custom components
  const mergedComponents = { ...defaultComponents, ...customComponents };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mergedComponents}>
      {processedContent}
    </ReactMarkdown>
  );
}
