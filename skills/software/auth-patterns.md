---
name: auth-patterns
description: Authentication and authorization implementation patterns — provider selection, session handling, RBAC, and security requirements for Next.js apps.
domain: software
auto-load: false
used-by:
  - developer-agent
  - security-agent
  - architect-agent
---

# Skill: Auth Implementation Patterns

> **Skill ID:** SW-025
> **Cluster:** Security

## Purpose

Authentication is the most security-critical code in any application. A bug in auth isn't a bug — it's a vulnerability. This skill codifies the patterns that make auth implementations secure, maintainable, and consistent.

## Provider Selection

| Provider | Best For | Tradeoffs |
|---|---|---|
| **Clerk** | Fast implementation, hosted UI, social auth | Vendor lock-in, cost at scale |
| **NextAuth.js (Auth.js)** | Full control, self-hosted, multiple providers | More setup, you own session management |
| **Supabase Auth** | Already using Supabase for database | Tied to Supabase ecosystem |
| **Firebase Auth** | Google ecosystem, mobile + web | Firebase dependency |

**Decision Criteria:**
- Speed to market -> Clerk
- Full control and own your auth -> NextAuth.js
- Already on Supabase/Firebase -> Use their auth
- Log the choice in DECISIONS.md with rationale

## Session Management

### JWT vs. Session-Based

```
JWT (Stateless)
  + Scales horizontally without session store
  + Works across microservices
  - Can't be revoked until expiry
  - Token size grows with claims

Session (Stateful)
  + Revocable immediately
  + Smaller cookie size
  - Requires session store
  - Stickiness concerns at scale

Recommendation: For most Next.js apps, use HTTP-only secure cookies
with server-side session validation.
```

### Session Security Requirements

```
[] Session tokens stored in HTTP-only cookies (not localStorage)
[] Cookies set with Secure flag (HTTPS only)
[] Cookies set with SameSite=Lax (or Strict)
[] Session expiry set (7-30 days, with sliding window)
[] Idle timeout (15-60 minutes for sensitive apps)
[] Session invalidation on password change
[] Session invalidation on role change
[] CSRF protection enabled
[] No sensitive data in JWT payload
[] JWT secret is strong random value (min 256 bits), stored as env variable
```

## Authentication Flows

### Sign Up

```
1. Client: Collect email + password (or OAuth redirect)
2. Server: Validate input (email format, password strength)
3. Server: Check for existing account
4. Server: Hash password (bcrypt min 12 rounds, or Argon2id)
5. Server: Create user record
6. Server: Send verification email
7. Server: Create session (flag email as unverified)
8. Client: Redirect to "verify your email" page

[] Password hashing: bcrypt (rounds >= 12) or Argon2id
[] Email verification required before full access
[] Rate limit signup endpoint (max 5/minute per IP)
[] No indication of whether email already exists (prevents enumeration)
```

### Sign In

```
1. Client: Collect credentials
2. Server: Find user by email
3. Server: Compare password hash
4. Server: Check if email is verified
5. Server: Check if account is locked
6. Server: Create session
7. Client: Redirect to app

[] Rate limit login attempts (max 5/minute per account, 20/minute per IP)
[] Account lockout after 10 failed attempts (unlock via email)
[] Constant-time password comparison
[] Same error message for wrong email AND wrong password
[] Log failed login attempts
```

### Password Reset

```
1. Client: Submit email address
2. Server: Generate secure random token (min 32 bytes)
3. Server: Store hashed token with expiry (1 hour max)
4. Server: Send reset email
5. Client: User clicks link, enters new password
6. Server: Validate token (not expired, not used, hash matches)
7. Server: Update password hash
8. Server: Invalidate all existing sessions
9. Server: Invalidate the reset token (single use)

[] Reset token is single-use
[] Reset token expires in 1 hour max
[] Token stored as hash, not plaintext
[] All sessions invalidated on password reset
[] Same response whether email exists or not
```

### OAuth / Social Login

```
[] State parameter used and validated (CSRF prevention)
[] PKCE enabled for public clients
[] Account linking: handle user with same email from different providers
[] Store only necessary profile data
[] Refresh token stored securely if needed
```

## Authorization Patterns

### Role-Based Access Control (RBAC)

```typescript
enum Role {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  VIEWER = "viewer",
}

const PERMISSIONS: Record<Role, string[]> = {
  [Role.OWNER]: ["*"],
  [Role.ADMIN]: [
    "project:read", "project:write", "project:delete",
    "member:read", "member:invite", "member:remove",
    "settings:read", "settings:write",
  ],
  [Role.MEMBER]: [
    "project:read", "project:write",
    "member:read", "settings:read",
  ],
  [Role.VIEWER]: ["project:read", "member:read"],
};

function hasPermission(userRole: Role, permission: string): boolean {
  const rolePermissions = PERMISSIONS[userRole];
  return rolePermissions.includes("*") || rolePermissions.includes(permission);
}
```

### Middleware Protection (Next.js)

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }

  const session = await getSession(req);
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (ADMIN_PATHS.some(p => path.startsWith(p))) {
    if (!["owner", "admin"].includes(session.user.role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}
```

### Server-Side Authorization

```typescript
// NEVER trust client-side role checks for mutations
// ALWAYS verify on the server
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(session.user.role, "project:delete")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  // ... proceed with deletion
}
```

## Security Checklist

```
[] Passwords hashed with bcrypt (>=12 rounds) or Argon2id
[] Sessions use HTTP-only, Secure, SameSite cookies
[] CSRF protection on all state-changing requests
[] Rate limiting on auth endpoints
[] Account lockout after repeated failures
[] Same error messages for wrong email and wrong password
[] Email verification required
[] Password reset tokens are single-use, time-limited, stored as hashes
[] All authorization checks happen server-side
[] Role changes invalidate existing sessions
[] OAuth uses state parameter and PKCE
[] No auth-related secrets in client-side code
[] Failed login attempts logged
[] Password strength requirements enforced (min 8 chars, check against common passwords)
```
