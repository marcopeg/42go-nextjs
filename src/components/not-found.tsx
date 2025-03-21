'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCachedSession } from '@/lib/auth/use-cached-session';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Search, X, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NotFoundProps {
  title?: string;
  message?: string;
  fullPage?: boolean;
}

export function NotFound({
  title = 'Page not found',
  message = "Sorry, we couldn't find the page you're looking for.",
  fullPage = true,
}: NotFoundProps) {
  const { status } = useCachedSession();
  const pathname = usePathname();
  const [isHovering, setIsHovering] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  // Check if we're in the app section
  const isAppPath = pathname?.startsWith('/app');

  // Determine where the primary button should go
  const primaryDestination = status === 'authenticated' && isAppPath ? '/app/dashboard' : '/';
  const showSecondaryButton = status === 'authenticated' && !isAppPath;

  // Animation keyframes
  const shakeKeyframes = [0, -5, 5, -5, 5, -3, 3, -2, 2, 0];
  const shakeTimes = [0, 0.1, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1];

  // Stronger shake for click animation
  const clickShakeKeyframes = [0, -8, 8, -8, 8, -5, 5, -3, 3, 0];

  // Generate question marks with random positions
  const questionMarks = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    size: Math.random() * 0.4 + 0.6, // Size between 0.6 and 1
    x: Math.random() * 300 - 150, // Position between -150 and 150
    y: Math.random() * 200 - 100, // Position between -100 and 100
    delay: Math.random() * 3, // Random delay up to 3 seconds
    duration: Math.random() * 5 + 10, // Animation duration between 10-15 seconds
    direction: Math.random() > 0.5 ? 1 : -1, // Random direction
  }));

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-4',
        fullPage ? 'min-h-[calc(100vh-8rem)]' : 'min-h-[50vh]'
      )}
    >
      <motion.div
        className="relative flex flex-col items-center"
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
        {/* Floating question marks */}
        {questionMarks.map(qm => (
          <motion.div
            key={qm.id}
            className="absolute text-muted-foreground/20 pointer-events-none"
            style={{
              x: qm.x,
              y: qm.y,
              scale: qm.size,
            }}
            animate={{
              y: [qm.y, qm.y - 40 * qm.direction, qm.y],
              x: [qm.x, qm.x + 30 * qm.direction, qm.x],
              rotate: [0, 20 * qm.direction, 0],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: qm.duration,
              delay: qm.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <HelpCircle className="w-8 h-8" />
          </motion.div>
        ))}

        {/* Decorative 404 */}
        <motion.div
          className="mb-4 relative flex items-center justify-center"
          initial={{ rotateZ: 0 }}
          animate={
            isClicked
              ? {
                  rotateZ: clickShakeKeyframes,
                  transition: {
                    duration: 0.4,
                    times: shakeTimes,
                    ease: 'easeInOut',
                  },
                }
              : isHovering
                ? {
                    rotateZ: shakeKeyframes,
                    transition: {
                      duration: 0.5,
                      times: shakeTimes,
                      ease: 'easeInOut',
                    },
                  }
                : {
                    rotateZ: shakeKeyframes,
                    transition: {
                      duration: 0.8,
                      times: shakeTimes,
                      delay: 0.8,
                      repeat: 0,
                      ease: 'easeInOut',
                    },
                  }
          }
        >
          <div className="flex items-center justify-center gap-2">
            {[4, 0, 4].map((num, i) => (
              <motion.div
                key={i}
                className="text-8xl font-extrabold text-primary/20 relative"
                custom={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: i * 0.2,
                  duration: 0.6,
                  type: 'spring',
                }}
              >
                {num}
              </motion.div>
            ))}
          </div>

          {/* Center search icon with slash */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.7,
              type: 'spring',
              bounce: 0.5,
            }}
          >
            <div className="relative">
              <Search className="h-16 w-16 text-primary" />
              <motion.div
                className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center"
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: -45, opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.3 }}
              >
                <X className="h-20 w-20 text-destructive/70" />
              </motion.div>
            </div>
          </motion.div>

          {/* Bell rings animation that appears when hovering or clicking */}
          {(isHovering || isClicked) && (
            <>
              <motion.div
                className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-primary/20"
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
                className="absolute -bottom-3 -left-3 w-8 h-8 rounded-full bg-primary/10"
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
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-primary/10"
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

        <motion.h1
          className="text-2xl font-bold text-foreground mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {title}
        </motion.h1>

        <motion.p
          className="text-muted-foreground mb-8 max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {message}
        </motion.p>

        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href={primaryDestination}>
              <Button
                variant="default"
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {status === 'authenticated' && isAppPath ? 'Go to Dashboard' : 'Go to Homepage'}
              </Button>
            </Link>
          </motion.div>

          {showSecondaryButton && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/app/dashboard">
                <Button variant="outline" size="lg">
                  Go to Dashboard
                </Button>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
