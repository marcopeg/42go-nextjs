"use client";

import { cn } from "@/42go/utils/utils";
import { useEffect, useRef, useState } from "react";

interface ScrollAnimationProps {
  children: React.ReactNode;
  type?: "fade" | "scale" | "slideUp";
  delay?: number;
  className?: string;
}

export function ScrollAnimation({
  children,
  type = "fade",
  delay = 0,
  className,
}: ScrollAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentElement = elementRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Apply delay before showing animation
            setTimeout(() => {
              setIsVisible(true);
            }, delay * 1000);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [delay]);

  const getAnimationClasses = () => {
    const baseClasses = "transition-all duration-700 ease-out";

    if (!isVisible) {
      switch (type) {
        case "fade":
          return `${baseClasses} opacity-0 translate-y-4`;
        case "scale":
          return `${baseClasses} opacity-0 scale-95`;
        case "slideUp":
          return `${baseClasses} opacity-0 translate-y-8`;
        default:
          return `${baseClasses} opacity-0`;
      }
    }

    return `${baseClasses} opacity-100 translate-y-0 scale-100`;
  };

  return (
    <div ref={elementRef} className={cn(getAnimationClasses(), className)}>
      {children}
    </div>
  );
}
