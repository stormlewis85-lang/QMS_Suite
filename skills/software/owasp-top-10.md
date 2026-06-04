---
name: owasp-top-10
description: OWASP Top 10 web security risks translated into actionable checks for Next.js / React / Node.js applications.
domain: software
auto-load: false
used-by:
  - security-agent
  - qa-agent
---

# Skill: OWASP Top 10 Checklist

> **Skill ID:** SW-028
> **Cluster:** Security

## Purpose

The OWASP Top 10 is the industry-standard list of the most critical web application security risks. This skill translates each risk into specific, actionable checks for the Next.js/React/Node.js stack.

## The 10 Risks

### A01: Broken Access Control

```
[] Every API endpoint checks authentication AND authorization
[] Authorization is enforced server-side (never client-only)
[] IDOR prevented: verify requesting user owns/can access the resource
[] CORS configured with specific origins
[] JWT/session tokens can't be reused after privilege changes
[] Admin functions protected by role checks, not just hidden UI
[] File upload paths don't allow path traversal
[] Metadata manipulation prevented (can't change role via API body)
```

### A02: Cryptographic Failures

```
[] HTTPS enforced everywhere (HSTS header set)
[] Passwords hashed with bcrypt (>=12 rounds) or Argon2id
[] Sensitive data encrypted at rest
[] No sensitive data in URLs
[] No sensitive data in logs
[] API keys and secrets in environment variables, not in code
[] Backup data encrypted
[] TLS 1.2+ required
[] Secure random number generation (crypto.randomBytes, not Math.random)
```

### A03: Injection

```
[] SQL injection: All queries use parameterized statements or ORM
[] NoSQL injection: MongoDB queries validated, no $where from user input
[] XSS: React auto-escapes — never use dangerouslySetInnerHTML with user data
[] Command injection: Never pass user input to child_process.exec
[] Rich text sanitized with DOMPurify before rendering
[] URL parameters validated before redirect (prevent open redirects)
```

### A04: Insecure Design

```
[] Threat modeling done for sensitive features
[] Business logic validated server-side (pricing, discounts, permissions)
[] Multi-step processes can't be skipped
[] Rate limiting prevents abuse of expensive operations
[] Resource limits prevent abuse (max file size, max items, max API calls)
[] "Fail secure" — on error, deny access rather than grant it
[] Sensitive operations require re-authentication
```

### A05: Security Misconfiguration

```
[] Production has different secrets than development
[] Debug mode disabled in production
[] Default accounts removed or passwords changed
[] Directory listing disabled
[] Security headers configured (see SW-027)
[] Error messages don't reveal system internals
[] Dependencies updated — no known vulnerable versions
[] Environment variables not committed to git
```

### A06: Vulnerable and Outdated Components

```
[] npm audit runs clean (no critical or high vulnerabilities)
[] Dependabot or Renovate configured
[] Lock file committed and reviewed
[] No abandoned dependencies
[] Critical security patches applied within 48 hours
[] High security patches applied within 1 week
[] Sub-dependencies audited
[] License compliance checked
```

### A07: Identification and Authentication Failures

```
[] See SW-025 (Auth Implementation Patterns) for comprehensive auth checklist
[] Summary: strong passwords, hashed storage, rate limiting, session security,
   MFA available for sensitive apps
```

### A08: Software and Data Integrity Failures

```
[] Subresource Integrity (SRI) hashes on CDN-loaded scripts
[] CI/CD pipeline integrity — only authorized users can deploy
[] Webhook signatures verified (Stripe, GitHub, etc.)
[] Deserialization of untrusted data validated (JSON.parse with schema validation)
[] npm packages verified before install
```

### A09: Security Logging and Monitoring Failures

```
[] Authentication events logged (success, failure, lockout)
[] Authorization failures logged
[] Input validation failures logged
[] Rate limit triggers logged
[] Logs don't contain sensitive data
[] Logs are monitored / alerting configured
[] Logs are tamper-resistant
[] Incident response plan exists
```

### A10: Server-Side Request Forgery (SSRF)

```
[] User-provided URLs validated against allowlist of domains
[] Internal network addresses blocked (127.0.0.1, 10.*, 172.16-31.*, 192.168.*)
[] URL scheme restricted to https://
[] DNS rebinding prevented
[] Webhook URLs validated
[] Redirect responses not followed blindly
[] Cloud metadata endpoints blocked (169.254.169.254)
```
