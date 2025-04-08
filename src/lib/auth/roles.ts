import { db } from '@/lib/db';
import { rolesUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Enum representing different matching strategies for checking roles
 */
export enum RoleMatchStrategy {
  ALL = 'all', // User must have all specified roles
  ANY = 'any', // User must have at least one of the specified roles
}

/**
 * Checks if a user has the specified roles based on the matching strategy
 *
 * @param userId The ID of the user to check
 * @param roleIds Array of role IDs to check for
 * @param strategy The matching strategy (ALL or ANY)
 * @returns Promise<boolean> True if the user has the specified roles according to the strategy
 */
export async function hasRoles(
  userId: string,
  roleIds: string[],
  strategy: RoleMatchStrategy = RoleMatchStrategy.ALL
): Promise<boolean> {
  if (!userId || !roleIds.length) {
    return false;
  }

  // Get all user role IDs
  const userRoles = await db
    .select({ roleId: rolesUsers.roleId })
    .from(rolesUsers)
    .where(eq(rolesUsers.userId, userId));

  if (!userRoles.length) {
    return false;
  }

  const userRoleIds = userRoles.map(role => role.roleId);

  // Check for matches
  const matchedRoles = roleIds.filter(id => userRoleIds.includes(id));

  // For ALL strategy, all specified roles must match
  if (strategy === RoleMatchStrategy.ALL) {
    return matchedRoles.length === roleIds.length;
  }

  // For ANY strategy, at least one role must match
  return matchedRoles.length > 0;
}

/**
 * Middleware utility to check if the current session user has the required roles
 * Now fetches the session internally
 *
 * @param roleIds Array of role IDs to check for (optional)
 * @param strategy The matching strategy (ALL or ANY)
 * @returns Promise<boolean> True if the session user has the specified roles or just has an active session if no roles specified
 */
export async function sessionHasRoles(
  roleIds?: string[],
  strategy: RoleMatchStrategy = RoleMatchStrategy.ALL
): Promise<boolean> {
  const { auth } = await import('@/lib/auth/auth');
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  // If no roles are specified, just check for active session
  if (!roleIds || roleIds.length === 0) {
    return true;
  }

  return hasRoles(session.user.id, roleIds, strategy);
}
