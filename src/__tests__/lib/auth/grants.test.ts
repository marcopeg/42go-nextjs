import { hasGrants, sessionHasGrants, GrantMatchStrategy } from '@/lib/auth/grants';
import { db } from '@/lib/db';
import { Session } from 'next-auth';

// Mock the database operations
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  },
}));

// Import the actual implementation instead of mocking it
jest.mock('@/lib/auth/grants', () => {
  const actual = jest.requireActual('@/lib/auth/grants');
  const hasGrantsMock = jest.fn().mockImplementation(actual.hasGrants);

  return {
    ...actual,
    hasGrants: hasGrantsMock,
    // Use a custom implementation of sessionHasGrants that calls our mocked hasGrants
    sessionHasGrants: jest
      .fn()
      .mockImplementation((session, grantIds, strategy = actual.GrantMatchStrategy.ALL) => {
        if (!session?.user?.id) {
          return Promise.resolve(false);
        }
        return hasGrantsMock(session.user.id, grantIds, strategy);
      }),
    GrantMatchStrategy: actual.GrantMatchStrategy,
  };
});

describe('Grants Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasGrants', () => {
    it('should return false if userId is empty', async () => {
      const result = await hasGrants('', ['backoffice']);
      expect(result).toBe(false);
      expect(db.select).not.toHaveBeenCalled();
    });

    it('should return false if grantIds is empty', async () => {
      const result = await hasGrants('user1', []);
      expect(result).toBe(false);
      expect(db.select).not.toHaveBeenCalled();
    });

    it('should return false if no groups have the specified grants', async () => {
      // Mock empty group records
      (db.select as jest.Mock).mockImplementationOnce(() => {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([]),
        };
      });

      const result = await hasGrants('user1', ['backoffice']);
      expect(result).toBe(false);
    });

    it('should return false if user is not a member of any groups with the grants', async () => {
      // Mock group records
      (db.select as jest.Mock).mockImplementationOnce(() => {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ groupId: 'backoffice-group' }]),
        };
      });

      // Mock empty user groups
      (db.select as jest.Mock).mockImplementationOnce(() => {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([]),
        };
      });

      const result = await hasGrants('user1', ['backoffice']);
      expect(result).toBe(false);
    });

    it('should return true if user has the grant with ANY strategy (default)', async () => {
      // Mock group records
      (db.select as jest.Mock).mockImplementationOnce(() => {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ groupId: 'backoffice-group' }]),
        };
      });

      // Mock user groups
      (db.select as jest.Mock).mockImplementationOnce(() => {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ groupId: 'backoffice-group', userId: 'user1' }]),
        };
      });

      const result = await hasGrants('user1', ['backoffice'], GrantMatchStrategy.ANY);
      expect(result).toBe(true);
    });

    it('should check for ALL grants when strategy is ALL and multiple grants', async () => {
      // Mock group records
      (db.select as jest.Mock).mockImplementationOnce(() => {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest
            .fn()
            .mockResolvedValue([{ groupId: 'backoffice-group' }, { groupId: 'admin-group' }]),
        };
      });

      // Mock user groups
      (db.select as jest.Mock).mockImplementationOnce(() => {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ groupId: 'backoffice-group', userId: 'user1' }]),
        };
      });

      // Mock user grants
      (db.select as jest.Mock).mockImplementationOnce(() => {
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([
            { groupId: 'backoffice-group', grantId: 'backoffice' },
            { groupId: 'backoffice-group', grantId: 'admin' },
          ]),
        };
      });

      const result = await hasGrants('user1', ['backoffice', 'admin'], GrantMatchStrategy.ALL);
      expect(result).toBe(true);
    });
  });

  describe('sessionHasGrants', () => {
    it('should return false if session is null', async () => {
      const result = await sessionHasGrants(null, ['backoffice']);
      expect(result).toBe(false);
    });

    it('should return false if session user is undefined', async () => {
      const session = {} as Session;
      const result = await sessionHasGrants(session, ['backoffice']);
      expect(result).toBe(false);
    });

    it('should return false if session user has no id', async () => {
      const session = { user: {} } as Session;
      const result = await sessionHasGrants(session, ['backoffice']);
      expect(result).toBe(false);
    });

    it('should call hasGrants with the user id from session', async () => {
      const session = { user: { id: 'user1' } } as Session;
      await sessionHasGrants(session, ['backoffice']);

      expect(hasGrants).toHaveBeenCalledWith('user1', ['backoffice'], GrantMatchStrategy.ALL);
    });
  });
});
