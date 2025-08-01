"use client";

import { useState } from "react";
import { WeirdCalendar } from "./WeirdCalendar";

export default function CalendarClient() {
  const [highlightedDays, setHighlightedDays] = useState<Date[]>([
    // Start with some example highlighted days
    new Date(2025, 0, 15), // January 15
    new Date(2025, 1, 14), // February 14
    new Date(2025, 6, 4), // July 4
    new Date(2025, 11, 25), // December 25
  ]);

  const handleDaysChange = (days: Date[]) => {
    setHighlightedDays(days);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">
            WeirdCalendar 2025
          </h1>
          <p className="text-muted-foreground">
            Click days to highlight them. Chuck Norris doesn&apos;t need
            calendars, but you do.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Highlighted days: {highlightedDays.length}
          </p>
        </div>

        <WeirdCalendar
          year={2025}
          highlightedDays={highlightedDays}
          onChange={handleDaysChange}
        />
      </div>
    </div>
  );
}
