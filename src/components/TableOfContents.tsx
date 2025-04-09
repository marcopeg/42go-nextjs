'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface TOCItem {
  id: string;
  text: string;
  level: number;
  isActive?: boolean;
}

interface TableOfContentsProps {
  markdown: string;
}

export default function TableOfContents({ markdown }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const pathname = usePathname();

  // Extract headings from markdown content
  useEffect(() => {
    const extractHeadings = () => {
      // First, preprocess the markdown to remove code blocks and other complex content
      let processedMarkdown = markdown;

      // Remove fenced code blocks (```code```)
      processedMarkdown = processedMarkdown.replace(/```[\s\S]*?```/g, '');

      // Remove indented code blocks (4 spaces or tab at beginning of line)
      processedMarkdown = processedMarkdown.replace(/^( {4}|\t).*$/gm, '');

      // Remove inline code (backticks)
      processedMarkdown = processedMarkdown.replace(/`[^`]*`/g, '');

      // Remove HTML tags to avoid parsing headers in HTML
      processedMarkdown = processedMarkdown.replace(/<[^>]*>/g, '');

      // Remove tables
      processedMarkdown = processedMarkdown.replace(/^\|.*\|$/gm, '');
      processedMarkdown = processedMarkdown.replace(/^[- |:]+$/gm, '');

      // Extract only the valid headings - make sure they're at the start of a line
      // and not part of something else
      const headingRegex = /^(#{1,3})\s+(.+?)(?:\n|$)/gm;
      const matches = Array.from(processedMarkdown.matchAll(headingRegex));

      const items: TOCItem[] = matches.map(match => {
        const level = match[1].length; // Number of # symbols
        const text = match[2].trim();
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-'); // Replace spaces with hyphens

        return {
          id,
          text,
          level,
          isActive: false,
        };
      });

      setHeadings(items);
    };

    extractHeadings();
  }, [markdown]);

  // Set up intersection observer to track which heading is in view
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0% -80% 0%',
        threshold: 0.1,
      }
    );

    // Observe all headings
    const elements = headings.map(heading => document.getElementById(heading.id)).filter(Boolean);
    elements.forEach(el => observer.observe(el!));

    return () => {
      elements.forEach(el => observer.unobserve(el!));
    };
  }, [headings, pathname]);

  // Handle smooth scrolling to the heading when clicked
  const handleClickHeading = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);

    if (element) {
      // Get the element's position and apply header offset
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      // Scroll to the element with offset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      // Update URL hash without jumping
      window.history.pushState(null, '', `#${id}`);
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="toc-container rounded-lg border border-border p-4 bg-card shadow-sm">
      <h3 className="font-semibold mb-4 pb-2 border-b border-border">Table of Contents</h3>
      <ul className="space-y-2 text-sm">
        {headings.map(heading => (
          <li key={heading.id} className="line-clamp-2">
            <a
              href={`#${heading.id}`}
              onClick={e => handleClickHeading(e, heading.id)}
              className={`
                transition-colors block py-1 relative
                ${
                  activeId === heading.id
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }
                ${heading.level === 2 ? 'pl-3' : heading.level === 3 ? 'pl-6' : ''}
              `}
            >
              {activeId === heading.id && (
                <span className="absolute left-0 inset-y-0 w-0.5 bg-primary rounded-full" />
              )}
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
