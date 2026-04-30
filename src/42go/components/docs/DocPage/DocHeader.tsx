import React from "react";
import { ShowDate } from "../../ShowDate";

interface DocHeaderProps {
  title?: string;
  excerpt?: string;
  author?: string;
  date?: string;
}

export function DocHeader({ title, excerpt, author, date }: DocHeaderProps) {
  // If no data is provided, don't render the component
  if (!title && !excerpt && !author && !date) {
    return null;
  }

  return (
    // <header className="mb-8 md:border-b border-gray-200 dark:border-gray-800 pb-6 w-full">
    <header className="w-full mb-8">
      {title && <h1 className="text-4xl font-bold mt-4 mb-2">{title}</h1>}
      {excerpt && (
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
          {excerpt}
        </p>
      )}

      {(author || date) && (
        <div className="flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400">
          {author && (
            <div className="mr-4 mb-2">
              <span className="font-medium">By:</span> {author}
            </div>
          )}
          {date && (
            <div className="mb-2">
              <span className="font-medium">Published:</span>{" "}
              <ShowDate date={date} />
            </div>
          )}
        </div>
      )}
    </header>
  );
}
