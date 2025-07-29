'use client';

import React, { useState, useEffect } from 'react';
import DocSidebar from './DocSidebar';
import { Menu, X } from 'lucide-react';

interface MobileSidebarToggleProps {
  content: string;
}

export default function MobileSidebarToggle({ content }: MobileSidebarToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Prevent scrolling when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
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

      {/* Mobile full-screen sidebar */}
      {(isOpen || isClosing) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div
            className={`fixed inset-y-0 right-0 w-full bg-background shadow-xl ${
              isClosing
                ? 'animate-out slide-out-to-right duration-300'
                : 'animate-in slide-in-from-right duration-300'
            }`}
            id="mobile-sidebar"
          >
            {/* Floating close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-gray-100 dark:hover:bg-gray-800 transition z-10"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto h-full p-4">
              <DocSidebar content={content} mobileView={true} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
