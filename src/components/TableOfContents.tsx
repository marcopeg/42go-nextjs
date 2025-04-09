'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
  isActive?: boolean;
}

interface TableOfContentsProps {
  markdown: string;
  position?: 'mobile' | 'top' | 'side';
}

export default function TableOfContents({ markdown, position = 'mobile' }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(position === 'side');
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

      // Collapse the TOC when a section is clicked on mobile or top views
      if (position === 'mobile' || position === 'top') {
        setIsExpanded(false);
      }
    }
  };

  if (headings.length === 0) {
    return null;
  }

  // Render TOC heading links list (shared between all views)
  const renderTOCLinks = () => (
    <ul className="space-y-2 text-sm">
      {headings.map(heading => (
        <li key={heading.id} className="line-clamp-2">
          <a
            href={`#${heading.id}`}
            onClick={e => handleClickHeading(e, heading.id)}
            className={`
              transition-colors block py-2 relative
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
  );

  // Mobile collapsible view
  if (position === 'mobile') {
    return (
      <div className="w-full border border-border rounded-lg overflow-hidden bg-background">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full p-4 text-left font-semibold hover:bg-muted/50 transition-colors"
        >
          <span>Table of Contents</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isExpanded && <div className="p-4 border-t border-border">{renderTOCLinks()}</div>}
      </div>
    );
  }

  // Small desktop top view - now also collapsible
  if (position === 'top') {
    return (
      <div className="w-full border border-border rounded-lg overflow-hidden bg-background">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full p-4 text-left font-semibold hover:bg-muted/50 transition-colors"
        >
          <span>Table of Contents</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isExpanded && <div className="p-4 border-t border-border">{renderTOCLinks()}</div>}
      </div>
    );
  }

  // Large desktop side view
  return (
    <nav className="rounded-lg border border-border bg-background shadow-sm">
      <h3 className="font-semibold p-4 pb-3 border-b border-border">Table of Contents</h3>
      <div className="p-4">{renderTOCLinks()}</div>
    </nav>
  );
}
