import { sessionHasGrants } from './grants';
import { sessionHasRoles, RoleMatchStrategy } from './roles';

/**
 * Options for access control
 */
export interface AccessControlOptions {
  /**
   * Array of grant IDs required to access the resource
   */
  grants?: string[];

  /**
   * Array of role IDs required to access the resource
   */
  roles?: string[];

  /**
   * Strategy for role matching (ALL or ANY)
   * @default RoleMatchStrategy.ALL
   */
  roleStrategy?: RoleMatchStrategy;
}

/**
 * Result of an access control check
 */
export interface AccessControlResult {
  /**
   * Status of the access control check
   * - 'granted': Access is granted
   * - 'unauthenticated': User is not authenticated
   * - 'forbidden': User is authenticated but does not have the required access
   */
  status: 'granted' | 'unauthenticated' | 'forbidden';

  /**
   * Reason for the access control result
   */
  reason?: string;
}

/**
 * Checks if the current session user has the required grants and roles
 *
 * @param options Access control options
 * @returns Promise<AccessControlResult> Result of the access control check
 */
export async function checkAccess(options: AccessControlOptions): Promise<AccessControlResult> {
  const { grants, roles, roleStrategy = RoleMatchStrategy.ALL } = options;

  // If no grants or roles are specified, allow access
  if ((!grants || grants.length === 0) && (!roles || roles.length === 0)) {
    return { status: 'granted' };
  }

  // Check grants if specified
  if (grants && grants.length > 0) {
    const hasGrants = await sessionHasGrants(grants);
    if (!hasGrants) {
      return {
        status: 'forbidden',
        reason: 'Missing required grants',
      };
    }
  }

  // Check roles if specified
  if (roles && roles.length > 0) {
    const hasRoles = await sessionHasRoles(roles, roleStrategy);
    if (!hasRoles) {
      return {
        status: 'forbidden',
        reason: 'Missing required roles',
      };
    }
  }

  return { status: 'granted' };
}
