import { db } from '@/lib/db';
import { rolesUsers, rolesGrants } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { Session } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * Enum representing different matching strategies for checking grants
 */
export enum GrantMatchStrategy {
  ALL = 'all', // User must have all specified grants
  ANY = 'any', // User must have at least one of the specified grants
}

/**
 * Checks if a pattern matches a specific grant ID
 * Supports wildcards with '*' (e.g., 'users:*' matches 'users:list', 'users:edit', etc.)
 *
 * @param pattern The pattern to match (can include '*' as wildcard)
 * @param grantId The specific grant ID to check against the pattern
 * @returns boolean True if the grantId matches the pattern
 */
function matchesPattern(pattern: string, grantId: string): boolean {
  // Convert the pattern to a regex pattern
  // Replace '*' with '.*' for regex wildcard and escape other special chars
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
    .replace('\\*', '.*'); // Replace escaped * with .* for wildcard

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(grantId);
}

/**
 * Checks if a user has the specified grants based on the matching strategy
 * Now supports wildcard patterns in grantIds (e.g., 'users:*')
 *
 * @param userId The ID of the user to check
 * @param grantIds Array of grant IDs or patterns to check for
 * @param strategy The matching strategy (ALL or ANY)
 * @returns Promise<boolean> True if the user has the specified grants according to the strategy
 */
export async function hasGrants(
  userId: string,
  grantIds: string[],
  strategy: GrantMatchStrategy = GrantMatchStrategy.ALL
): Promise<boolean> {
  if (!userId || !grantIds.length) {
    return false;
  }

  // Separate exact match IDs and pattern IDs
  const exactMatchIds = grantIds.filter(id => !id.includes('*'));
  const patternIds = grantIds.filter(id => id.includes('*'));

  // Get all user role IDs
  const userRoles = await db
    .select({ roleId: rolesUsers.roleId })
    .from(rolesUsers)
    .where(eq(rolesUsers.userId, userId));

  if (!userRoles.length) {
    return false;
  }

  const userRoleIds = userRoles.map(role => role.roleId);

  // Get all grants that the user has through their roles
  const userGrants = await db
    .select({ grantId: rolesGrants.grantId })
    .from(rolesGrants)
    .where(inArray(rolesGrants.roleId, userRoleIds));

  if (!userGrants.length) {
    return false;
  }

  const userGrantIds = userGrants.map(g => g.grantId);

  // Check for exact matches
  const exactMatches = exactMatchIds.filter(id => userGrantIds.includes(id));

  // Check for pattern matches
  let patternMatches: string[] = [];
  if (patternIds.length > 0) {
    // For each pattern, check if any of the user's grants match
    patternMatches = patternIds.filter(pattern =>
      userGrantIds.some(grantId => matchesPattern(pattern, grantId))
    );
  }

  // Combine the matches
  const matchedGrants = [...exactMatches, ...patternMatches];

  // For ALL strategy, all specified grants must match
  if (strategy === GrantMatchStrategy.ALL) {
    return matchedGrants.length === grantIds.length;
  }

  // For ANY strategy, at least one grant must match
  return matchedGrants.length > 0;
}

/**
 * Middleware utility to check if the current session user has the required grants
 *
 * @param session The current user session
 * @param grantIds Array of grant IDs to check for
 * @param strategy The matching strategy (ALL or ANY)
 * @returns Promise<boolean> True if the session user has the specified grants
 */
export async function sessionHasGrants(
  session: Session | null,
  grantIds: string[],
  strategy: GrantMatchStrategy = GrantMatchStrategy.ALL
): Promise<boolean> {
  if (!session?.user?.id) {
    return false;
  }

  return hasGrants(session.user.id, grantIds, strategy);
}

/**
 * Higher-order function to create a middleware that requires specific roles
 * Returns a function that can be used as middleware in API routes
 *
 * @param roleNames Array of role names required for access
 * @returns A middleware function that checks if the user has the required roles
 */
export function requireRoles(roleNames: string[] = []) {
  return async () => {
    // Check if user has required roles
    const { auth } = await import('@/lib/auth/auth');
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (roleNames.length === 0) {
      // If no roles specified, just check for authenticated user
      return { success: true, session };
    }

    const hasRequiredGrants = await sessionHasGrants(session, roleNames, GrantMatchStrategy.ANY);

    if (!hasRequiredGrants) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return { success: true, session };
  };
}
