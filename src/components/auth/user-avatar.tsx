'use client';

import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

export function UserAvatar() {
  const { data: session } = useSession();

  // If no session, return null
  if (!session?.user) {
    return null;
  }

  // Get initials from name or email
  const getInitials = () => {
    if (session.user?.name) {
      return session.user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }

    if (session.user?.email) {
      return session.user.email.substring(0, 2).toUpperCase();
    }

    return <User className="h-4 w-4" />;
  };

  return (
    <Avatar>
      {session.user?.image && (
        <AvatarImage src={session.user.image} alt={session.user?.name || 'User'} />
      )}
      <AvatarFallback>{getInitials()}</AvatarFallback>
    </Avatar>
  );
}
