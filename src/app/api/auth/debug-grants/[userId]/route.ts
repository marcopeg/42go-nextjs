import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupsUsers, groupsGrants, grants } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(_: Request, { params }: { params: { userId: string } }) {
  const userId = params.userId;

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // Get the groups the user belongs to
    const userGroups = await db
      .select({ groupId: groupsUsers.groupId })
      .from(groupsUsers)
      .where(eq(groupsUsers.userId, userId));

    if (!userGroups.length) {
      return NextResponse.json({
        userId,
        groups: [],
        grants: [],
        message: 'User is not a member of any groups',
      });
    }

    const userGroupIds = userGroups.map(g => g.groupId);

    // Get the grants associated with these groups
    const userGroupGrants = await db
      .select({
        groupId: groupsGrants.groupId,
        grantId: groupsGrants.grantId,
      })
      .from(groupsGrants)
      .where(inArray(groupsGrants.groupId, userGroupIds));

    if (!userGroupGrants.length) {
      return NextResponse.json({
        userId,
        groups: userGroupIds,
        grants: [],
        message: 'User groups do not have any grants',
      });
    }

    const userGrantIds = [...new Set(userGroupGrants.map(g => g.grantId))];

    // Get the full grant records
    const userGrants = await db.select().from(grants).where(inArray(grants.id, userGrantIds));

    return NextResponse.json({
      userId,
      groups: userGroupIds,
      groupGrants: userGroupGrants,
      grants: userGrants,
      hasBackofficeGrant: userGrantIds.includes('backoffice'),
    });
  } catch (error) {
    console.error('Error checking user grants:', error);
    return NextResponse.json({ error: 'Failed to check user grants' }, { status: 500 });
  }
}
