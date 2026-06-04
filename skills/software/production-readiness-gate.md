---
name: production-readiness-gate
description: Final quality gate before production deployment — 4-tier pass/fail assessment combining all quality signals.
domain: software
auto-load: false
used-by:
  - qa-agent
  - devops-agent
---

# Skill: Production Readiness Gate

> **Skill ID:** SW-034
> **Cluster:** App Quality

## Purpose

This is the "ready to ship?" checklist. It synthesizes quality signals from across the skill library into a single, comprehensive gate. If something fails here, it doesn't ship.

## Gate Structure

### Tier 1: Hard Blockers (Must Pass — Deployment Blocked)

```
[] All tests pass (unit, integration, e2e)
[] No critical or high security vulnerabilities (npm audit)
[] No console errors in production build
[] Authentication flows work (sign up, sign in, sign out, password reset)
[] Authorization enforced on all protected routes
[] HTTPS enforced
[] Environment variables configured for production
[] Database migrations applied successfully
[] No hardcoded development/staging values in production config
[] Error monitoring is connected and receiving events
```

### Tier 2: Quality Standards (Must Pass — Ship Quality)

```
[] Lighthouse Performance >= 80 on core pages
[] Lighthouse Accessibility >= 90 on all pages
[] Core Web Vitals in "Good" range (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1)
[] All pages handle loading, empty, and error states (SW-019)
[] No layout shift on page load
[] Cross-browser tested (Chrome, Safari, Firefox, Edge)
[] Mobile responsive (tested at 320px, 375px, 768px)
[] Dark mode (if implemented) works without flash or broken styles
[] All links work (no 404s)
[] All images load (no broken images)
[] No placeholder content ("Lorem ipsum", "TODO", "Coming soon")
[] Security headers configured (SW-027)
[] Rate limiting active on auth and write endpoints
[] Input validation on all forms (client and server)
```

### Tier 3: Brand and Polish (Should Pass — Professional Quality)

```
[] Favicon and app icons configured (SW-024)
[] OG images set and tested on Twitter, Slack, iMessage
[] Meta descriptions unique and compelling per page
[] UI copy follows standards (SW-022) — no vague labels or generic errors
[] Visual consistency audit passed (SW-023) — no mixed styles
[] Brand colors and fonts match BRAND.md / DESIGN.md
[] Loading states use skeletons that match layout shape
[] Toasts and notifications work correctly
[] Form submission provides clear feedback
[] Empty states are helpful and include actions
[] Footer includes privacy policy and terms links
[] Copyright year is current
```

### Tier 4: Operational Readiness (Must Pass — Sustainable Operations)

```
[] Analytics tracking installed and receiving data
[] Error monitoring capturing and alerting
[] Uptime monitoring configured
[] Backup procedure documented and tested
[] Rollback procedure documented and tested
[] Deployment process documented (or automated)
[] Domain and DNS configured correctly
[] SSL certificate auto-renewing
[] Logging configured (without sensitive data)
[] Support/feedback mechanism available to users
```

## Gate Process

```
1. Developer completes feature/release
2. Test Agent runs full test suite -> Pass/Fail
3. QA Agent reviews against acceptance criteria -> Approved/Rejected
4. PM triggers Production Readiness Gate (this checklist)
5. Each tier evaluated:
   - Tier 1 failure -> BLOCKED. Fix before any discussion of shipping.
   - Tier 2 failure -> BLOCKED. Fix before ship.
   - Tier 3 failure -> SHIP WITH KNOWN ISSUES logged. Fix within one sprint.
   - Tier 4 failure -> BLOCKED for first launch. For updates, log and fix within one sprint.
6. All tiers pass -> SHIP IT.
```

## Gate Report Template

```markdown
## Production Readiness Report — [Date]

### Release: [version/feature name]

### Tier 1: Hard Blockers
Status: PASS / FAIL
[List any failures]

### Tier 2: Quality Standards
Status: PASS / FAIL
[List any failures]

### Tier 3: Brand and Polish
Status: PASS / KNOWN ISSUES
[List known issues with fix timeline]

### Tier 4: Operational Readiness
Status: PASS / FAIL
[List any failures]

### Verdict: SHIP / BLOCKED
[If blocked, list specific items that must be resolved]
```
