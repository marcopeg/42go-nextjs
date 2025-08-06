# Import Pricing Block [abs]

This story is about implementing a new _ContentBlock_ called "PricingBlock" that is supposed to show the classic 3 tiers pricing with feature list and call to actions.

This feature was produced in a legacy project and this story has that source code attached as source of inspiration for the resulting UI/UX.

NOTE: add this block to the server available blocks

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

## Implementation Guidelines

Take into account the following facts:

- `@/42go/components/Markdown` should be used to render markdown
- this is implemented as _ContentBlock_ so there is no need to access the app's config but all the properties are explicitly passed down as follow

```json
{
    "type": "pricing",
    "tiers": [{
        "name": "basic",
        ...
    }]
}
```
