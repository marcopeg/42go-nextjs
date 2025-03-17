'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';

interface StaggeredAnimationProps {
  children: ReactNode[];
  staggerDelay?: number;
  initialDelay?: number;
  className?: string;
  childClassName?: string;
  type?: 'fade' | 'slide' | 'scale';
  direction?: 'up' | 'down' | 'left' | 'right';
  disableOnMobile?: boolean;
}

/**
 * StaggeredAnimation component for animating lists and grids with staggered timing
 * Optimized for both mobile and desktop with reduced motion support
 *
 * @example
 * ```tsx
 * <StaggeredAnimation staggerDelay={0.1}>
 *   {items.map(item => (
 *     <div key={item.id}>{item.name}</div>
 *   ))}
 * </StaggeredAnimation>
 * ```
 */
export function StaggeredAnimation({
  children,
  staggerDelay = 0.1,
  initialDelay = 0,
  className = '',
  childClassName = '',
  type = 'fade',
  direction = 'up',
  disableOnMobile = false,
}: StaggeredAnimationProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on a mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Skip animations if reduced motion is preferred or on mobile if disabled
  const shouldReduceMotion = prefersReducedMotion || (isMobile && disableOnMobile);

  // Adjust timing based on device
  const adjustedStaggerDelay = isMobile ? staggerDelay * 0.7 : staggerDelay;

  const getAnimationVariants = () => {
    // Minimal animation for reduced motion
    if (shouldReduceMotion) {
      return {
        container: {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              delayChildren: initialDelay,
              staggerChildren: adjustedStaggerDelay * 0.5,
            },
          },
        },
        item: {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration: 0.2 },
          },
        },
      };
    }

    // Adjust animation intensity for mobile
    const intensity = isMobile ? 0.7 : 1;

    const getInitialState = () => {
      switch (type) {
        case 'fade':
          return { opacity: 0 };
        case 'slide':
          const offset = 20 * intensity;
          switch (direction) {
            case 'up':
              return { opacity: 0, y: offset };
            case 'down':
              return { opacity: 0, y: -offset };
            case 'left':
              return { opacity: 0, x: offset };
            case 'right':
              return { opacity: 0, x: -offset };
            default:
              return { opacity: 0, y: offset };
          }
        case 'scale':
          return { opacity: 0, scale: 0.8 + 0.2 * (1 - intensity) };
        default:
          return { opacity: 0 };
      }
    };

    return {
      container: {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren: initialDelay,
            staggerChildren: adjustedStaggerDelay,
          },
        },
      },
      item: {
        hidden: getInitialState(),
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          transition: {
            type: type === 'scale' ? 'spring' : 'tween',
            stiffness: 260 * intensity,
            damping: 20,
            duration: isMobile ? 0.25 : 0.3,
          },
        },
      },
    };
  };

  const variants = getAnimationVariants();

  return (
    <motion.div
      className={className}
      variants={variants.container}
      initial="hidden"
      animate="visible"
    >
      {Array.isArray(children) &&
        children.map((child, index) => (
          <motion.div key={index} className={childClassName} variants={variants.item}>
            {child}
          </motion.div>
        ))}
    </motion.div>
  );
}
