# Import Pricing Block [abs]

This story is about implementing a new _ContentBlock_ called "PricingBlock" that is supposed to show the classic 3 tiers pricing with feature list and call to actions.

This feature was produced in a legacy project and this story has that source code attached as source of inspiration for the resulting UI/UX.

NOTE: add this block to the server available blocks

## Goals

- [ ] Create PricingBlock component following ContentBlock pattern
- [ ] Implement responsive pricing table with 3-tier layout (but it's a dynamic array, could be 1, 2, 3 - let's say min 1, max 3)
- [ ] Add feature icons (Check, X, Clock) from Lucide React
- [ ] Support highlighted/recommended tier with visual emphasis
- [ ] Use existing ScrollAnimation component for animations
- [ ] Add markdown support for tier descriptions using Markdown component
- [ ] Integrate with existing UI components (Button, Card)
- [ ] Add PricingBlock to server ContentBlock exports

## Acceptance Criteria

- [ ] PricingBlock component created in `/src/42go/components/ContentBlock/blocks/PricingBlock.tsx`
- [ ] Component follows existing ContentBlock interface pattern with TPricingBlock type
- [ ] Responsive design works on mobile, tablet, and desktop
- [ ] Feature status icons render correctly (included/excluded/coming-soon)
- [ ] Highlighted tier shows visual emphasis with scale and shadow
- [ ] Badge support for "Most Popular" or similar labels
- [ ] CTA buttons work with proper routing
- [ ] Markdown rendering for tier names and descriptions
- [ ] ScrollAnimation integration for smooth reveal effects
- [ ] Component added to server ContentBlock blocksMap
- [ ] Proper TypeScript types exported

## Legacy Code for inspiration

**pricing-wall.tsx**

```ts
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollAnimation } from "@/components/scroll-animation";
import { Check, X, Clock } from "lucide-react";
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

interface PricingTierProps {
  tier: {
    name: string;
    price: string;
    period: string;
    description: string;
    features: {
      text: string;
      status: string;
    }[];
    cta: {
      label: string;
      href: string;
    };
    highlighted?: boolean;
    badge?: string;
  };
  delay: number;
}

function PricingTier({ tier, delay }: PricingTierProps) {
  const getFeatureIcon = (status: string) => {
    switch (status) {
      case "included":
        return <Check className="h-4 w-4 text-green-500" />;
      case "excluded":
        return <X className="h-4 w-4 text-red-500" />;
      case "coming-soon":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <ScrollAnimation type="slide" direction="up" delay={delay} duration={0.6}>
      <Card
        className={`h-full ${
          tier.highlighted ? "border-accent shadow-lg scale-105" : ""
        }`}
      >
        {tier.badge && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
              {tier.badge}
            </span>
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-2xl">{tier.name}</CardTitle>
          <div className="flex items-baseline mt-4">
            <span className="text-4xl font-bold">{tier.price}</span>
            <span className="text-muted-foreground ml-1">{tier.period}</span>
          </div>
          <CardDescription className="mt-2">{tier.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {tier.features.map((feature, i) => (
              <li key={i} className="flex items-start">
                <span className="mr-2 mt-1">
                  {getFeatureIcon(feature.status)}
                </span>
                <span
                  className={
                    feature.status === "excluded"
                      ? "text-muted-foreground line-through"
                      : ""
                  }
                >
                  {feature.text}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Link href={tier.cta.href} className="w-full">
            <Button
              className={`w-full ${
                tier.highlighted
                  ? "bg-accent text-accent-foreground hover:bg-accent/90"
                  : ""
              }`}
            >
              {tier.cta.label}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </ScrollAnimation>
  );
}

export function PricingWall() {
  return (
    <section className="py-16">
      <ScrollAnimation
        type="slide"
        direction="down"
        delay={0.05}
        duration={0.6}
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">
            {renderMarkdown(appConfig.landing?.pricing?.title || "")}
          </h2>
          <ScrollAnimation type="fade" delay={0.2} duration={0.5}>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {renderMarkdown(appConfig.landing?.pricing?.subtitle || "")}
            </p>
          </ScrollAnimation>
        </div>
      </ScrollAnimation>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {appConfig.landing?.pricing?.tiers?.map((tier, index) => (
          <PricingTier key={index} tier={tier} delay={0.1 * (index + 1)} />
        ))}
      </div>
    </section>
  );
}
```

**scroll-animation.tsx**

```ts
"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { UIAnimation } from "@/components/ui-animation";

interface ScrollAnimationProps {
  children: ReactNode;
  type?: "fade" | "slide" | "scale" | "rotate" | "bounce";
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
  whileHover?: boolean;
  whileTap?: boolean;
  disableOnMobile?: boolean;
  threshold?: number;
}

export function ScrollAnimation({
  children,
  threshold = 0.1,
  ...animationProps
}: ScrollAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = ref.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, no need to observe anymore
          if (currentRef) {
            observer.unobserve(currentRef);
          }
        }
      },
      {
        threshold,
      }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return (
    <div ref={ref} className="min-h-[1px]">
      {isVisible && <UIAnimation {...animationProps}>{children}</UIAnimation>}
    </div>
  );
}
```

**ui-animation.tsx**

````ts
"use client";

import {
  motion,
  useReducedMotion,
  TargetAndTransition,
  VariantLabels,
} from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

type AnimationType = "fade" | "slide" | "scale" | "rotate" | "bounce";
type AnimationDirection = "up" | "down" | "left" | "right";

interface UIAnimationProps {
  children: ReactNode;
  type?: AnimationType;
  direction?: AnimationDirection;
  delay?: number;
  duration?: number;
  className?: string;
  whileHover?: boolean;
  whileTap?: boolean;
  disableOnMobile?: boolean;
}

/**
 * UIAnimation component for adding microinteractions to UI elements
 * Optimized for both mobile and desktop with reduced motion support
 *
 * @example
 * ```tsx
 * <UIAnimation type="fade" delay={0.2}>
 *   <Button>Animated Button</Button>
 * </UIAnimation>
 * ```
 */
export function UIAnimation({
  children,
  type = "fade",
  direction = "up",
  delay = 0,
  duration = 0.3,
  className = "",
  whileHover = false,
  whileTap = false,
  disableOnMobile = false,
}: UIAnimationProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on a mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Skip animations if reduced motion is preferred or on mobile if disabled
  const shouldReduceMotion =
    prefersReducedMotion || (isMobile && disableOnMobile);

  const getAnimationVariants = () => {
    // Minimal animation for reduced motion
    if (shouldReduceMotion) {
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      };
    }

    // Adjust animation intensity for mobile
    const intensity = isMobile ? 0.7 : 1;

    switch (type) {
      case "fade":
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        };
      case "slide":
        const offset = 20 * intensity;
        const directionOffset = {
          up: { y: offset },
          down: { y: -offset },
          left: { x: offset },
          right: { x: -offset },
        };
        return {
          hidden: { opacity: 0, ...directionOffset[direction] },
          visible: { opacity: 1, x: 0, y: 0 },
        };
      case "scale":
        const scaleValue = 0.8 + 0.2 * (1 - intensity);
        return {
          hidden: { opacity: 0, scale: scaleValue },
          visible: { opacity: 1, scale: 1 },
        };
      case "rotate":
        const rotateValue = -10 * intensity;
        return {
          hidden: { opacity: 0, rotate: rotateValue },
          visible: { opacity: 1, rotate: 0 },
        };
      case "bounce":
        return {
          hidden: { opacity: 0, y: 20 * intensity },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              type: "spring",
              stiffness: 300 * intensity,
              damping: 15,
            },
          },
        };
      default:
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        };
    }
  };

  const getHoverAnimation = ():
    | TargetAndTransition
    | VariantLabels
    | undefined => {
    if (!whileHover || shouldReduceMotion) return undefined;

    // Reduce intensity on mobile
    const intensity = isMobile ? 0.7 : 1;

    switch (type) {
      case "scale":
        return { scale: 1 + 0.05 * intensity };
      case "rotate":
        return { rotate: 2 * intensity };
      case "bounce":
        return { y: -5 * intensity };
      default:
        return { scale: 1 + 0.02 * intensity };
    }
  };

  const getTapAnimation = ():
    | TargetAndTransition
    | VariantLabels
    | undefined => {
    if (!whileTap || shouldReduceMotion) return undefined;

    // Reduce intensity on mobile
    const intensity = isMobile ? 0.7 : 1;

    switch (type) {
      case "scale":
        return { scale: 1 - 0.05 * intensity };
      case "rotate":
        return { rotate: -2 * intensity };
      default:
        return { scale: 1 - 0.02 * intensity };
    }
  };

  // Adjust duration based on device
  const adjustedDuration = isMobile ? duration * 0.8 : duration;

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={getAnimationVariants()}
      transition={{ duration: adjustedDuration, delay }}
      whileHover={getHoverAnimation()}
      whileTap={getTapAnimation()}
    >
      {children}
    </motion.div>
  );
}
````

## Development Plan

### Current Analysis

The ContentBlock system has both server and client implementations:

- Server ContentBlock supports: HeroBlock, DemoBlock, MarkdownBlock, ComponentBlock, LinkBlock
- Client ContentBlock supports: ComponentBlock, LinkBlock

PricingBlock should be added to the **server** ContentBlock since it needs full markdown rendering and complex layout that benefits from SSR.

### Implementation Strategy

1. **Create PricingBlock Component**

   - Follow existing ContentBlock pattern from HeroBlock
   - Use ScrollAnimation for progressive reveal
   - Implement responsive CSS Grid layout (1 col mobile, 3 cols desktop)
   - Support feature status icons from Lucide React

2. **Data Structure Design**

   ```typescript
   interface TPricingBlock {
     type: "pricing";
     title?: string;
     subtitle?: string;
     tiers: Array<{
       name: string;
       price: string;
       period: string;
       description: string;
       features: Array<{
         text: string;
         status: "included" | "excluded" | "coming-soon";
       }>;
       cta: {
         label: string;
         href: string;
       };
       highlighted?: boolean;
       badge?: string;
     }>;
   }
   ```

3. **Dependencies Clarification**

   - **No new dependencies needed**: Uses existing ScrollAnimation, Button, Lucide icons
   - **Follows existing patterns**: ReactMarkdown (like HeroBlock), Tailwind classes (like other blocks)
   - **Maintains consistency**: Server-side rendering, TypeScript interfaces, component structure

4. **UI Components Integration**
   - Use existing Button component for CTAs
   - Leverage ScrollAnimation for staggered reveals
   - Use Markdown component for text rendering
   - Apply existing Card-like styling with Tailwind classes

### Files to Create/Modify

**Create:**

- `/src/42go/components/ContentBlock/blocks/PricingBlock.tsx` - Main component

**Modify:**

- `/src/42go/components/ContentBlock/server.tsx` - Add PricingBlock to blocksMap
- `/src/42go/components/ContentBlock/server.tsx` - Add TPricingBlock to ContentBlockItem type

### Architecture Decisions

1. **Server-Side Rendering**: PricingBlock will be server-only for optimal SEO and performance
2. **Markdown Integration**: Use `@/42go/components/Markdown` for consistency (same pattern for all blocks)
3. **Animation Strategy**: Use existing ScrollAnimation component with staggered delays (0.1s intervals) for maximum visual impact
4. **Responsive Design**: Dynamic CSS Grid `grid-cols-1 md:grid-cols-${Math.min(tiers.length, 3)}` for optimal content adaptation
5. **Icon Strategy**: Use Lucide React icons (Check, X, Clock) with semantic colors (green/red/yellow)
6. **Typography**: Follow existing patterns from HeroBlock for consistency
7. **Styling**: Use direct Tailwind classes (no Card component) following existing block patterns
8. **Visual Hierarchy**: Highlighted tier with `scale-105` and absolute positioned badges for maximum impact

### Implementation Decisions

- **No framer-motion dependency**: Stick with existing ScrollAnimation for consistency and maintainability
- **No shadcn Card components**: Use Tailwind classes like other blocks for pattern consistency
- **Dynamic Grid**: `grid-cols-1 md:grid-cols-${Math.min(tiers.length, 3)}` adapts to content (1-3 tiers)
- **Feature Icons**: Green Check, Red X, Yellow Clock for included/excluded/coming-soon status
- **Markdown Components**: Use `@/42go/components/Markdown` for consistency across all blocks
- **Animation Timing**: Staggered delays (0.1s intervals) for maximum visual impact

### Related Improvements

**Future Task**: Update HeroBlock to use `@/42go/components/Markdown` instead of ReactMarkdown for consistency

### Testing & Integration

**Implementation Target**: Add PricingBlock to the default app's home page to demonstrate the component in action and validate the implementation.

## Issues Encountered

- **Hydration Error: Nested <p> tags**

  - Problem: Using <Markdown> inside a <p> wrapper caused <p> inside <p> (invalid HTML), leading to React hydration errors.
  - Solution: Replaced the <p> wrapper with a <div> to avoid nested paragraphs. Now <Markdown> renders block content safely.

- **Deprecated `legacyBehavior` and `passHref` in <Link>**
  - Problem: Next.js warned about deprecated usage of `legacyBehavior` and `passHref` props on <Link>.
  - Solution: Removed both props and used the modern <Link> API. Button is now a direct child of <Link>.

## Progress

- PricingBlock component created and follows ContentBlock pattern.
- Responsive grid, feature icons, highlight, badge, and markdown support implemented.
- Integrated with Button, ScrollAnimation, and Markdown components.
- Added to server ContentBlock exports and types.
- Added demo config to home page for validation.
- All hydration and deprecation errors resolved.

## Implementation Notes

- The block is server-only for SSR and SEO.
- Uses Tailwind for layout and styling, no Card component for consistency with other blocks.
- Animation and icon strategies follow project conventions.
- Markdown is used for all text fields that may require formatting.

## Status

- [x] Implementation complete
- [x] All known issues resolved
- [ ] Awaiting user review/QA
