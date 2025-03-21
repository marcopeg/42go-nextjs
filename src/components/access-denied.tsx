'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  /**
   * When true, component takes over the entire content area and adds extra padding/height
   */
  fullPage?: boolean;
}

export function AccessDenied({
  title = 'Access Denied',
  message = 'You do not have permission to access this resource.',
  fullPage = false,
}: AccessDeniedProps) {
  const router = useRouter();
  const [isHovering, setIsHovering] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  // Animation keyframes
  const bellShakeKeyframes = [0, -5, 5, -5, 5, -3, 3, -2, 2, 0];
  const bellShakeTimes = [0, 0.1, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1];
  const titleShakeKeyframes = [0, -3, 3, -3, 3, -2, 2, -1, 1, 0];

  // Stronger shake for click animation
  const clickShakeKeyframes = [0, -8, 8, -8, 8, -5, 5, -3, 3, 0];

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center text-center px-4',
        fullPage ? 'min-h-[calc(100vh-8rem)]' : 'min-h-[50vh]'
      )}
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.7,
        type: 'spring',
        bounce: 0.4,
        delay: 0.2,
      }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      onTapStart={() => setIsClicked(true)}
      onTap={() => {
        // Reset click state after animation completes
        setTimeout(() => setIsClicked(false), 500);
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="mb-6 text-destructive relative"
        initial={{ rotateZ: 0 }}
        animate={
          isClicked
            ? {
                rotateZ: clickShakeKeyframes,
                transition: {
                  duration: 0.4,
                  times: bellShakeTimes,
                },
              }
            : isHovering
              ? {
                  rotateZ: bellShakeKeyframes,
                  transition: {
                    duration: 0.5,
                    times: bellShakeTimes,
                  },
                }
              : {
                  rotateZ: bellShakeKeyframes,
                  transition: {
                    duration: 0.8,
                    times: bellShakeTimes,
                    delay: 1.0,
                    repeat: 0,
                  },
                }
        }
      >
        <motion.div
          initial={{ scale: 1 }}
          animate={
            isClicked
              ? {
                  scale: [1, 1.2, 1],
                  transition: { duration: 0.4, times: [0, 0.5, 1] },
                }
              : isHovering
                ? {
                    scale: [1, 1.1, 1],
                    transition: { duration: 0.5, repeat: Infinity, repeatType: 'reverse' },
                  }
                : {
                    scale: [1, 1.15, 1],
                    transition: {
                      duration: 0.8,
                      delay: 1.0,
                      times: [0, 0.5, 1],
                      repeat: 0,
                    },
                  }
          }
        >
          <AlertTriangle className="h-16 w-16 mx-auto mb-4" />
        </motion.div>
        <motion.h2
          className="text-2xl font-bold"
          initial={{ rotateZ: 0 }}
          animate={
            isClicked
              ? {
                  rotateZ: clickShakeKeyframes,
                  transition: {
                    duration: 0.4,
                    times: bellShakeTimes,
                  },
                }
              : isHovering
                ? {
                    rotateZ: titleShakeKeyframes,
                    transition: {
                      duration: 0.5,
                      times: bellShakeTimes,
                    },
                  }
                : {
                    rotateZ: titleShakeKeyframes,
                    transition: {
                      duration: 0.8,
                      times: bellShakeTimes,
                      delay: 1.0,
                      repeat: 0,
                    },
                  }
          }
        >
          {title}
        </motion.h2>

        {/* Bell rings animation that appears when hovering or clicking */}
        {(isHovering || isClicked) && (
          <>
            <motion.div
              className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-destructive/20"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 0.7, 0],
              }}
              transition={{
                duration: isClicked ? 0.7 : 1,
                repeat: 2,
                repeatType: 'loop',
              }}
            />
            <motion.div
              className="absolute -bottom-3 -left-3 w-8 h-8 rounded-full bg-destructive/10"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.8, 0],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: isClicked ? 0.9 : 1.2,
                repeat: 2,
                repeatType: 'loop',
                delay: 0.3,
              }}
            />
          </>
        )}

        {/* Initial ripple effect when component loads */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-destructive/10"
          initial={{ scale: 0, opacity: 0 }}
          animate={
            isClicked
              ? {
                  scale: [0, 2.5, 0],
                  opacity: [0, 0.4, 0],
                  transition: {
                    duration: 0.8,
                    repeat: 0,
                  },
                }
              : {
                  scale: [0, 2, 0],
                  opacity: [0, 0.3, 0],
                  transition: {
                    duration: 1.5,
                    delay: 1.0,
                    repeat: 0,
                  },
                }
          }
        />
      </motion.div>

      <motion.p
        className="text-muted-foreground mb-8 max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {message}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => router.push('/app/dashboard')}
          variant="default"
          size="lg"
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Go to Dashboard
        </Button>
      </motion.div>
    </motion.div>
  );
}
