---
name: security-review
domain: universal
auto-load: false
used-by:
  - qa-agent
description: >
  OWASP Top 10 review, input validation patterns, secrets management, and authentication
  verification for security-conscious quality assurance. Triggers: "security review",
  "OWASP", "vulnerability", "auth check", "secrets", "input validation", "XSS", "SQL injection",
  "security audit".
---

# Skill: Security Review

## When to Apply
- When QA Agent reviews code that handles user input, authentication, or sensitive data
- When Security Agent performs a focused security audit
- Before deploying to production for the first time
- When dependency-audit finds vulnerabilities that need code-level review
- When new auth flows or permission systems are implemented

## Core Framework

### 1. OWASP Top 10 Checklist (2021)

| # | Category | What to Check |
|---|---|---|
| A01 | Broken Access Control | Auth on all protected routes, role checks, IDOR prevention |
| A02 | Cryptographic Failures | TLS everywhere, no plaintext secrets, proper hashing (bcrypt/argon2) |
| A03 | Injection | Parameterized queries, input sanitization, no eval/exec on user input |
| A04 | Insecure Design | Threat modeling done, security requirements defined, rate limiting |
| A05 | Security Misconfiguration | Default creds removed, error messages don't leak internals, CORS configured |
| A06 | Vulnerable Components | Dependencies audited (see dependency-audit skill), no known CVEs |
| A07 | Auth Failures | Strong passwords enforced, MFA available, session management secure |
| A08 | Data Integrity Failures | CI/CD pipeline secured, dependency integrity verified, no unsigned updates |
| A09 | Logging Failures | Security events logged, no sensitive data in logs, logs tamper-resistant |
| A10 | SSRF | Server-side requests validate destinations, no user-controlled URLs to internal services |

### 2. Input Validation Rules
- **Validate at the boundary** — every input from users, APIs, or external systems.
- **Allowlist over denylist** — define what's valid, reject everything else.
- **Type enforcement** — numbers should be numbers, dates should be dates.
- **Length limits** — set maximums on all string inputs.
- **Sanitize for context** — HTML-encode for web output, parameterize for SQL, escape for shell.

### 3. Secrets Management
- [ ] No secrets in source code (search for API keys, tokens, passwords in codebase)
- [ ] No secrets in git history (check with `git log --all -p -S 'password'` or similar)
- [ ] Secrets stored in environment variables or secret management service
- [ ] `.env` files are gitignored
- [ ] Different secrets for dev/staging/production
- [ ] Secrets rotated on a schedule and after any compromise

### 4. Authentication & Authorization
- [ ] All protected routes require authentication
- [ ] Authorization checks happen server-side (never trust client-side only)
- [ ] Session tokens are cryptographically random and expire
- [ ] Password reset flows don't leak user existence
- [ ] Rate limiting on auth endpoints (login, register, password reset)
- [ ] JWT tokens have reasonable expiration and are validated on every request

### 5. Severity Classification

| Severity | Criteria | Response |
|---|---|---|
| **Critical** | Exploitable remotely, no auth required, data exposure | Block release, fix immediately |
| **High** | Exploitable with low-privilege access, significant impact | Fix before next release |
| **Medium** | Requires specific conditions, limited impact | Schedule fix within sprint |
| **Low** | Theoretical risk, no known exploit path | Track, fix opportunistically |

## Output Format

```markdown
## Security Review — [Feature/PR/System]

### OWASP Assessment
| Category | Status | Notes |
|---|---|---|
| A01 Access Control | [Pass/Fail/N/A] | [Details] |
| A02 Crypto | [Pass/Fail/N/A] | [Details] |
| ... | ... | ... |

### Findings
1. **[Severity]** — [Description] — [File:Line] — [Recommended Fix]
2. ...

### Secrets Scan
- [ ] No secrets in code: [Pass/Fail]
- [ ] No secrets in git history: [Pass/Fail]
- [ ] Env vars properly configured: [Pass/Fail]

### Verdict: [Pass / Pass with Conditions / Fail]
```

## Integration with Other Skills
- **dependency-audit**: Vulnerable dependencies are a security finding — feeds into this review.
- **code-review-checklist**: Security section of code review uses this skill's OWASP checklist.
- **api-design-principles**: API input validation and auth patterns are security concerns.
- **error-pattern-analysis**: Repeated security-related errors trigger deeper security review.
