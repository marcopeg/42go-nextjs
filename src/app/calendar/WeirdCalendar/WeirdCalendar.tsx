"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/42go/utils/utils";
import type { WeirdCalendarProps, MonthInfo, DayInfo } from "./types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function WeirdCalendar({
  year,
  highlightedDays,
  onChange,
}: WeirdCalendarProps) {
  const monthsData = useMemo(() => {
    const months: MonthInfo[] = [];

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const days: DayInfo[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthIndex, day);
        const dayOfWeek = date.getDay();
        const dayName = DAY_NAMES[dayOfWeek];
        const isHighlighted = highlightedDays.some(
          (highlightedDay) =>
            highlightedDay.getFullYear() === year &&
            highlightedDay.getMonth() === monthIndex &&
            highlightedDay.getDate() === day
        );

        days.push({
          date,
          dayNumber: day,
          dayName,
          isHighlighted,
        });
      }

      months.push({
        name: MONTH_NAMES[monthIndex],
        shortName: MONTH_SHORT_NAMES[monthIndex],
        days,
      });
    }

    return months;
  }, [year, highlightedDays]);

  const handleDayToggle = (date: Date) => {
    const isCurrentlyHighlighted = highlightedDays.some(
      (highlightedDay) =>
        highlightedDay.getFullYear() === date.getFullYear() &&
        highlightedDay.getMonth() === date.getMonth() &&
        highlightedDay.getDate() === date.getDate()
    );

    let newHighlightedDays: Date[];

    if (isCurrentlyHighlighted) {
      // Remove the day
      newHighlightedDays = highlightedDays.filter(
        (highlightedDay) =>
          !(
            highlightedDay.getFullYear() === date.getFullYear() &&
            highlightedDay.getMonth() === date.getMonth() &&
            highlightedDay.getDate() === date.getDate()
          )
      );
    } else {
      // Add the day
      newHighlightedDays = [...highlightedDays, new Date(date)];
    }

    onChange(newHighlightedDays);
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1200px] grid grid-cols-12 gap-2 p-4">
        {monthsData.map((month) => (
          <div
            key={month.shortName}
            className="flex flex-col items-center space-y-2"
          >
            {/* Month Header */}
            <div className="font-bold text-lg text-primary uppercase tracking-wider">
              {month.shortName}
            </div>

            {/* Days Column */}
            <div className="flex flex-col space-y-2 items-center">
              {month.days.map((day) => (
                <div
                  key={`${month.shortName}-${day.dayNumber}`}
                  className="flex flex-col items-center"
                >
                  {/* Day Circle Button with both number and day name inside */}
                  <Button
                    variant={day.isHighlighted ? "default" : "outline"}
                    className={cn(
                      "w-12 h-12 rounded-full text-xs font-medium transition-all duration-200 flex flex-col items-center justify-center p-1 gap-0",
                      day.isHighlighted &&
                        "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/50",
                      !day.isHighlighted &&
                        "hover:bg-primary/10 hover:border-primary/50"
                    )}
                    onClick={() => handleDayToggle(day.date)}
                    aria-label={`${month.name} ${day.dayNumber}, ${year}`}
                  >
                    <span className="font-bold leading-none -mb-0.5">
                      {day.dayNumber}
                    </span>
                    <span className="text-[10px] leading-none font-mono opacity-75">
                      {day.dayName}
                    </span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeirdCalendar;
