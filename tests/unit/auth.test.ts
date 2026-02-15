import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateSessionToken, sanitizeUser } from '../../server/auth';

describe('Auth Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Salt makes them different
    });
  });

  describe('Session Token Generation', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateSessionToken();

      expect(token).toBeDefined();
      expect(token.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSessionToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('User Sanitization', () => {
    it('should remove sensitive fields from user object', () => {
      const mockUser = {
        id: 'user-123',
        orgId: 'org-456',
        email: 'test@example.com',
        passwordHash: 'secret-hash-should-not-appear',
        firstName: 'John',
        lastName: 'Doe',
        role: 'engineer' as const,
        status: 'active' as const,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: {
          id: 'org-456',
          name: 'Test Org',
          slug: 'test-org',
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const sanitized = sanitizeUser(mockUser as any);

      expect(sanitized.id).toBe('user-123');
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.firstName).toBe('John');
      expect(sanitized.role).toBe('engineer');

      // Should NOT have password hash
      expect((sanitized as any).passwordHash).toBeUndefined();
    });
  });
});
