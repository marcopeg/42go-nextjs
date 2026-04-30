"use client";

import { useState } from "react";

interface DisplayDateProps {
  date: Date | string | null | undefined;
  className?: string;
}

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Just now (< 1 minute)
  if (diffSeconds < 60) {
    return "just now";
  }

  // Minutes ago (1-59 minutes)
  if (diffMinutes < 60) {
    if (diffMinutes === 1) return "1 min ago";
    if (diffMinutes < 5) return "few minutes ago";
    return `${diffMinutes} min ago`;
  }

  // Same day - show time
  const today = new Date();
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Yesterday
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return "yesterday";
  }

  // This week (within 7 days)
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "long" }).toLowerCase();
  }

  // This year - show month and day
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  // Previous years - show month, day, year
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export function DisplayDate({ date, className = "" }: DisplayDateProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!date) {
    return <span className={className}>—</span>;
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  // Check for invalid date
  if (isNaN(dateObj.getTime())) {
    return <span className={className}>—</span>;
  }

  const relativeTime = formatRelativeTime(dateObj);
  const fullDate = dateObj.toLocaleString();

  return (
    <div className="relative inline-block">
      <span
        className={`cursor-help ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(true)}
        onTouchEnd={() => setTimeout(() => setShowTooltip(false), 2000)}
      >
        {relativeTime}
      </span>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
          {fullDate}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}
