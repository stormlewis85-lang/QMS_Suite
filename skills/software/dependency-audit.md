---
name: dependency-audit
domain: software
auto-load: false
used-by:
  - research-agent
description: >-
  Fire when the user asks to audit dependencies, check for CVEs, assess
  maintenance health of packages, review licenses, or evaluate upgrade priority.
  Also fire before adding a new dependency, on scheduled cadence, when a
  security advisory lands, or before a major framework migration. Trigger
  phrases: "audit dependencies", "check for vulnerabilities", "dependency
  health", "license check", "outdated packages", "CVE scan", "is this package
  safe", "should we add X".
---

# Skill: Dependency Audit

## Purpose

Every dependency is someone else's code running with your application's
permissions — each install is a trust decision. This skill gives Claude a
framework for making and re-evaluating those trust decisions: CVE exposure,
maintenance health, license compatibility, and upgrade priority. The goal is
not a checklist ritual but a defensible position on *why* each dependency
belongs in the tree.

## When to Apply

- Before adding a new dependency to the project
- On a scheduled cadence (weekly or per-sprint) to audit existing dependencies
- When a security advisory is published for a dependency in the project
- When PM requests a dependency health report
- Before major version upgrades or framework migrations
- When `package-lock.json` diffs show unexpected additions

## Mental Model

A dependency audit balances three axes: **vulnerability exposure** (what could
exploit us?), **maintenance risk** (will this still work in six months?), and
**license compatibility** (can we legally ship this?). When the three conflict,
vulnerability exposure wins — a zero-CVE abandoned package still beats a
maintained package with an active critical CVE, but only just.

Prefer removing a dependency over patching it, and prefer patching over
working around it.

## Approach

### 1. Inventory Phase
- List all direct and transitive dependencies with current versions.
- Identify lock file freshness — when was the last update?
- Flag dependencies with no lock file entry (phantom deps).

### 2. Automated Vulnerability Scan

```bash
# Check for known vulnerabilities
npm audit

# In CI — fail the build on critical/high
npm audit --audit-level=high

# Fix automatically where possible
npm audit fix

# Dry run first to preview changes
npm audit fix --dry-run
```

CI integration snippet:

```yaml
- name: Security audit
  run: npm audit --audit-level=high
  continue-on-error: false
```

Cross-reference against NIST NVD and GitHub Advisory Database. For non-npm
ecosystems, substitute `pip audit`, `cargo audit`, `bundle audit`, etc.

### 3. Classify Findings by Severity

| Severity | Response Time | Action |
|---|---|---|
| **Critical** | Within 24 hours | Patch immediately, deploy hotfix |
| **High** | Within 48 hours (or current sprint) | Patch, include in next deployment |
| **Moderate** | Within 1 week / next sprint | Schedule fix, assess actual exposure |
| **Low** | Next maintenance cycle | Log it, patch opportunistically |

### 4. Maintenance Health Score

Rate each dependency on a 1-5 scale:

| Signal | Healthy (5) | Concerning (3) | Dead (1) |
|---|---|---|---|
| Last publish | < 3 months | 3-12 months | > 12 months |
| Open issues | Triaged, responsive | Growing backlog | Ignored |
| Contributors | Active team | Single maintainer | Abandoned |
| Downloads | Stable or growing | Declining | Flatlined |
| License | MIT, Apache 2.0 | LGPL, MPL | GPL, AGPL, unlicensed |

### 5. License Compliance
- Catalog all dependency licenses.
- Flag copyleft licenses (GPL, AGPL) that may conflict with project licensing.
- Flag unlicensed dependencies — these are legal unknowns.
- Check for license compatibility with the project's chosen license.

### 6. Upgrade Priority Matrix

Combine vulnerability severity, maintenance health, and usage frequency:

```
Priority = (Vulnerability Severity x 3) + (Maintenance Risk x 2) + (Usage Frequency x 1)
```

Higher score = upgrade first.

## Reference

### Manual Review Checklist — Before Adding a New Dependency

```
[ ] Is this necessary? Can we write this ourselves in < 100 lines?
[ ] How many weekly downloads? (>100K/week suggests community trust)
[ ] When was the last publish? (>1 year ago = potentially abandoned)
[ ] How many open issues? How many maintainers?
[ ] What's the license? (MIT/Apache = fine, GPL = check implications)
[ ] What's the bundle size? (check on bundlephobia.com)
[ ] How many dependencies does IT have? (deep trees = more risk)
[ ] Is there a security policy (SECURITY.md)?
[ ] Is there a well-known alternative with better maintenance?
```

### Dependency Hygiene Rules

1. **Minimize the dependency tree.** If the native solution is reasonable, prefer it.
2. **Pin major versions.** Use `^` for minor/patch but review major bumps manually.
3. **Lock file is committed.** `package-lock.json` must be in git.
4. **Review lock file diffs.** Scan for unexpected package additions or version changes.
5. **No `*` versions.** Every dependency must have a version constraint.
6. **Separate devDependencies.** Test tools and linters go in `devDependencies`, not `dependencies`.

### Regular Audit Cadence

```
Weekly:
  [ ] Run npm audit
  [ ] Review Dependabot/Renovate PRs
  [ ] Apply non-breaking security patches

Monthly:
  [ ] Full dependency review — are all deps still needed?
  [ ] Check for deprecated packages
  [ ] Review bundle size trends

Per Release:
  [ ] npm audit --audit-level=high passes
  [ ] No critical vulnerabilities in production dependencies
  [ ] License compliance check
```

### CVE Response Process

```
1. ASSESS: Is this dependency in production or only dev?
2. VERIFY: Does the CVE apply to your usage? (reachability analysis)
3. PATCH:
   a. If a patched version exists -> update immediately
   b. If no patch exists -> check for workarounds, consider replacing the package
   c. If neither -> document the risk, implement compensating controls, monitor
4. DEPLOY: Push the fix to production
5. LOG: Record the CVE, your response, and the timeline in DECISIONS.md
```

### Output Format

```markdown
## Dependency Audit Report — [Date]

### Summary
- Total dependencies: [N direct, M transitive]
- Vulnerabilities: [Critical: X, High: Y, Medium: Z, Low: W]
- Unmaintained (score <= 2): [List]
- License concerns: [List]

### Critical Actions
1. [Package]: [CVE-XXXX] — [severity] — [recommended action]

### Upgrade Queue (prioritized)
| Package | Current | Target | Priority Score | Reason |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

### License Inventory
| Package | License | Status |
|---|---|---|
| ... | ... | OK / Review / Block |
```

## Gotchas

- `npm audit` reports transitive vulnerabilities that may not be reachable from
  your code paths — always verify exposure before spending sprint cycles on low
  and moderate severity items.
- `npm audit fix` can silently introduce major-version breaking changes for
  transitive dependencies. Run with `--dry-run` first and review the diff.
- A dependency with zero CVEs but an abandoned maintainer is a ticking clock,
  not a clean bill of health. Track maintenance score separately from CVE score.
- License scanners often miss dual-licensed packages and license changes that
  happen in later versions of the same package. Re-check licenses after every
  major upgrade.

## Anti-Patterns

- Running `npm audit fix --force` in CI without human review. This can yank in
  major versions and silently break the build.
- Treating `low` severity CVEs as zero-priority indefinitely. The backlog grows
  until a CVE chain escalates one to exploitable.
- Adding a dependency for a one-off utility that could be written in under 100
  lines. Every dep is a perpetual tax on security and maintenance cycles.

## Related Skills

- **security-review**: Dependency audit feeds into the broader security review
  — vulnerabilities found here are inputs to the OWASP assessment.
- **migration-planner**: Major version upgrades identified here become
  migration-planner tasks.
- **code-review-checklist**: QA Agent checks that new PRs don't introduce
  flagged dependencies.
- **context-management**: Audit results are documented in RESEARCH.md for
  cross-session persistence.
