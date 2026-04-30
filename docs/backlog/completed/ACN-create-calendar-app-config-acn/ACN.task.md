---
taskId: ACN
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-01T14:39:07+02:00
---

# Create Calendar App Config [acn]

**Status:** ✅ COMPLETE

Create new config for the calendar app that answers to calendar.localhost:3000

## Goals

- [x] Create app configuration that responds to calendar.localhost:3000
- [x] Configure routing and app matching for calendar subdomain
- [x] Set up appropriate name and icon and public metadata

## Acceptance Criteria

- [x] Calendar app responds to calendar.localhost:3000
- [x] App matching configured correctly
- [x] Calendar-specific branding and metadata configured
- [x] Appropriate feature flags and authentication providers set up (credentials only)

## Progress

- Added `calendar` app config to `src/AppConfig.ts` with:
  - URL matching for `calendar.localhost:3000`
  - Custom branding, metadata, and Lucide `CalendarCheck` icon
  - Default theme set to `light`
  - Feature flags set to allow all pages and APIs
  - Authentication set to credentials only
- Created `/public/themes/calendar.css` with a bright fuchsia primary color
- `.env.example` updated to remove unnecessary calendar GitHub OAuth variables
- Verified theme system auto-loads `/themes/calendar.css` for the calendar app
- Lint and build checks passed

## Issues Encountered

None. The code surrendered immediately.

## Libraries Used

- No new libraries. Just Lucide icons and Chuck Norris attitude.

## Next Steps

- Test `calendar.localhost:3000` in your browser.
- Enjoy the fuchsia fury.

# Create Calendar App Config [acn]

Create new config for the calendar app that answers to calendar.localhost:3000

## Goals

- [ ] Create app configuration that responds to calendar.localhost:3000
- [ ] Configure routing and app matching for calendar subdomain
- [ ] Set up appropriate name and icon and public metadata

## Acceptance Criteria

- [ ] Calendar app responds to calendar.localhost:3000
- [ ] App matching configured correctly
- [ ] Calendar-specific branding and metadata configured
- [ ] Appropriate feature flags and authentication providers set up (just github login for now)

## Development Plan

### Step 1: Analyze Existing App Patterns

Examine the current `availableApps` configuration in `src/AppConfig.ts` to understand:

- URL matching patterns using regex
- App naming and branding structure
- Feature flag configuration patterns
- Authentication provider setup
- Public metadata and toolbar configuration

### Step 2: Choose Calendar-Appropriate Icon

Select a suitable Lucide icon for calendar functionality:

- `CalendarCheck` - Calendar with checkmark

Use direct import approach following the existing pattern.

### Step 3: Create Calendar App Configuration

Add new `calendar` app to `availableApps` with:

- **URL Matching**: `^calendar\\.localhost:3000$` pattern
- **Branding**: Calendar-specific name, appropriate Lucide icon
- **Theme**: Choose appropriate default theme (light)
- **Feature Flags**: Initially allow basic pages (`*`)
- **Authentication**: Configure appropriate OAuth providers (only guthub)
- **Public Metadata**: Calendar-focused title, description, keywords

### Step 4: Configure App-Specific Settings

Set up calendar-specific configuration:

- **Toolbar Config**: Calendar-focused title and subtitle
- **Pages Configuration**: Use existing page templates initially
- **Feature Flags**: Configure available pages and APIs
- **Authentication**: Decide on OAuth provider strategy

### Step 5: Testing and Validation

- Test URL matching with `calendar.localhost:3000`
- Verify app resolution in middleware
- Check metadata and theming
- Validate feature flag functionality
- Run `yarn qa` to ensure no errors

### Files to Modify

- `src/AppConfig.ts` - Add calendar app configuration to `availableApps`

### Technical Considerations

1. **URL Pattern**: Use consistent regex pattern matching existing apps
2. **Icon Selection**: Import specific Lucide icon to avoid bundle bloat
3. **Feature Flags**: Start with permissive flags, can restrict later
4. **Theme Default**: Choose appropriate default theme for calendar use case
5. **Authentication**: Consider which OAuth providers make sense for calendar app
6. **Metadata**: SEO-friendly calendar-focused metadata

The plan follows the established architectural patterns while creating a calendar-focused app configuration that responds to `calendar.localhost:3000`.

## Next Steps

Execute task (k2)
