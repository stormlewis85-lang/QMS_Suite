import { Router } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { storage } from "../storage";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  getSessionExpiry,
  sanitizeUser,
} from "../auth";
import { requireAuth, SESSION_COOKIE } from "../middleware/auth";
import { authRateLimit, registerRateLimit } from "./_config";

const router = Router();

// Register new organization + admin user
const registerSchema = z.object({
  organizationName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

router.post('/register', registerRateLimit, async (req, res) => {
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
      token,
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
  orgSlug: z.string().optional(),
});

router.post('/login', authRateLimit, async (req, res) => {
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

    // Find user
    let user;
    if (orgId) {
      user = await storage.getUserByEmail(orgId, data.email);
    } else {
      // Search all orgs for this email (MVP simplification)
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
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE] ||
                  req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      await storage.deleteSession(token);
    }

    res.clearCookie(SESSION_COOKIE);
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.auth!.user });
});

// Refresh session (extend expiry)
router.post('/refresh', requireAuth, async (req, res) => {
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

export { router as authRouter };
