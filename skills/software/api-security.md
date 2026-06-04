---
name: api-security
description: >-
  Fire when the user asks to harden an API, add rate limiting, configure CORS,
  set security headers, validate request payloads, or prevent endpoint abuse.
  Also fire during security review of a new API route or when a pentest/CVE
  surfaces API issues. Trigger phrases: "rate limit", "CORS", "security
  headers", "harden API", "token validation", "API abuse", "CSRF", "secure
  this endpoint", "authn/authz for API", "input validation at boundary".
domain: software
auto-load: false
used-by:
  - developer-agent
  - security-agent
  - devops-agent
---

# Skill: API Security Hardening

> **Skill ID:** SW-027
> **Cluster:** Security

## Purpose

APIs are the attack surface of every modern application. Unprotected endpoints, misconfigured CORS, missing rate limits — these aren't theoretical risks, they're the first things attackers check.

## Security Headers

### Required Headers (Next.js)

```typescript
// next.config.ts
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "0" }, // Disabled — rely on CSP
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.yourdomain.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

## CORS Configuration

```typescript
const ALLOWED_ORIGINS = [
  "https://yourdomain.com",
  "https://app.yourdomain.com",
];

function corsMiddleware(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Allow-Credentials": "true",
    };
  }
  return {};
}

// NEVER in production: Access-Control-Allow-Origin: *
```

## Rate Limiting

### Strategy by Endpoint Type

| Endpoint Type | Rate Limit | Window | Key |
|---|---|---|---|
| Auth (login, signup, reset) | 5 requests | per minute | per IP |
| API reads | 100 requests | per minute | per user/API key |
| API writes | 30 requests | per minute | per user/API key |
| File uploads | 10 requests | per minute | per user |
| Webhooks | 100 requests | per minute | per source |
| Public/anonymous | 30 requests | per minute | per IP |

### Implementation (Upstash Ratelimit)

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "60 s"),
  analytics: true,
});

export async function POST(req: Request) {
  const identifier = getClientIdentifier(req);
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

  if (!success) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }
  // ... proceed
}
```

## API Key Security

```
[] API keys generated with cryptographically secure randomness (min 32 bytes)
[] API keys stored hashed in the database (not plaintext)
[] API keys shown to the user exactly once (on creation)
[] API keys can be revoked instantly
[] API keys have optional expiry dates
[] API key permissions can be scoped (read-only, specific resources)
[] API keys sent in Authorization header, never in URL query parameters
[] Rate limiting applied per API key
[] API key usage is logged
```

## Request Validation

```
[] Content-Type header validated
[] Request body size limited (1MB for JSON, 10MB for file uploads)
[] JSON parsing errors return 400, not 500
[] Unexpected fields stripped or rejected (Zod .strict())
[] Array inputs have maximum length limits
[] Nested object depth is limited
[] String fields have maximum length limits
[] Numeric fields have range limits
```

## Response Security

```
[] Never expose internal error details (stack traces, SQL queries, file paths)
[] Consistent error response format across all endpoints
[] 401 for "not authenticated," 403 for "not authorized"
[] Don't reveal resource existence to unauthorized users (return 404, not 403)
[] Pagination required on list endpoints (no unbounded queries)
[] Sensitive fields excluded from API responses
[] Response includes appropriate cache headers
```

## API Security Checklist

```
[] All endpoints require authentication (except explicitly public ones)
[] Authorization checked on every request
[] CORS configured with specific origins
[] Rate limiting on all endpoints
[] Security headers set on all responses
[] Content-Security-Policy configured
[] Request body size limits enforced
[] Input validated with schema on every endpoint
[] No internal error details exposed
[] HTTPS required
[] API keys hashed in storage, shown once, revocable
[] Pagination enforced on list endpoints
[] Request logging for audit trail (without sensitive data)
[] Webhook endpoints validate signatures
```

## Gotchas

- CORS set to `*` "just for local dev" survives to production more often than anyone expects. Gate permissive CORS behind an env check and fail closed in prod.
- Authorization enforced in the UI but not the API. If an endpoint returns data based on the caller's role, the check has to live server-side — hiding a button doesn't stop a curl.
- Rate limiting on the login endpoint only. Token refresh, password reset, and webhook endpoints are the usual bypass paths; rate-limit them too.
- Leaking stack traces in error responses. The first thing an attacker does is trigger errors to map internals. Return opaque messages to clients and log the details server-side.
