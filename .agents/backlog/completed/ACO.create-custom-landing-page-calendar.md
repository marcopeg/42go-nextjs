# Create Custom Landing Page for Calendar Config [aco]

Create custom landing page for the calendar config

## Goals

- [ ] Design calendar-specific landing page
- [ ] Implement calendar-focused content and branding
- [ ] Configure page routing for calendar app

## Acceptance Criteria

- [ ] Custom landing page created for calendar app
- [ ] Calendar-specific content and design implemented
- [ ] Landing page properly integrated with calendar config
- [ ] Page displays correctly on calendar.localhost:3000

# Development Plan

## Current Analysis

The calendar app is already configured in `src/AppConfig.ts` with:

- Match URLs: `calendar.localhost:3000` and `calendar.mydomain.com`
- Basic metadata and branding (CalendarPro with CalendarCheck icon)
- A simple HomePage configuration with basic hero and CTA
- Terms page already exists at `contents/calendar/terms.md`
- Uses credentials-only authentication
- Light theme default

## Required Changes

### 1. Create Calendar-Specific HomePage Configuration

Need to create a calendar-focused homepage that showcases calendar features instead of the generic SaaS starter kit messaging.

**File to create**: `src/config/calendar-home-page.ts`

**Content structure**:

- Hero section highlighting calendar/scheduling benefits
- Features showcase for time management capabilities
- Call-to-action focusing on calendar functionality
- Calendar-themed messaging throughout

### 2. Update AppConfig for Calendar

**File to modify**: `src/AppConfig.ts`

**Changes needed**:

- Replace the current basic HomePage configuration with the new calendar-specific one
- Import the new calendar homepage configuration
- Ensure proper calendar branding is maintained

### 3. Add Calendar-Specific Content Blocks (Optional Enhancement)

Could add calendar-specific markdown content or additional landing page sections that highlight:

- Time management benefits
- Scheduling features
- Calendar integration capabilities
- Professional productivity messaging

## Implementation Steps

1. **Create Calendar Homepage Configuration**

   - Create `src/config/calendar-home-page.ts` with calendar-focused content
   - Include calendar-themed hero section
   - Add relevant CTAs (Try Calendar, Schedule Demo, etc.)

2. **Update AppConfig Integration**

   - Import new calendar homepage in `src/AppConfig.ts`
   - Replace generic HomePage with CalendarHomePage in calendar config
   - Maintain existing calendar branding (CalendarPro, CalendarCheck icon)

3. **Test Calendar Landing Page**

   - Verify calendar.localhost:3000 displays the custom landing page
   - Ensure all links and CTAs work properly
   - Confirm calendar-specific branding is visible

4. **Content Refinement**
   - Polish calendar-focused messaging
   - Ensure Chuck Norris tone is maintained
   - Verify mobile responsiveness

## Files to Modify/Create

- **Create**: `src/config/calendar-home-page.ts` - Calendar-specific homepage configuration
- **Modify**: `src/AppConfig.ts` - Update calendar app configuration to use new homepage

## Next Steps

Execute task (k2)
