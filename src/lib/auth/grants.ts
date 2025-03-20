import { db } from '@/lib/db';
import { groupsUsers, groupsGrants } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { Session } from 'next-auth';

// Add a version identifier to help debug
const GRANTS_VERSION = 'ID_BASED_V2';
console.log(`Loaded grants system: ${GRANTS_VERSION}`);

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
 * @param grantIds Array of grant IDs to check for
 * @param strategy The matching strategy (ALL or ANY)
 * @returns Promise<boolean> True if the user has the specified grants according to the strategy
 */
export async function hasGrants(
  userId: string,
  grantIds: string[],
  strategy: GrantMatchStrategy = GrantMatchStrategy.ALL
): Promise<boolean> {
  console.log(`[${GRANTS_VERSION}] hasGrants called with:`, { userId, grantIds, strategy });

  if (!userId || !grantIds.length) {
    console.log(`[${GRANTS_VERSION}] hasGrants returning false - missing userId or grantIds`);
    return false;
  }

  // Find groups that have the specified grants
  const groupsWithGrants = await db
    .select({ groupId: groupsGrants.groupId })
    .from(groupsGrants)
    .where(inArray(groupsGrants.grantId, grantIds));

  console.log(`[${GRANTS_VERSION}] Groups with grants:`, groupsWithGrants);

  if (!groupsWithGrants.length) {
    console.log(
      `[${GRANTS_VERSION}] hasGrants returning false - no groups found with grants:`,
      grantIds
    );
    return false;
  }

  const groupIds = groupsWithGrants.map(group => group.groupId);
  console.log(`[${GRANTS_VERSION}] Group IDs:`, groupIds);

  // Check if the user is a member of any of these groups
  const userGroups = await db
    .select()
    .from(groupsUsers)
    .where(and(eq(groupsUsers.userId, userId), inArray(groupsUsers.groupId, groupIds)));

  console.log(`[${GRANTS_VERSION}] User groups:`, userGroups);

  if (!userGroups.length) {
    console.log(
      `[${GRANTS_VERSION}] hasGrants returning false - user not in any groups with grants`
    );
    return false;
  }

  // For the ALL strategy, we need to check if the user has all the required grants
  if (strategy === GrantMatchStrategy.ALL && grantIds.length > 1) {
    // Count the unique grants the user has through their group memberships
    const userGroupIds = userGroups.map((ug: { groupId: string }) => ug.groupId);

    // Get all grants that the user has through their groups
    const userGrantsRecords = await db
      .select()
      .from(groupsGrants)
      .where(
        and(inArray(groupsGrants.groupId, userGroupIds), inArray(groupsGrants.grantId, grantIds))
      );

    console.log(`[${GRANTS_VERSION}] User grants records:`, userGrantsRecords);

    // Check if the user has all the required grants
    const uniqueUserGrantIds = [
      ...new Set(userGrantsRecords.map((ug: { grantId: string }) => ug.grantId)),
    ];
    const hasAllGrants = uniqueUserGrantIds.length >= grantIds.length;
    console.log(`[${GRANTS_VERSION}] All grants check:`, {
      uniqueUserGrantIds,
      grantIds,
      hasAllGrants,
    });
    return hasAllGrants;
  }

  // For the ANY strategy, we only need to confirm the user is in at least one group
  // with at least one of the grants, which we've already done
  console.log(`[${GRANTS_VERSION}] hasGrants returning true - match found`);
  return true;
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
  console.log(`[${GRANTS_VERSION}] sessionHasGrants called with:`, {
    sessionUserID: session?.user?.id,
    grantIds,
    strategy,
  });

  if (!session?.user?.id) {
    console.log(
      `[${GRANTS_VERSION}] sessionHasGrants returning false - missing session or user ID`
    );
    return false;
  }

  return hasGrants(session.user.id, grantIds, strategy);
}
