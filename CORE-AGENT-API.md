# CORE-AGENT-API: Core Platform MVP - API Layer

## READ FIRST
1. Read `RALPH_PATTERNS.md` for conventions
2. Study existing `routes.ts` for exact patterns
3. Ensure CORE-AGENT-DB has completed (tables exist, storage methods ready)

---

## Mission
Add authentication API endpoints and middleware to the QMS Suite:
- Auth endpoints: register, login, logout, me, refresh
- Auth middleware: validate session, attach user to request
- Tenancy middleware: extract orgId, scope queries
- Update existing routes to require authentication

---

## Phase 1: Auth Utilities

### 1.1 Create server/auth.ts

```typescript
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { storage } from './storage';
import type { User, Organization, Session } from '@shared/schema';

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
```

---

## Phase 2: Auth Middleware

### 2.1 Create server/middleware/auth.ts

```typescript
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
```

---

## Phase 3: Auth Routes

### 3.1 Add to routes.ts - Auth Endpoints

Add these routes at the TOP of registerRoutes function (before other routes):

```typescript
import { z } from 'zod';
import { fromError } from 'zod-validation-error';
import { storage } from './storage';
import { 
  hashPassword, 
  verifyPassword, 
  generateSessionToken, 
  getSessionExpiry,
  sanitizeUser 
} from './auth';
import { requireAuth, optionalAuth, requireRole, SESSION_COOKIE, verifyOrgAccess } from './middleware/auth';
import cookieParser from 'cookie-parser';

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware
  app.use(cookieParser());

  // ============================================
  // AUTH ROUTES (public)
  // ============================================

  // Register new organization + admin user
  const registerSchema = z.object({
    organizationName: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(100),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Generate slug from org name
      const slug = data.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if slug already exists
      const existingOrg = await storage.getOrganizationBySlug(slug);
      if (existingOrg) {
        return res.status(409).json({ error: 'Organization name already taken' });
      }

      // Create organization
      const org = await storage.createOrganization({
        name: data.organizationName,
        slug,
        settings: {},
      });

      // Create admin user
      const passwordHash = await hashPassword(data.password);
      const user = await storage.createUser({
        orgId: org.id,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'admin',
        status: 'active',
      });

      // Create session
      const token = generateSessionToken();
      const session = await storage.createSession({
        userId: user.id,
        token,
        expiresAt: getSessionExpiry(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Set cookie
      res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Return user (without password)
      const userWithOrg = { ...user, organization: org };
      res.status(201).json({ 
        user: sanitizeUser(userWithOrg as any),
        token, // Also return token for API clients
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Login
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    orgSlug: z.string().optional(), // Optional - for multi-org users
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      // Find organization (if slug provided) or find user's org
      let orgId: string | undefined;
      if (data.orgSlug) {
        const org = await storage.getOrganizationBySlug(data.orgSlug);
        if (!org) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        orgId = org.id;
      }

      // Find user - need to search across orgs if no slug provided
      // For MVP, require orgSlug or search in all orgs
      let user;
      if (orgId) {
        user = await storage.getUserByEmail(orgId, data.email);
      } else {
        // Search all orgs for this email (MVP simplification)
        // In production, you'd require orgSlug or have user select org
        const allOrgs = await storage.getAllOrganizations();
        for (const org of allOrgs) {
          const found = await storage.getUserByEmail(org.id, data.email);
          if (found) {
            user = found;
            orgId = org.id;
            break;
          }
        }
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const validPassword = await verifyPassword(data.password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check user status
      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Account is not active' });
      }

      // Create session
      const token = generateSessionToken();
      await storage.createSession({
        userId: user.id,
        token,
        expiresAt: getSessionExpiry(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Set cookie
      res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Get org for response
      const org = await storage.getOrganizationById(user.orgId);
      const userWithOrg = { ...user, organization: org! };

      res.json({ 
        user: sanitizeUser(userWithOrg as any),
        token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout
  app.post('/api/auth/logout', requireAuth, async (req, res) => {
    try {
      // Get token from cookie or header
      const token = req.cookies?.[SESSION_COOKIE] || 
                    req.headers.authorization?.replace('Bearer ', '');

      if (token) {
        await storage.deleteSession(token);
      }

      // Clear cookie
      res.clearCookie(SESSION_COOKIE);

      res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Get current user
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    res.json({ user: req.auth!.user });
  });

  // Refresh session (extend expiry)
  app.post('/api/auth/refresh', requireAuth, async (req, res) => {
    try {
      const token = req.cookies?.[SESSION_COOKIE] || 
                    req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No session to refresh' });
      }

      // Delete old session
      await storage.deleteSession(token);

      // Create new session
      const newToken = generateSessionToken();
      await storage.createSession({
        userId: req.auth!.user.id,
        token: newToken,
        expiresAt: getSessionExpiry(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Set new cookie
      res.cookie(SESSION_COOKIE, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ 
        user: req.auth!.user,
        token: newToken,
      });
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(500).json({ error: 'Session refresh failed' });
    }
  });
```

---

## Phase 4: Protect Existing Routes

### 4.1 Add Auth to All Existing Routes

Wrap all existing routes with `requireAuth` middleware:

```typescript
// Before:
app.get("/api/parts", async (req, res) => {
  const parts = await storage.getAllParts();
  res.json(parts);
});

// After:
app.get("/api/parts", requireAuth, async (req, res) => {
  const parts = await storage.getAllParts(req.orgId!);
  res.json(parts);
});
```

### 4.2 Route Updates Required

**Pattern for all list endpoints:**
```typescript
// Add requireAuth, use req.orgId for queries
app.get("/api/{resource}", requireAuth, async (req, res) => {
  const items = await storage.getAll{Resource}(req.orgId!);
  res.json(items);
});
```

**Pattern for all create endpoints:**
```typescript
// Add requireAuth, include orgId in data
app.post("/api/{resource}", requireAuth, async (req, res) => {
  const data = insertSchema.parse({ ...req.body, orgId: req.orgId });
  const item = await storage.create{Resource}(data);
  res.status(201).json(item);
});
```

**Pattern for all get-by-id endpoints:**
```typescript
// Add requireAuth, verify org access
app.get("/api/{resource}/:id", requireAuth, async (req, res) => {
  const item = await storage.get{Resource}ById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (!verifyOrgAccess(item.orgId, req)) {
    return res.status(404).json({ error: 'Not found' }); // 404 to not reveal existence
  }
  res.json(item);
});
```

### 4.3 Routes to Update

| Route | Add | Notes |
|-------|-----|-------|
| `GET /api/parts` | `requireAuth`, use `req.orgId` | |
| `GET /api/parts/:id` | `requireAuth`, verify org | |
| `POST /api/parts` | `requireAuth`, inject `orgId` | |
| `GET /api/processes` | `requireAuth`, use `req.orgId` | |
| `GET /api/processes/:id` | `requireAuth`, verify org | |
| `POST /api/processes` | `requireAuth`, inject `orgId` | |
| `PATCH /api/processes/:id` | `requireAuth`, verify org | |
| `DELETE /api/processes/:id` | `requireAuth`, verify org | |
| `GET /api/equipment` | `requireAuth`, use `req.orgId` | |
| `GET /api/equipment/:id` | `requireAuth`, verify org | |
| `POST /api/equipment` | `requireAuth`, inject `orgId` | |
| `PATCH /api/equipment/:id` | `requireAuth`, verify org | |
| `DELETE /api/equipment/:id` | `requireAuth`, verify org | |
| `GET /api/failure-modes` | `requireAuth`, use `req.orgId` | |
| ... | ... | Same pattern for all routes |

### 4.4 Role-Based Restrictions (Optional for MVP)

For sensitive operations, add role checks:

```typescript
// Only admins and quality managers can delete
app.delete("/api/processes/:id", 
  requireAuth, 
  requireRole('admin', 'quality_manager'),
  async (req, res) => {
    // ...
  }
);
```

---

## Phase 5: Add cookie-parser Dependency

```bash
npm install cookie-parser
npm install -D @types/cookie-parser
```

---

## Phase 6: Storage Method for getAllOrganizations

Add to storage.ts (needed for login without orgSlug):

```typescript
async getAllOrganizations(): Promise<Organization[]> {
  return db.select().from(organization);
}
```

---

## Validation Checklist

After completing CORE-AGENT-API:

- [ ] Server starts without errors
- [ ] `POST /api/auth/register` creates org + user + session, returns user
- [ ] `POST /api/auth/login` validates credentials, creates session, returns user
- [ ] `POST /api/auth/logout` deletes session, clears cookie
- [ ] `GET /api/auth/me` returns current user (requires auth)
- [ ] `POST /api/auth/refresh` extends session
- [ ] All existing routes require authentication
- [ ] All existing routes scope data to user's organization
- [ ] 401 returned for unauthenticated requests
- [ ] 404 returned for cross-org access attempts (not 403)

---

## Files Modified/Created

| File | Changes |
|------|---------|
| `server/auth.ts` | NEW - Password hashing, token generation, types |
| `server/middleware/auth.ts` | NEW - Auth middleware |
| `server/routes.ts` | Add auth routes, protect all existing routes |
| `server/storage.ts` | Add `getAllOrganizations` method |
| `package.json` | Add cookie-parser dependency |

---

## API Documentation

### Public Endpoints

#### POST /api/auth/register
Create new organization with admin user.

**Request:**
```json
{
  "organizationName": "Acme Manufacturing",
  "email": "admin@acme.com",
  "password": "securepass123",
  "firstName": "John",
  "lastName": "Admin"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@acme.com",
    "firstName": "John",
    "lastName": "Admin",
    "role": "admin",
    "orgId": "uuid",
    "organization": {
      "id": "uuid",
      "name": "Acme Manufacturing",
      "slug": "acme-manufacturing"
    }
  },
  "token": "64-char-hex-token"
}
```

#### POST /api/auth/login
Authenticate user.

**Request:**
```json
{
  "email": "admin@acme.com",
  "password": "securepass123",
  "orgSlug": "acme-manufacturing"  // optional
}
```

**Response (200):** Same as register

### Protected Endpoints

#### GET /api/auth/me
Get current user. Requires authentication.

**Response (200):**
```json
{
  "user": { /* AuthUser object */ }
}
```

#### POST /api/auth/logout
End session. Requires authentication.

**Response (200):**
```json
{
  "success": true
}
```

#### POST /api/auth/refresh
Extend session. Requires authentication.

**Response (200):** Same as login

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Validation error (malformed request) |
| 401 | Authentication required or invalid credentials |
| 403 | Account inactive or insufficient permissions |
| 404 | Resource not found (or cross-org access denied) |
| 409 | Conflict (duplicate org name, etc.) |
| 500 | Server error |
