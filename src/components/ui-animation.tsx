'use client';

import { motion, useReducedMotion, TargetAndTransition, VariantLabels } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';

type AnimationType = 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce';
type AnimationDirection = 'up' | 'down' | 'left' | 'right';

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
  type = 'fade',
  direction = 'up',
  delay = 0,
  duration = 0.3,
  className = '',
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
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Skip animations if reduced motion is preferred or on mobile if disabled
  const shouldReduceMotion = prefersReducedMotion || (isMobile && disableOnMobile);

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
      case 'fade':
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        };
      case 'slide':
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
      case 'scale':
        const scaleValue = 0.8 + 0.2 * (1 - intensity);
        return {
          hidden: { opacity: 0, scale: scaleValue },
          visible: { opacity: 1, scale: 1 },
        };
      case 'rotate':
        const rotateValue = -10 * intensity;
        return {
          hidden: { opacity: 0, rotate: rotateValue },
          visible: { opacity: 1, rotate: 0 },
        };
      case 'bounce':
        return {
          hidden: { opacity: 0, y: 20 * intensity },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              type: 'spring',
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

  const getHoverAnimation = (): TargetAndTransition | VariantLabels | undefined => {
    if (!whileHover || shouldReduceMotion) return undefined;

    // Reduce intensity on mobile
    const intensity = isMobile ? 0.7 : 1;

    switch (type) {
      case 'scale':
        return { scale: 1 + 0.05 * intensity };
      case 'rotate':
        return { rotate: 2 * intensity };
      case 'bounce':
        return { y: -5 * intensity };
      default:
        return { scale: 1 + 0.02 * intensity };
    }
  };

  const getTapAnimation = (): TargetAndTransition | VariantLabels | undefined => {
    if (!whileTap || shouldReduceMotion) return undefined;

    // Reduce intensity on mobile
    const intensity = isMobile ? 0.7 : 1;

    switch (type) {
      case 'scale':
        return { scale: 1 - 0.05 * intensity };
      case 'rotate':
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
