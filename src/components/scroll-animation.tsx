'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { UIAnimation } from '@/components/ui-animation';

interface ScrollAnimationProps {
  children: ReactNode;
  type?: 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce';
  direction?: 'up' | 'down' | 'left' | 'right';
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
