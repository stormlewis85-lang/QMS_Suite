import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { User, Organization } from '@shared/schema';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Session token generation
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 char hex string
}

// Session duration (7 days)
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

// Types for auth context
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'quality_manager' | 'engineer' | 'viewer';
  orgId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
}

// Sanitize user for client (remove passwordHash)
export function sanitizeUser(user: User & { organization: Organization }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    orgId: user.orgId,
    organization: {
      id: user.organization.id,
      name: user.organization.name,
      slug: user.organization.slug,
    },
  };
}
