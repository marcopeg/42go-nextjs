export interface WeirdCalendarProps {
  year: number;
  highlightedDays: Date[];
  onChange: (days: Date[]) => void;
}

export interface DayInfo {
  date: Date;
  dayNumber: number;
  dayName: string;
  isHighlighted: boolean;
}

export interface MonthInfo {
  name: string;
  shortName: string;
  days: DayInfo[];
}
