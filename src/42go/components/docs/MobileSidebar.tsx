"use client";

import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

interface MobileSidebarProps {
  children: React.ReactNode;
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Prevent scrolling when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // Match the animation duration
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not the sidebar content
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    // Close sidebar when clicking on links
    const target = e.target as HTMLElement;
    if (target.tagName === "A" || target.closest("a")) {
      handleClose();
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition shadow-sm"
        aria-expanded={isOpen}
        aria-controls="mobile-sidebar"
      >
        <span className="font-medium">Documentation Navigation</span>
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile bottom sheet sidebar */}
      {(isOpen || isClosing) && (
        <div className="w-full">
          <div className="sidebar-markdown">
            <div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={handleBackdropClick}
            >
              <div
                className={`fixed inset-x-4 bottom-4 top-16 bg-background shadow-xl rounded-t-xl ${
                  isClosing
                    ? "animate-out slide-out-to-bottom duration-300"
                    : "animate-in slide-in-from-bottom duration-300"
                }`}
                id="mobile-sidebar"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Handle bar for visual indication */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>

                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-gray-100 dark:hover:bg-gray-800 transition z-10"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>

                <div
                  className="overflow-y-auto h-full px-4 pb-4 pt-2"
                  onClick={handleContentClick}
                >
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
