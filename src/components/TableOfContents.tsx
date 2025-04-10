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

        const element = document.createElement('h' + level);
        element.id = id;
        element.textContent = text;
        document.body.appendChild(element);

        return element as HeadingElement;
      });

      setHeadings(items);
    };

    extractHeadings();
  }, [markdown]);

  // Set up scroll event listener to track which heading is in view
  const handleScroll = React.useCallback(() => {
    if (!headings.length) return;

    const headingElements = headings.map(heading => ({
      id: heading.id,
      top: heading.getBoundingClientRect().top,
    }));

    const closestHeading = headingElements.reduce((closest, current) => {
      if (current.top > 0) return closest;
      if (closest.top === 0) return current;
      return Math.abs(current.top) < Math.abs(closest.top) ? current : closest;
    }, headingElements[0]);

    if (closestHeading) {
      setActiveId(closestHeading.id);
    }
  }, [headings]);

  useEffect(() => {
    if (typeof window === 'undefined' || !headings.length) return;

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
