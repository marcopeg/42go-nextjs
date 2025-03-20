'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Mail, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
};

const MotionCard = motion(Card);

const SparkleEffect = ({ color = 'var(--accent)' }) => {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: color,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          initial={{
            scale: 0,
            opacity: 0,
            x: 0,
            y: 0,
          }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
            x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 50],
            y: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 50],
          }}
          transition={{
            duration: 1.5,
            delay: Math.random() * 0.3,
            repeat: Infinity,
            repeatType: 'loop',
            repeatDelay: Math.random() * 0.5,
          }}
        />
      ))}
    </motion.div>
  );
};

export function UsersList() {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsersList(data.users);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  // Get initials from name or email
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }

    return email.substring(0, 2).toUpperCase();
  };

  // Format the join date in a human-readable format
  const formatJoinDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Format date in European format
  const formatEuropeanDate = (date: Date) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm');
  };

  // Animation variants
  const cardVariants: Variants = {
    initial: {
      scale: 1,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      backgroundColor: 'var(--card)',
      rotateY: 0,
    },
    hover: {
      scale: 1.05,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      backgroundColor: 'var(--accent-foreground)',
      color: 'var(--accent)',
      rotateY: [0, -5, 5, 0],
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 15,
        rotateY: {
          duration: 0.6,
          ease: 'easeInOut',
          times: [0, 0.33, 0.66, 1],
        },
      },
    },
  };

  const contentVariants: Variants = {
    initial: { y: 0, opacity: 1 },
    hover: {
      y: -5,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  const avatarVariants: Variants = {
    initial: { scale: 1, rotate: 0 },
    hover: {
      scale: 1.3,
      rotate: [0, -15, 15, -15, 15, 0],
      transition: {
        rotate: {
          duration: 0.8,
          ease: 'easeInOut',
          times: [0, 0.2, 0.4, 0.6, 0.8, 1],
        },
        scale: {
          duration: 0.4,
          type: 'spring',
          stiffness: 300,
        },
      },
    },
  };

  const iconVariants: Variants = {
    initial: { scale: 1, rotate: 0 },
    hover: {
      scale: [1, 1.5, 1],
      rotate: 360,
      transition: {
        duration: 1.2,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'loop',
      },
    },
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  if (usersList.length === 0) {
    return <div className="text-center py-8">No users found.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {usersList.map(user => (
        <MotionCard
          key={user.id}
          className="overflow-hidden relative"
          initial="initial"
          whileHover="hover"
          variants={cardVariants}
          onHoverStart={() => setHoveredCard(user.id)}
          onHoverEnd={() => setHoveredCard(null)}
          layout
        >
          <AnimatePresence>{hoveredCard === user.id && <SparkleEffect />}</AnimatePresence>

          <motion.div variants={contentVariants} className="relative z-10">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <motion.div variants={avatarVariants}>
                  <Avatar className="h-12 w-12 border border-border">
                    {user.image ? (
                      <AvatarImage src={user.image} alt={user.name || user.email} />
                    ) : (
                      <AvatarFallback className="bg-primary/10">
                        {getInitials(user.name, user.email)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium truncate mr-2">
                      {user.name || 'Unnamed User'}
                    </h3>
                    <motion.div variants={iconVariants} className="text-accent">
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                  </div>
                  <a
                    href={`mailto:${user.email}`}
                    className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                  >
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{user.email}</span>
                  </a>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="mt-3 text-xs text-muted-foreground">
                          {formatJoinDate(user.createdAt)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p>Joined on {formatEuropeanDate(user.createdAt)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </motion.div>
        </MotionCard>
      ))}
    </div>
  );
}
