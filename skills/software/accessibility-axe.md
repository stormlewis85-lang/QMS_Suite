---
name: accessibility-axe
domain: software
auto-load: false
used-by:
  - test-agent
  - qa-agent
  - developer-agent
description: >-
  Fire when the user asks to add a11y tests, write axe-core checks, integrate
  accessibility into Playwright E2E, interpret axe scan results, or fix flagged
  WCAG violations. Also fire during new-project test-infrastructure setup on
  any frontend codebase. Trigger phrases: "axe", "axe-core", "accessibility
  test", "a11y check", "WCAG violations", "screen reader test", "color contrast
  failing". Do NOT fire for manual a11y review — use ui-quality-gate instead.
---

# Skill: Accessibility Testing with axe-core

## Purpose

Automated WCAG 2.1/2.2 compliance testing using axe-core integrated into
Playwright E2E tests. Catches programmatically detectable accessibility
violations — the 30-40% of issues that can be found without manual testing.
This skill pairs with the ui-quality-gate skill, which handles the manual
review portion.

## Mental Model

axe-core is a *filter*, not a *verdict*. A clean axe scan means "no
machine-detectable WCAG violations" — it does not mean "accessible." Treat
axe as the cheap, automated first pass that frees human reviewers to focus on
the subjective issues (screen reader quality, focus management logic,
cognitive load). When deciding what to fail the build on, graduate from
critical/serious to strict as the codebase matures.

## When to Load

- Test Agent is writing accessibility tests or adding a11y checks to existing E2E tests
- QA Agent is interpreting axe scan results during review
- Developer Agent is fixing flagged accessibility violations
- New project setup includes accessibility test infrastructure

## When NOT to Load

- Backend-only changes with no UI
- Non-software domains
- Manual accessibility review (use ui-quality-gate instead)

---

## Setup

### Install
```bash
npm install -D @axe-core/playwright
```

### Integration with Playwright
```typescript
// tests/e2e/utils/a11y.ts
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect } from '@playwright/test';

export async function checkAccessibility(
  page: Page,
  options?: {
    include?: string[];    // CSS selectors to scope scan
    exclude?: string[];    // CSS selectors to exclude from scan
    tags?: string[];       // WCAG tags to test against
    disableRules?: string[]; // Specific rules to skip (use sparingly)
  }
) {
  let builder = new AxeBuilder({ page });

  if (options?.include) {
    for (const selector of options.include) {
      builder = builder.include(selector);
    }
  }
  if (options?.exclude) {
    for (const selector of options.exclude) {
      builder = builder.exclude(selector);
    }
  }
  if (options?.tags) {
    builder = builder.withTags(options.tags);
  }
  if (options?.disableRules) {
    builder = builder.disableRules(options.disableRules);
  }

  const results = await builder.analyze();
  return results;
}
```

---

## WCAG Tag Reference

axe-core uses tags to group rules by WCAG conformance level.

| Tag | Meaning | When to Use |
|-----|---------|------------|
| `wcag2a` | WCAG 2.1 Level A | Minimum legal compliance — always test |
| `wcag2aa` | WCAG 2.1 Level AA | Standard target — test by default |
| `wcag2aaa` | WCAG 2.1 Level AAA | Aspirational — test selectively |
| `wcag21a` | WCAG 2.1-specific Level A | Mobile/touch additions |
| `wcag21aa` | WCAG 2.1-specific Level AA | Mobile/touch additions |
| `wcag22aa` | WCAG 2.2 Level AA | Latest standard — includes focus appearance, dragging alternatives |
| `best-practice` | Not WCAG but recommended | Include unless noisy |

**Default test configuration:** `['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice']`

---

## Test Patterns

### Pattern 1: Full Page Scan (Every Page)
```typescript
import { test, expect } from '@playwright/test';
import { checkAccessibility } from '../utils/a11y';

test.describe('Accessibility — Dashboard', () => {
  test('dashboard page has no critical a11y violations', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const results = await checkAccessibility(page, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
    });

    // Fail on any violations at A or AA level
    expect(results.violations).toEqual([]);
  });
});
```

### Pattern 2: Component-Scoped Scan
```typescript
test('navigation menu is accessible', async ({ page }) => {
  await page.goto('/');
  const results = await checkAccessibility(page, {
    include: ['nav[aria-label="Main navigation"]'],
  });
  expect(results.violations).toEqual([]);
});
```

### Pattern 3: State-Specific Scans
Test accessibility in different UI states — errors, loading, modals open:
```typescript
test('login form error state is accessible', async ({ page }) => {
  await page.goto('/login');
  // Trigger error state
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Scan after error messages appear
  const results = await checkAccessibility(page, {
    include: ['form'],
  });
  expect(results.violations).toEqual([]);
});

test('open modal is accessible', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Delete account' }).click();
  // Scan the modal specifically
  const results = await checkAccessibility(page, {
    include: ['[role="dialog"]'],
  });
  expect(results.violations).toEqual([]);
});
```

### Pattern 4: Soft Assertion with Reporting
For existing projects adding a11y testing gradually — log violations without failing the build:
```typescript
test('catalog page a11y audit (reporting)', async ({ page }) => {
  await page.goto('/catalog');
  const results = await checkAccessibility(page);

  // Log violations for tracking without blocking
  if (results.violations.length > 0) {
    console.warn(`A11Y VIOLATIONS (${results.violations.length}):`);
    for (const violation of results.violations) {
      console.warn(`  [${violation.impact}] ${violation.id}: ${violation.description}`);
      console.warn(`    Affected: ${violation.nodes.length} element(s)`);
      console.warn(`    Help: ${violation.helpUrl}`);
    }
  }

  // Only fail on critical/serious — warn on moderate/minor
  const criticalViolations = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious'
  );
  expect(criticalViolations).toEqual([]);
});
```

---

## Interpreting Results

axe-core returns violations with four severity levels:

| Impact | Meaning | Action |
|--------|---------|--------|
| **critical** | Users with disabilities are completely blocked | Must fix before ship |
| **serious** | Users with disabilities face significant barriers | Must fix before ship |
| **moderate** | Users with disabilities experience some difficulty | Should fix, can ship with tracking |
| **minor** | Minor inconvenience, still usable | Log for next iteration |

### Violation Structure
```typescript
{
  id: 'color-contrast',          // Rule ID
  impact: 'serious',             // Severity
  description: 'Elements must have sufficient color contrast',
  help: 'Elements must meet minimum color contrast ratio thresholds',
  helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/color-contrast',
  nodes: [                       // Affected DOM elements
    {
      html: '<p class="light-text">...</p>',  // The element
      target: ['.light-text'],                  // CSS selector
      failureSummary: 'Fix any of the following:...',
    }
  ]
}
```

### Common Violations and Fixes

| Rule ID | What It Catches | Typical Fix |
|---------|----------------|-------------|
| `color-contrast` | Text doesn't meet contrast ratio | Adjust foreground/background colors |
| `image-alt` | Images missing alt text | Add descriptive `alt` attribute |
| `label` | Form inputs without labels | Associate `<label>` with `for` attribute |
| `button-name` | Buttons without accessible name | Add text content or `aria-label` |
| `link-name` | Links without accessible name | Add text content or `aria-label` |
| `heading-order` | Skipped heading levels (h1 → h3) | Fix heading hierarchy |
| `region` | Content outside landmark regions | Wrap in `<main>`, `<nav>`, etc. |
| `aria-required-attr` | ARIA roles missing required attributes | Add required `aria-*` attributes |
| `duplicate-id` | Multiple elements share an ID | Make IDs unique |
| `focus-order-semantics` | Focusable elements in wrong DOM order | Reorder DOM to match visual layout |

---

## Disabling Rules (Use Sparingly)

Sometimes a rule must be disabled — but never silently.

```typescript
// ALWAYS document WHY a rule is disabled
const results = await checkAccessibility(page, {
  disableRules: [
    // Disabled: third-party widget injects inaccessible markup
    // we can't control. Tracked in TASK-047.
    'frame-title',
  ],
});
```

**Rules for disabling rules:**
1. Never disable `color-contrast`, `image-alt`, `label`, `button-name`, or `link-name` — these are too fundamental
2. Always document the reason inline
3. Track disabled rules as tech debt in TASKS.md
4. Re-evaluate disabled rules every quarter

---

## CI Integration

### Accessibility Report Generation
```typescript
// In playwright.config.ts — add a11y reporter
import { type FullConfig } from '@playwright/test';

// Custom reporter that extracts a11y results
// Writes summary to test-results/a11y-report.json
```

### Fail Thresholds for CI
```typescript
// Strict — any violation fails the build
expect(results.violations).toEqual([]);

// Graduated — only critical/serious fail the build
const blocking = results.violations.filter(
  v => v.impact === 'critical' || v.impact === 'serious'
);
expect(blocking).toEqual([]);
```

**Recommended rollout:** Start with graduated thresholds, tighten to strict as violations are resolved.

---

## What axe-core Cannot Catch

axe-core is powerful but covers ~30-40% of WCAG criteria. The rest requires manual review (handled by ui-quality-gate skill):

- Keyboard navigation flow and focus management logic
- Screen reader announcement quality (correct but unhelpful labels)
- Cognitive accessibility (confusing flows, overwhelming information)
- Motion/animation sensitivity beyond `prefers-reduced-motion`
- Content readability and plain language
- Correct heading hierarchy *meaning* (axe checks structure, not semantic accuracy)
- Touch gesture alternatives (axe checks for some, not all)

**The combo:** axe-core catches the objective, measurable violations. ui-quality-gate catches the subjective, experiential issues. Both are needed.
