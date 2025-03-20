import { db } from '@/lib/db';
import { groupsUsers, grants, groupsGrants } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { Session } from 'next-auth';

/**
 * Enum representing different matching strategies for checking grants
 */
export enum GrantMatchStrategy {
  ALL = 'all', // User must have all specified grants
  ANY = 'any', // User must have at least one of the specified grants
}

/**
 * Checks if a user has the specified grants based on the matching strategy
 *
 * @param userId The ID of the user to check
 * @param grantTitles Array of grant titles to check for
 * @param strategy The matching strategy (ALL or ANY)
 * @returns Promise<boolean> True if the user has the specified grants according to the strategy
 */
export async function hasGrants(
  userId: string,
  grantTitles: string[],
  strategy: GrantMatchStrategy = GrantMatchStrategy.ALL
): Promise<boolean> {
  if (!userId || !grantTitles.length) {
    return false;
  }

  // Find the grants IDs by their titles
  const grantRecords = await db
    .select({ id: grants.id })
    .from(grants)
    .where(inArray(grants.title, grantTitles));

  if (!grantRecords.length) {
    return false;
  }

  const grantIds = grantRecords.map(grant => grant.id);

  // Find groups that have the specified grants
  const groupsWithGrants = await db
    .select({ groupId: groupsGrants.groupId })
    .from(groupsGrants)
    .where(inArray(groupsGrants.grantId, grantIds));

  if (!groupsWithGrants.length) {
    return false;
  }

  const groupIds = groupsWithGrants.map(group => group.groupId);

  // Check if the user is a member of any of these groups
  const userGroups = await db
    .select()
    .from(groupsUsers)
    .where(and(eq(groupsUsers.userId, userId), inArray(groupsUsers.groupId, groupIds)));

  if (!userGroups.length) {
    return false;
  }

  // For the ALL strategy, we need to check if the user has all the required grants
  if (strategy === GrantMatchStrategy.ALL && grantTitles.length > 1) {
    // Count the unique grants the user has through their group memberships
    const userGroupIds = userGroups.map((ug: { groupId: string }) => ug.groupId);

    // Get all grants that the user has through their groups
    const userGrantsRecords = await db
      .select()
      .from(groupsGrants)
      .where(
        and(inArray(groupsGrants.groupId, userGroupIds), inArray(groupsGrants.grantId, grantIds))
      );

    // Check if the user has all the required grants
    const uniqueUserGrantIds = [
      ...new Set(userGrantsRecords.map((ug: { grantId: string }) => ug.grantId)),
    ];
    return uniqueUserGrantIds.length >= grantTitles.length;
  }

  // For the ANY strategy, we only need to confirm the user is in at least one group
  // with at least one of the grants, which we've already done
  return true;
}

/**
 * Middleware utility to check if the current session user has the required grants
 *
 * @param session The current user session
 * @param grantTitles Array of grant titles to check for
 * @param strategy The matching strategy (ALL or ANY)
 * @returns Promise<boolean> True if the session user has the specified grants
 */
export async function sessionHasGrants(
  session: Session | null,
  grantTitles: string[],
  strategy: GrantMatchStrategy = GrantMatchStrategy.ALL
): Promise<boolean> {
  if (!session?.user?.id) {
    return false;
  }

  return hasGrants(session.user.id, grantTitles, strategy);
}
