import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { sanitizeUser, type AuthContext, type AuthUser } from '../auth';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      orgId?: string;
    }
  }
}

// Cookie name for session token
export const SESSION_COOKIE = 'qms_session';

/**
 * Authentication middleware - validates session and attaches user to request
 * Use on protected routes
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies?.[SESSION_COOKIE] ||
                  req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Validate session
    const session = await storage.getSessionByToken(token);

    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    // Check if user is active
    if (session.user.status !== 'active') {
      res.status(403).json({ error: 'Account is not active' });
      return;
    }

    // Attach auth context to request
    req.auth = {
      user: sanitizeUser(session.user as any),
      sessionId: session.id,
    };
    req.orgId = session.user.orgId;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Optional authentication - attaches user if session exists, continues regardless
 * Use on routes that work with or without auth
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE] ||
                  req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const session = await storage.getSessionByToken(token);
      if (session && session.user.status === 'active') {
        req.auth = {
          user: sanitizeUser(session.user as any),
          sessionId: session.id,
        };
        req.orgId = session.user.orgId;
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
}

/**
 * Role-based access control middleware
 * Use after requireAuth to check user role
 */
export function requireRole(...allowedRoles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.auth.user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.auth.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Verify resource belongs to user's organization
 * Call in route handlers after fetching a resource
 */
export function verifyOrgAccess(resourceOrgId: string | undefined, req: Request): boolean {
  if (!req.orgId || !resourceOrgId) return false;
  return resourceOrgId === req.orgId;
}
