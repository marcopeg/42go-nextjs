"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type HeadingElement } from "./TOCutils";
import { TOCLinks } from "./TOCLinks";

export const TOCInline = ({ headings }: { headings: HeadingElement[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFab, setShowFab] = useState(false);

  // Show FAB when user scrolls down
  useEffect(() => {
    const handleScroll = () => {
      setShowFab(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    window.history.pushState(null, "", window.location.pathname);
  };

  if (!headings.length) return <hr className="mb-8" />;

  return (
    <>
      <hr className="mb-8 hidden lg:block" />
      <div className="block lg:hidden mb-10 w-full border border-border rounded-lg overflow-hidden bg-background">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full p-4 text-left font-semibold hover:bg-muted/50 transition-colors"
        >
          <span>Table of Contents</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="p-4 border-t border-border">
            <TOCLinks headings={headings} />
          </div>
        )}
      </div>

      {/* FAB Button - only visible on smaller screens when scrolled */}
      {showFab && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 lg:hidden z-50 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </>
  );
};
