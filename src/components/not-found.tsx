'use client';

import { useRouter } from 'next/navigation';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface NotFoundProps {
  title?: string;
  message?: string;
}

export function NotFound({
  title = 'Page Not Found',
  message = 'The page you are looking for does not exist or has been moved.',
}: NotFoundProps) {
  const router = useRouter();
  const [isHovering, setIsHovering] = useState(false);
  const { status } = useSession();
  const [isClient, setIsClient] = useState(false);

  // Use useEffect to handle client-side-only code
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only determine redirect path and button text on the client
  const isAuthenticated = isClient ? status === 'authenticated' : false;
  const redirectPath = isAuthenticated ? '/app/dashboard' : '/';
  const buttonText = isAuthenticated ? 'Go to Dashboard' : 'Go to Home Page';

  // Shake keyframes - used for both load and hover animations
  const shakeKeyframes = [0, -5, 5, -5, 5, -3, 3, -2, 2, 0];
  const shakeTimes = [0, 0.1, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1];
  const titleShakeKeyframes = [0, -2, 2, -2, 2, -1, 1, -1, 1, 0];

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4"
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.7,
        type: 'spring',
        bounce: 0.4,
        delay: 0.2,
      }}
    >
      <motion.div
        className="mb-6 text-blue-500 dark:text-blue-400 relative"
        onHoverStart={() => setIsHovering(true)}
        onHoverEnd={() => setIsHovering(false)}
        initial={{ rotateZ: 0 }}
        animate={
          isHovering
            ? {
                rotateZ: shakeKeyframes,
                transition: {
                  duration: 0.5,
                  times: shakeTimes,
                },
              }
            : {
                rotateZ: shakeKeyframes,
                transition: {
                  duration: 0.8,
                  times: shakeTimes,
                  delay: 1.0,
                  repeat: 0,
                },
              }
        }
      >
        <motion.div
          initial={{ scale: 1 }}
          animate={
            isHovering
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
          <FileQuestion className="h-16 w-16 mx-auto mb-4" />
        </motion.div>
        <motion.h2
          className="text-2xl font-bold"
          initial={{ rotateZ: 0 }}
          animate={
            isHovering
              ? {
                  rotateZ: titleShakeKeyframes,
                  transition: {
                    duration: 0.5,
                    times: shakeTimes,
                  },
                }
              : {
                  rotateZ: titleShakeKeyframes,
                  transition: {
                    duration: 0.8,
                    times: shakeTimes,
                    delay: 1.0,
                    repeat: 0,
                  },
                }
          }
        >
          {title}
        </motion.h2>

        {/* Question mark floating animations that appear when hovering */}
        {isHovering && (
          <>
            <motion.div
              className="absolute -top-2 -right-2 text-blue-400/70 text-lg font-bold"
              initial={{ scale: 0, opacity: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                y: [-5, -15],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: 'loop',
              }}
            >
              ?
            </motion.div>
            <motion.div
              className="absolute bottom-0 -left-2 text-blue-400/60 text-xl font-bold"
              initial={{ scale: 0, opacity: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                y: [5, -10],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                repeatType: 'loop',
                delay: 0.4,
              }}
            >
              ?
            </motion.div>
            <motion.div
              className="absolute top-1/3 right-0 text-blue-400/50 text-sm font-bold"
              initial={{ scale: 0, opacity: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                y: [0, -8],
              }}
              transition={{
                duration: 1.3,
                repeat: Infinity,
                repeatType: 'loop',
                delay: 0.8,
              }}
            >
              ?
            </motion.div>
          </>
        )}

        {/* Initial ripple effect when component loads */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-blue-500/10"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 2, 0],
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 1.5,
            delay: 1.0,
            repeat: 0,
          }}
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
          onClick={() => router.push(redirectPath)}
          variant="default"
          size="lg"
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {buttonText}
        </Button>
      </motion.div>
    </motion.div>
  );
}
