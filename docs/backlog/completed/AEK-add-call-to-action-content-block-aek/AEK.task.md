---
taskId: AEK
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-14T05:53:48+02:00
---

# Add Call To Action content block [aek]

Implement a new "Call To Action" (CTA) content block for public / dynamic pages. A pure action-focused conversion element (login, signup, start trial) with primary button + optional secondary button. No text content - just buttons. Configurable via `AppConfig.public.pages[*].items[]`, leverages existing Button primitives, inherits theming, fully SSR.

## Goals

- [ ] Define CTA block UX & purpose (single conversion focus)
- [ ] Specify configuration & runtime props (schema)
- [ ] Implement server component wrapper + minimal client logic (only if needed)
- [ ] Integrate with DynamicPage / ContentBlock registry
- [ ] Support primary + optional secondary action
- [ ] Support sizing (md|lg|xl|hero) incl. new "hero" size mapping to Button
- [ ] Support alignment (center|left) & vertical spacing (mt, mb tokens)
- [ ] Inherit accent color automatically; allow override via `color?: string`
- [ ] Dark mode styling & accessibility (contrast ≥ 4.5)
- [ ] Add docs & example snippet
- [ ] Add tests (render variants + SSR + link behavior)

## Acceptance Criteria

- [ ] `type: "cta"` renders server-side without hydration warnings
- [ ] Mandatory fields validated (href, label) with dev warning if missing
- [ ] Optional secondary action (`secondary`) supported with enforced non-primary variant
- [ ] Internal links use Next.js `Link`; external links use `<a>`; `_blank` adds `rel="noopener noreferrer"`
- [ ] Responsive layout: mobile stack, desktop centered max-width
- [ ] Dark mode styles verified (no contrast failures)
- [ ] Accent color applied to primary by default
- [ ] Secondary defaults to outline/ghost style
- [ ] New size `hero` implemented in Button component with classes like `h-14 px-8 text-lg font-semibold`
- [ ] Spacing props whitelist → Tailwind classes
- [ ] Tests: schema guard, internal vs external, size fallback, dark mode class
- [ ] Docs updated (usage + schema table) & FEATURES content block list if needed
- [ ] QA (lint + build) passes

## Configuration Schema (Draft)

```ts
type CTAAction = {
  href: string; // required
  label: string; // required (no icon-only)
  icon?: string; // lucide icon name, resolved at runtime
  target?: "_blank" | "_self";
  rel?: string; // auto-augmented if target _blank
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "xl" | "hero";
};

type CTAConfig = {
  type: "cta";
  action: CTAAction; // primary required
  secondary?: CTAAction; // optional secondary
  align?: "center" | "left"; // default center
  spacing?: "none" | "sm" | "md" | "lg" | "xl"; // vertical spacing token applies to both top and bottom
  colors?: {
    background?: string; // CSS color for primary button background
    foreground?: string; // CSS color for primary button text
  };
  className?: string; // escape hatch
};
```

Validation: runtime type guard + dev console warnings; fail-soft with defaults.

## Example Config

```ts
HomePage: {
  items: [
    {
      type: "cta",
      action: { href: "/login", label: "Login", icon: "LogIn", size: "hero" },
      secondary: { href: "/docs", label: "Read Docs", variant: "outline" },
      spacing: "lg",
      align: "center",
    },
  ];
}

// Inspired by the design example:
CalendarPage: {
  items: [
    {
      type: "cta",
      action: {
        href: "/booking",
        label: "Check available dates",
        size: "hero",
        variant: "default", // uses theme's primary color, not hardcoded black
      },
      secondary: {
        href: "/brochure.pdf",
        label: "Download Brochure",
        icon: "Download",
        variant: "outline",
        target: "_blank",
      },
      spacing: "md",
      align: "center",
    },
  ];
}
```

````

## Design Vision

Based on the provided design example (note: colors should follow theme, not hardcoded):
- **Primary Action**: Large, prominent button using theme's primary color for main conversion goal
- **Secondary Action**: Outline button with optional icon (e.g., download icon) for supporting actions
- **Layout**: Vertically stacked on mobile, horizontal on desktop with proper spacing
- **Visual Hierarchy**: Primary button dominates, secondary provides alternative without competing
- **Spacing**: Clean vertical rhythm, centered alignment creates focus
- **Theming**: Primary button inherits theme's accent/primary color (black in example was just that site's theme)

## Constraints

- `action.href` & `action.label` mandatory
- Primary `variant` default: `default`
- Primary `size` default: `hero` (fallback to `xl` if not implemented)
- Secondary cannot also be `variant: default` (auto-downgrade to `outline`)
- Unsupported size values → warn + fallback to `lg`

## Ideas / Implementation Notes

- Reuse existing `Button` component (extend with `hero` size if missing)
- SSR-only initial version (no client interactivity needed)
- Internal vs external detection: `isExternal = /^(https?:)?\/\//.test(href)`
- Optional `prefetch` passthrough? (defer unless needed)
- Spacing token mapping (tentative): `none:''`, `sm:'my-4'`, `md:'my-8'`, `lg:'my-12'`, `xl:'my-16'` (applies to both top and bottom)
- Responsive behavior: stack vertically on mobile (< 640px), horizontal on desktop with gap
- Icon resolution: Direct Lucide component imports (`import { Download } from "lucide-react"`)
- Mobile layout: Same button sizes maintained (no size reduction on mobile)
- External link detection: `isExternal = /^https?:\/\//.test(href)` - require protocol
- Color validation: CSS-compatible colors only via regex `^(#[0-9a-fA-F]{3,8}|rgb|hsl|var\(--[\w-]+\)|[\w-]+)$`

## Edge Cases

1. Secondary identical to primary → warn & drop duplicate
2. External link missing protocol ("www.foo.com") – DECIDED: require protocol, warn if missing
3. Malicious `colors` values (e.g., `url(js:...)`) – sanitize with CSS color regex allowlist
4. Overlong label wraps gracefully; enforce `max-w` container
5. Missing `action` object → skip render + dev error

## Accessibility

- Focus visible & consistent
- Color contrast ≥ 4.5:1 (manual verify; possible future automated test)
- No icon-only CTAs
- If `_blank`, add `rel` protections (icon for external maybe v2)

## Risks

- Button `hero` size addition could cascade into existing usages (audit search results)
- Over-flexible `color` may produce inaccessible combinations
- Scope creep into a marketing banner – keep focused

## Open Questions (RESOLVED)

All questions resolved:
1. ✅ Background variants - No, keep button-only for v1
2. ✅ Illustration slot - No, defer to v2
3. ✅ External link icons - No, manual via icon prop
4. ✅ Analytics hooks - No, defer to v2

## Assumptions (Proposed)

- Button-only design, no text content
- No background variant v1
- No illustration slot v1
- No analytics baked in v1
- No external icon v1

## Development Plan

### Current Analysis

**ContentBlock Architecture**:
- Server ContentBlock supports: HeroBlock, DemoBlock, MarkdownBlock, ComponentBlock, LinkBlock, PricingBlock, WaitlistBlock, FeedbackBlock
- Client ContentBlock supports: ComponentBlock, LinkBlock (for AppLayout actions)
- CTA block fits **server** ContentBlock pattern (static SSR content, no interactivity needed)

**Button Component Current Sizes**:
- `sm`: `h-8 rounded-md gap-1.5 px-3`
- `default`: `h-9 px-4 py-2`
- `lg`: `h-10 rounded-md px-6`
- `icon`: `size-9`
- **Missing**: `hero` size → needs implementation

**Existing Patterns**:
- Type definition pattern: `type TCTAConfig = { type: "cta", ... }`
- Block component pattern: Server component with props spread
- Registry pattern: Add to `blocksMap` in `server.tsx`
- Icon pattern: Direct Lucide imports with dynamic resolution

### Implementation Strategy

**Phase 1: Extend Button Component**
1. Add `hero` size to Button variants
2. Define Tailwind classes: `h-14 px-8 text-lg font-semibold`
3. Test existing Button usages for regression

**Phase 2: Create CTA Block Types**
1. Define `CTAAction` and `CTAConfig` interfaces
2. Add type guard function `isCTAConfig()`
3. Create icon resolver utility for Lucide components

**Phase 3: Implement CTA Component**
1. Create server component following existing block patterns
2. Implement responsive layout (stack mobile, horizontal desktop)
3. Add custom color support with CSS variables
4. Handle internal vs external link logic

**Phase 4: Registry Integration**
1. Add CTA block to ContentBlock server registry
2. Update ContentBlockItem union type
3. Export types for external usage

**Phase 5: Testing & Documentation**
1. Create test suite for type validation and rendering
2. Add usage docs and examples
3. QA run and finalize

### Files to Create/Modify

**Modify:**
- `/src/components/ui/button.tsx` - Add `hero` size variant
- `/src/42go/components/ContentBlock/server.tsx` - Add CTABlock to blocksMap and types
- `/docs/memory-bank/FEATURES.md` - Add CTA block to content block list

**Create:**
- `/src/42go/components/ContentBlock/blocks/CTABlock.tsx` - Main component
- `/src/42go/components/ContentBlock/blocks/CTABlock.test.tsx` - Test suite

### Technical Implementation Details

**1. Button Hero Size Extension**

```tsx
// In src/components/ui/button.tsx - add to size variants
size: {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",
  sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
  lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
  hero: "h-14 px-8 text-lg font-semibold has-[>svg]:px-6",
  icon: "size-9",
},
````

**2. Type Definitions**

```tsx
// Component interfaces
export interface CTAAction {
  href: string;
  label: string;
  icon?: string;
  target?: "_blank" | "_self";
  rel?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "xl" | "hero";
}

export interface CTAConfig {
  type: "cta";
  action: CTAAction;
  secondary?: CTAAction;
  align?: "center" | "left";
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
  colors?: {
    background?: string;
    foreground?: string;
  };
  className?: string;
}

export type TCTABlock = CTAConfig;
```

**3. Icon Resolution Strategy**

```tsx
// Icon resolver with dynamic imports
const resolveIcon = (iconName?: string) => {
  if (!iconName) return null;

  try {
    // Dynamic Lucide import
    const IconComponent = require(`lucide-react`)[iconName];
    return IconComponent || null;
  } catch {
    console.warn(`Icon "${iconName}" not found in lucide-react`);
    return null;
  }
};
```

**4. Link Logic Implementation**

```tsx
// Internal vs external detection
const isExternalUrl = (href: string): boolean => {
  return /^https?:\/\//.test(href);
};

// Component rendering logic
const ActionButton = ({ action, customColors, isSecondary }: ActionProps) => {
  const IconComponent = resolveIcon(action.icon);
  const isExternal = isExternalUrl(action.href);

  const buttonProps = {
    variant: action.variant || (isSecondary ? "outline" : "default"),
    size: action.size || "hero",
    target: action.target,
    rel: action.target === "_blank" ? "noopener noreferrer" : action.rel,
    style: customColors
      ? {
          backgroundColor: customColors.background,
          color: customColors.foreground,
        }
      : undefined,
  };

  if (isExternal) {
    return (
      <a href={action.href} {...buttonProps}>
        {IconComponent && <IconComponent />}
        {action.label}
      </a>
    );
  }

  return (
    <Link href={action.href} {...buttonProps}>
      {IconComponent && <IconComponent />}
      {action.label}
    </Link>
  );
};
```

**5. Responsive Layout**

```tsx
// Mobile-first responsive design
<div
  className={cn(
    "flex flex-col sm:flex-row gap-4 sm:gap-6",
    align === "center" ? "items-center justify-center" : "items-start",
    spacingClasses[spacing || "md"]
  )}
>
  <ActionButton action={action} customColors={colors} />
  {secondary && (
    <ActionButton action={secondary} customColors={colors} isSecondary />
  )}
</div>
```

**6. Spacing Token Mapping**

```tsx
const spacingClasses = {
  none: "",
  sm: "my-4",
  md: "my-8",
  lg: "my-12",
  xl: "my-16",
} as const;
```

**7. Color Validation**

```tsx
const validateColor = (color: string): boolean => {
  return /^(#[0-9a-fA-F]{3,8}|rgb|hsl|var\(--[\w-]+\)|[\w-]+)$/.test(color);
};

const sanitizeColors = (colors?: CTAConfig["colors"]) => {
  if (!colors) return undefined;

  return {
    background:
      colors.background && validateColor(colors.background)
        ? colors.background
        : undefined,
    foreground:
      colors.foreground && validateColor(colors.foreground)
        ? colors.foreground
        : undefined,
  };
};
```

### Testing Strategy

**Unit Tests:**

1. Type guard validation (`isCTAConfig`)
2. Icon resolution (valid/invalid icon names)
3. URL detection (internal vs external)
4. Color validation (safe vs malicious values)
5. Spacing class mapping
6. Button variant enforcement (secondary auto-downgrade)

**Integration Tests:**

1. Server-side rendering without hydration errors
2. Responsive layout behavior
3. Dark mode compatibility
4. Accessibility (focus, contrast)

**Manual QA:**

1. Test with various icon names
2. Verify external link `_blank` behavior
3. Check mobile responsive stacking
4. Validate custom color overrides

### Risk Mitigation

**Button Hero Size Impact:**

- Audit existing Button usages: `grep -r "size=" src/`
- Ensure no hardcoded assumptions about Button sizes
- Test all existing button implementations

**Icon Import Performance:**

- Use dynamic imports to avoid bundling all Lucide icons
- Graceful fallback for missing icons with dev warnings

**Custom Color Security:**

- Strict regex validation prevents CSS injection
- Fallback to theme defaults on validation failure

### Definition of Done Checklist

- [ ] Button `hero` size added without breaking existing usage
- [ ] CTABlock component server-rendered correctly
- [ ] Icon resolution works with common Lucide icons (Download, LogIn, ExternalLink)
- [ ] Internal links use Next.js Link, external use anchor tags
- [ ] Mobile responsive stacking verified
- [ ] Custom colors validated and applied safely
- [ ] Type guard and validation functions tested
- [ ] Added to ContentBlock registry and type unions
- [ ] Documentation updated (FEATURES.md)
- [ ] QA run (`make qa`) passes clean

### Next Steps

execute task (k3)

```

```
