import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { grants, groups, groupsGrants, groupsUsers, users } from '@/lib/db/schema';
import { auth } from '@/lib/auth/auth';
import { hasGrants, sessionHasGrants } from '@/lib/auth/grants';
import { eq, inArray, or, ilike } from 'drizzle-orm';

// Define types for the data we're retrieving
type AdminGroup = { userId: string; groupId: string };
type GroupGrant = { groupId: string; grantId: string; createdAt: Date };

export async function GET() {
  try {
    // System version info
    const systemVersion = {
      version: 'ID_BASED_V2',
      description: 'Permissions are checked by ID only',
    };

    // Get current session information
    const session = await auth();
    const userId = session?.user?.id;

    // Database checks
    const checksDb = {
      grants: await db.select().from(grants),
      groups: await db.select().from(groups),
      groupsGrants: await db.select().from(groupsGrants),
      users: await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .limit(5),
    };

    // Session checks
    const checksSession = {
      hasSession: !!session,
      userId: userId,
      sessionHasBackofficeGrant: userId ? await sessionHasGrants(session, ['backoffice']) : false,
    };

    // ID checks (bypassing session)
    const directChecks: {
      adminUsers: Array<{ id: string; name: string | null; email: string }>;
      adminHasBackofficeGrant?: boolean;
      adminGroups?: AdminGroup[];
      adminGroupGrants?: GroupGrant[];
    } = {
      adminUsers: await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(or(ilike(users.name, 'admin'), ilike(users.email, '%admin%'))),
    };

    // Get the first admin user we found
    if (directChecks.adminUsers.length > 0) {
      const adminId = directChecks.adminUsers[0].id;
      directChecks.adminHasBackofficeGrant = await hasGrants(adminId, ['backoffice']);

      // Find the groups the admin belongs to
      directChecks.adminGroups = await db
        .select({
          userId: groupsUsers.userId,
          groupId: groupsUsers.groupId,
        })
        .from(groupsUsers)
        .where(eq(groupsUsers.userId, adminId));

      // Find the grants associated with those groups
      if (directChecks.adminGroups && directChecks.adminGroups.length > 0) {
        const adminGroupIds = directChecks.adminGroups.map(g => g.groupId);
        directChecks.adminGroupGrants = await db
          .select()
          .from(groupsGrants)
          .where(inArray(groupsGrants.groupId, adminGroupIds));
      }
    }

    return NextResponse.json({
      systemVersion,
      checksDb,
      checksSession,
      checksDirectIds: directChecks,
    });
  } catch (error) {
    console.error('Debug system error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
