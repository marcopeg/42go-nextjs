import React from 'react';
import { format } from 'date-fns';

interface DocHeaderProps {
  title?: string;
  subtitle?: string;
  author?: string;
  publicationDate?: string;
}

export default function DocHeader({ title, subtitle, author, publicationDate }: DocHeaderProps) {
  // If no data is provided, don't render the component
  if (!title && !subtitle && !author && !publicationDate) {
    return null;
  }

  // Format the publication date if it exists
  const formattedDate = publicationDate ? format(new Date(publicationDate), 'MMMM d, yyyy') : null;

  return (
    <header className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6 w-full">
      {title && <h1 className="text-4xl font-bold mb-2">{title}</h1>}
      {subtitle && <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">{subtitle}</p>}

      {(author || formattedDate) && (
        <div className="flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400">
          {author && (
            <div className="mr-4 mb-2">
              <span className="font-medium">By:</span> {author}
            </div>
          )}
          {formattedDate && (
            <div className="mb-2">
              <span className="font-medium">Published:</span> {formattedDate}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
