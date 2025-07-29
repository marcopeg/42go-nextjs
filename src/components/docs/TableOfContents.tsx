'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface HeadingElement extends HTMLElement {
  id: string;
}

interface TableOfContentsProps {
  markdown: string;
  position?: 'mobile' | 'top' | 'side';
  className?: string;
}

export default function TableOfContents({
  markdown,
  position = 'mobile',
  className,
}: TableOfContentsProps) {
  const [headings, setHeadings] = useState<HeadingElement[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(position === 'side');

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

      const items: HeadingElement[] = matches.map(match => {
        const level = match[1].length; // Number of # symbols
        const text = match[2].trim();
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-'); // Replace spaces with hyphens

        // Create a virtual heading element without appending to DOM
        const element = {
          id,
          textContent: text,
          tagName: `H${level}`,
          getBoundingClientRect: () => ({
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          }),
        } as HeadingElement;

        return element;
      });

      setHeadings(items);
    };

    extractHeadings();
  }, [markdown]);

  // Set up scroll event listener to track which heading is in view
  const handleScroll = React.useCallback(() => {
    if (!headings.length) return;

    // Get all heading elements from the document
    const headingElements = Array.from(document.querySelectorAll('h1, h2, h3')).map(el => ({
      id: el.id,
      top: el.getBoundingClientRect().top,
    }));

    // Find the closest heading that is above the viewport
    const closestHeading = headingElements.reduce<{ id: string; top: number } | null>(
      (closest, current) => {
        // If current heading is below viewport, keep the closest one
        if (current.top > 0) return closest;
        // If we don't have a closest yet, use current
        if (!closest) return current;
        // If current is closer to viewport top than closest, use current
        return Math.abs(current.top) < Math.abs(closest.top) ? current : closest;
      },
      null
    );

    if (closestHeading) {
      setActiveId(closestHeading.id);
    }
  }, [headings]);

  useEffect(() => {
    if (typeof window === 'undefined' || !headings.length) return;

    // Initial check for active heading
    handleScroll();

    // Add scroll listener with throttling
    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollListener);
    return () => window.removeEventListener('scroll', scrollListener);
  }, [headings, handleScroll]);

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
    <nav className={`space-y-2 ${className || ''}`}>
      {headings.map(heading => (
        <button
          key={heading.id}
          onClick={e => handleClickHeading(e, heading.id)}
          className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${
            activeId === heading.id
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
          }`}
          style={{
            paddingLeft: `${(parseInt(heading.tagName[1]) - 1) * 1}rem`,
          }}
        >
          {heading.textContent}
        </button>
      ))}
    </nav>
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

  // Large desktop side view - updated to match docs menu on the left with border touching top and bottom
  return <div className="h-full">{renderTOCLinks()}</div>;
}
