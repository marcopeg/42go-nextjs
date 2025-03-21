'use client';

import { useCachedSession } from '@/lib/auth/use-cached-session';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';

interface UserAvatarProps {
  className?: string;
}

// Using memo to prevent unnecessary re-renders
export const UserAvatar = memo(function UserAvatar({ className }: UserAvatarProps) {
  const { data: session } = useCachedSession();

  // Use memoization for computing initials - always called
  const initials = useMemo(() => {
    // Return early if no user
    if (!session?.user) return <User className="h-4 w-4" />;

    if (session.user.name) {
      return session.user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }

    if (session.user.email) {
      return session.user.email.substring(0, 2).toUpperCase();
    }

    return <User className="h-4 w-4" />;
  }, [session?.user]);

  // If no session, return null
  if (!session?.user) {
    return null;
  }

  const userImage = session.user.image;
  const userName = session.user.name || 'User';

  return (
    <Avatar className={cn(className)}>
      {userImage && <AvatarImage src={userImage} alt={userName} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
});
