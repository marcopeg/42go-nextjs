# Import Hero Block [abr]

Refactor and align the current Hero Block (`@/components/Page/content/HeroBlock`) so to match the functionalities and styles from the old project.

The HeroBlock should remain a dumb component where all the information are provided top down originating from the App's configuration.

You may need to modify the exported type to accomodate new data.

# Development Plan

The current HeroBlock is bare-bones. Need to transform it to match the old project's functionality while keeping it as a dumb component that receives all data from configuration.

## Key Requirements Analysis:

**From the old code (inspiration):**

1. **Markdown rendering**: Simple **bold** text to `<span className="text-accent">`
2. **ScrollAnimation**: Fade and scale animations with delays
3. **Action buttons**: Multiple buttons with `role` (primary/secondary) and different styling
4. **Layout**: Center-aligned, proper spacing, responsive design
5. **Link integration**: Uses Next.js Link with passHref pattern

**Current implementation gaps:**

- No markdown parsing
- No animation support
- No action buttons
- Basic styling only
- Missing responsive layout from old design

## Implementation Steps:

### 1. Update HeroBlock interface

- Add `actions` array property for CTA buttons
- Define action button structure (label, href, style)

### 2. Use ReactMarkdown for text rendering

- Install and integrate react-markdown library
- Apply markdown rendering to title and subtitle
- Configure for simple **bold** to accent color styling

### 3. Add action buttons section with CTA configuration

- Support multiple buttons with Link wrapping
- CTA structure: `{ label: string, href: string, style: "primary" | "secondary" }`
- Primary/secondary styling variants
- Responsive flex layout

### 4. Implement ScrollAnimation

- Research if it exists in current project
- If not, create a simple fade/scale animation wrapper
- Keep animations subtle and performant

### 5. Update styling

- Match old design: center layout, proper spacing
- Ensure responsive behavior (sm:flex-row)
- Use project's design tokens and accent colors

### 6. Test integration

- Verify with existing page configurations
- Check TypeScript compliance
- Ensure CMS type system compatibility

## Files to modify:

- `src/components/Page/content/HeroBlock/HeroBlock.tsx` - Main component
- `src/components/Page/types.ts` - Update HeroBlock interface export

# Next Steps

Task executed successfully (k3) - ready for completion documentation

# Progress

✅ **Enhanced HeroBlock Interface**: Added `actions` array with CTA structure:

- `label: string` - Button text
- `href: string` - Link destination
- `style: "primary" | "secondary"` - Button styling

✅ **ReactMarkdown Integration**:

- Installed react-markdown library
- Configured custom components for **bold** → accent color styling
- Applied to both title and subtitle text

✅ **Action Buttons Implementation**:

- Multiple CTA buttons with Next.js Link wrapping
- Uses Button component with `asChild` prop for semantic HTML (Link styled as Button)
- Primary style uses accent colors, secondary uses outline variant
- Responsive flex layout (column on mobile, row on desktop)
- Accessible and SEO-friendly structure with proper semantic HTML

✅ **Semantic HTML Optimization**:

- Fixed nested interactive elements issue
- Button component renders as Link when using `asChild` prop
- Clean `<a>` tags with button styling instead of `<a><button>` nesting
- Better for SEO, accessibility, and HTML validation

✅ **ScrollAnimation Component**:

- Created reusable scroll-triggered animation wrapper
- Supports fade, scale, and slideUp animations with configurable delays
- Matches old project's animation pattern (fade 0.1s, fade 0.2s, scale 0.3s)

✅ **Enhanced Layout & Styling**:

- Proper section-based layout with center alignment
- Background image support with overlay
- Responsive typography and spacing
- TypeScript compliance maintained

✅ **Configuration Testing**:

- Updated AppConfig with example markdown and action buttons
- Verified build compilation and type safety
- Tested multiple hero configurations

# Previous code - use for inspiration

**hero-section.tsx**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollAnimation } from "@/components/scroll-animation";
import appConfig from "../../../app.config";
import { ReactNode } from "react";

// Simple markdown parser for basic formatting
function renderMarkdown(text: string): ReactNode {
  // Replace **text** with <span className="text-accent">text</span>
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const content = part.slice(2, -2);
      return (
        <span key={i} className="text-accent">
          {content}
        </span>
      );
    }
    return part;
  });
}

export function HeroSection() {
  return (
    <section className="w-full py-20 md:py-32 flex flex-col items-center justify-center text-center">
      <ScrollAnimation type="fade" delay={0.1}>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 max-w-4xl">
          {renderMarkdown(appConfig.landing?.hero?.title || "")}
        </h1>
      </ScrollAnimation>

      <ScrollAnimation type="fade" delay={0.2}>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          {renderMarkdown(appConfig.landing?.hero?.subtitle || "")}
        </p>
      </ScrollAnimation>

      <ScrollAnimation type="scale" delay={0.3} whileHover whileTap>
        <div className="flex flex-col sm:flex-row gap-4">
          {appConfig.landing?.hero?.actions?.map((action, index) => (
            <Link key={index} href={action.href} passHref>
              <Button
                size="lg"
                variant={action.role === "primary" ? "default" : "outline"}
                className={
                  action.role === "primary"
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : ""
                }
              >
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollAnimation>
    </section>
  );
}
```
