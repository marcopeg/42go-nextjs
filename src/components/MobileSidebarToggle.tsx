'use client';

import React, { useState } from 'react';
import DocSidebar from './DocSidebar';

interface MobileSidebarToggleProps {
  content: string;
}

export default function MobileSidebarToggle({ content }: MobileSidebarToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 mb-4 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        aria-expanded={isOpen}
        aria-controls="mobile-sidebar"
      >
        <span className="font-medium">Documentation Navigation</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Mobile drawer */}
      {isOpen && (
        <div
          id="mobile-sidebar"
          className="mb-6 border border-gray-200 dark:border-gray-800 rounded-md p-4 bg-white dark:bg-gray-900 max-h-[70vh] overflow-hidden"
        >
          <div className="overflow-y-auto overflow-x-hidden pr-2 -mr-2 h-full max-h-[65vh]">
            <DocSidebar content={content} />
          </div>
        </div>
      )}
    </>
  );
}
