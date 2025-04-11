'use client';

import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import MarkdownRenderer from './MarkdownRenderer';

interface DocSidebarProps {
  content: string;
  mobileView?: boolean;
}

export default function DocSidebar({ content, mobileView = false }: DocSidebarProps) {
  const pathname = usePathname();

  // Process the content to customize it for sidebar display
  const processedContent = useMemo(() => {
    return content;
  }, [content]);

  // Create custom components for the sidebar navigation
  const customComponents = {
    // Create custom components that will override the defaults in MarkdownRenderer
    // for the sidebar-specific styling
    a(props: { href?: string; children?: React.ReactNode; [key: string]: unknown }) {
      let transformedHref = props.href || '#';

      // Only transform if it's a string
      if (typeof props.href === 'string') {
        // Case 1: Handle relative paths with .md or .mdx extension
        if (
          (props.href.startsWith('./') || props.href.startsWith('../')) &&
          (props.href.endsWith('.md') || props.href.endsWith('.mdx'))
        ) {
          // Remove the extension
          const withoutExtension = props.href.replace(/\.(md|mdx)$/, '');

          // Convert to docs path
          if (props.href.startsWith('./')) {
            transformedHref = `/docs/${withoutExtension.substring(2)}`;
          } else if (props.href.startsWith('../')) {
            // Handle parent directory references if needed
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
            transformedHref = `/${parentSegments.join('/')}/${remainingPath.toLowerCase()}`;
          }
        }
        // Case 2: Handle relative links without explicit extension
        else if (props.href.startsWith('./') || props.href.startsWith('../')) {
          // Assume it's a document link without extension
          const docPath = props.href;

          if (props.href.startsWith('./')) {
            transformedHref = `/docs/${docPath.substring(2).toLowerCase()}`;
          } else if (props.href.startsWith('../')) {
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
            transformedHref = `/${parentSegments.join('/')}/${remainingPath}`;
          }
        }
      }

      const isActive = pathname === transformedHref;

      return (
        <Link
          href={transformedHref}
          className={`block py-1.5 ${
            isActive
              ? 'text-primary font-medium'
              : 'text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary'
          }`}
        >
          {props.children}
        </Link>
      );
    },
    // Style headings for the sidebar
    h1(props: { children?: React.ReactNode; [key: string]: unknown }) {
      return <h3 className="text-lg font-bold mb-2 mt-4">{props.children}</h3>;
    },
    h2(props: { children?: React.ReactNode; [key: string]: unknown }) {
      return <h4 className="text-md font-semibold mb-1 mt-3">{props.children}</h4>;
    },
    // Style lists for navigation
    ul(props: { children?: React.ReactNode; [key: string]: unknown }) {
      return <ul className="pl-4 space-y-1 mb-2">{props.children}</ul>;
    },
    li(props: { children?: React.ReactNode; [key: string]: unknown }) {
      return <li className="text-sm">{props.children}</li>;
    },
  };

  // For mobile view, we use a different container without borders
  if (mobileView) {
    return (
      <div className="w-full">
        <div className="sidebar-markdown">
          <MarkdownRenderer content={processedContent} components={customComponents} />
        </div>
      </div>
    );
  }

  // Desktop view with right border
  return (
    <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 pr-4 h-full">
      <div className="sticky top-16 max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden pr-2 -mr-2 py-4">
        <div className="sidebar-markdown">
          <MarkdownRenderer content={processedContent} components={customComponents} />
        </div>
      </div>
    </div>
  );
}
