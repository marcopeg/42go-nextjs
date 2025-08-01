# Create Basic UI POC for User Dashboard [acq]

Focus on the route "/calendar" (`@/app/calendar/page.tsx`).
In here i want to create a weird calendar component:

```plaintext
app
└── calendar
    └── WeirdCalendar
        ├── index.ts
        └── WeirdCalendar.tsx
```

## Months Rendering

it should render the 12 months in 12 columns.

```text
| jan | feb | mar | ... |
```

## Days rendering

inside each month column the days are rendered one beneath the other.

```text
| jan |
| --- |
| 1 |
| 2 |
| 3 |
| ... |
```

the day is a circle with the number in the middle and a very small day name underneath as 3 letters as in "mon", "tue", ...

## Rendering data

the component should receive a data object with the following properites:

- year to render
- list of days that need to be lighed up

## Lighed up days

each day should work as a toggle button.
it's active (make it beautiful and bright) if its date is part o the brighed days in the config.

When clicking, the button acts as a toggle that calls an `onChange` callback with the new list of days.

# How to use it:

Use this component in the `page.tsx` and keep there a state for the brighted up days. render current year

# Development Plan

## Current Analysis

The calendar route already exists at `src/app/calendar/page.tsx` but is just a placeholder with "calendar" text. This route is properly configured with:

- `appPage` wrapper with "CalendarPage" feature flag
- Basic structure ready for implementation
- Calendar app config with CalendarPro branding

## WeirdCalendar Component Requirements

### Component Structure

- **12-column layout**: Each month in its own column
- **Vertical day layout**: Days stacked vertically within each month
- **Day circles**: Circular buttons with day number
- **Day labels**: 3-letter day names (mon, tue, wed, etc.)
- **Toggle functionality**: Days can be activated/deactivated
- **State management**: Controlled component with onChange callback

### Props Interface

```typescript
interface WeirdCalendarProps {
  year: number;
  highlightedDays: Date[];
  onChange: (days: Date[]) => void;
}
```

### Visual Design

- Months displayed as column headers (jan, feb, mar, etc.)
- Days as circular toggle buttons
- Highlighted days should be visually distinct (bright/active state)
- Responsive design for different screen sizes
- Chuck Norris-level styling

## Implementation Steps

### 1. Create WeirdCalendar Component Structure

**Files to create:**

- `src/app/calendar/WeirdCalendar/index.ts` - Export barrel
- `src/app/calendar/WeirdCalendar/WeirdCalendar.tsx` - Main component
- `src/app/calendar/WeirdCalendar/types.ts` - TypeScript interfaces

### 2. Implement Calendar Logic

**Core functionality:**

- Generate all days for the given year
- Group days by month
- Calculate day names (mon, tue, wed, etc.)
- Handle date toggles and state management
- Efficient rendering with proper keys

### 3. Style the Calendar

**Design approach:**

- Use Tailwind CSS for styling
- Leverage existing Button component patterns from shadcn/ui
- 12-column grid layout (responsive)
- Circular day buttons with hover/active states
- Calendar Pro theme integration (light theme, fuchsia accents)

### 4. Integrate with Calendar Page

**Page implementation:**

- Add state management for highlighted days
- Render WeirdCalendar with current year (2025)
- Handle onChange events
- Add basic page layout and styling

### 5. Testing and Refinement

**Validation:**

- Test on calendar.localhost:3000
- Verify toggle functionality
- Check responsive design
- Ensure Chuck Norris-level performance

## Technical Considerations

### Date Management

- Use JavaScript Date objects for consistency
- Handle year transitions properly
- Account for leap years
- Use ISO date strings for comparison

### Performance

- Optimize rendering with React.memo if needed
- Use proper keys for list items
- Minimize re-renders on state changes

### Accessibility

- Proper ARIA labels for calendar navigation
- Keyboard navigation support
- Screen reader friendly structure

### Responsive Design

- Handle different screen sizes gracefully
- Consider mobile layout adjustments
- Maintain usability across devices

## Files to Modify/Create

- **Create**: `src/app/calendar/WeirdCalendar/index.ts`
- **Create**: `src/app/calendar/WeirdCalendar/WeirdCalendar.tsx`
- **Create**: `src/app/calendar/WeirdCalendar/types.ts`
- **Modify**: `src/app/calendar/page.tsx` - Replace placeholder with WeirdCalendar

## Next Steps

Execute task (k2)
