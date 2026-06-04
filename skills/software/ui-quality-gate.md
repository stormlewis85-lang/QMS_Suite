---
name: ui-quality-gate
domain: software
auto-load: false
used-by:
  - qa-agent
  - ui-ux-agent
  - developer-agent
description: >-
  Fire when the user asks for a UI review, frontend quality gate, UX heuristic
  audit, accessibility review, or pre-ship review of user-facing changes.
  Also fire when QA is gating a frontend PR or UI/UX is auditing a live
  interface. Trigger phrases: "UI review", "UX review", "frontend gate",
  "review this interface", "usability check", "Nielsen heuristics", "pre-ship
  UI check", "is this accessible". Do NOT fire for backend-only or API-only
  changes — use axe-core for automated a11y scans in isolation.
---

# Skill: UI Quality Gate

## Purpose

Comprehensive UI quality review combining web interface best practices, UX
heuristics, and accessibility standards into a single pass. This is the
quality gate that catches usability, accessibility, and frontend
implementation problems after code is written but before it ships.

## Mental Model

Automated checks (axe-core, Lighthouse) cover the objective layer — contrast
ratios, missing labels, bundle size. This gate covers the *judgment* layer —
does the affordance match user expectations, is the heuristic violation
critical or cosmetic, does the empty state earn its place. Flag severity
honestly: a critical heuristic violation ships as a critical bug, not as
polish-when-you-can.

## When to Load

- QA Agent is reviewing frontend code or user-facing changes
- UI/UX Agent is auditing an implemented interface
- Developer Agent is self-checking frontend work before handoff (Quick reference only — not full audit)

## When NOT to Load

- Backend-only changes with no UI surface
- API-only features
- Documentation or configuration tasks
- Non-software domains

---

## Gate 1: Web Interface Standards

Derived from production web interface guidelines. Check each applicable category.

### Accessibility Fundamentals
- [ ] All interactive elements are keyboard navigable (Tab, Enter, Escape, Arrow keys)
- [ ] Focus order follows visual layout — no focus traps
- [ ] Focus indicators are visible and meet 3:1 contrast ratio against adjacent colors
- [ ] All images have meaningful `alt` text (decorative images use `alt=""`)
- [ ] Form inputs have associated `<label>` elements (not just placeholder text)
- [ ] Error messages are programmatically associated with their fields via `aria-describedby`
- [ ] Color is never the sole indicator of state (error, success, active) — use icons, text, or patterns
- [ ] Text meets WCAG AA contrast minimums: 4.5:1 normal text, 3:1 large text (18px+ or 14px+ bold)
- [ ] Touch targets are minimum 44x44px on mobile
- [ ] ARIA roles and attributes are used correctly — no ARIA is better than wrong ARIA
- [ ] Page has a single `<h1>`, heading hierarchy is sequential (no skipping levels)
- [ ] Dynamic content changes are announced to screen readers via `aria-live` regions

### Semantic HTML
- [ ] `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>` used appropriately
- [ ] Lists use `<ul>`/`<ol>` — not divs styled as lists
- [ ] Tables use `<th>` with `scope` attributes for data tables
- [ ] Buttons are `<button>`, links are `<a>` — never reversed
- [ ] `<a>` tags have `href` attributes; buttons handling actions use `type="button"`

### Performance Basics
- [ ] Images are lazy-loaded below the fold (`loading="lazy"`)
- [ ] Largest Contentful Paint (LCP) element is optimized — no uncompressed hero images
- [ ] No layout shift from dynamically loaded content (skeleton screens or reserved space)
- [ ] Bundle size is reasonable — no importing entire libraries for single utilities
- [ ] Fonts specify `font-display: swap` or `optional` to prevent FOIT

### Responsive Design
- [ ] Layout works at 320px minimum width (no horizontal scroll)
- [ ] No fixed widths on content containers — use max-width with fluid layouts
- [ ] Navigation is usable on mobile — hamburger or equivalent pattern
- [ ] Font sizes use relative units (rem/em), not fixed px for body text
- [ ] Media queries use `min-width` (mobile-first) or are consistent in direction

---

## Gate 2: UX Heuristics (Nielsen + Norman)

Evaluate the interface against established UX principles. Not a checklist — these are judgment calls. Flag violations with severity.

### Nielsen's 10 Heuristics

| # | Heuristic | What to Check |
|---|-----------|---------------|
| 1 | **Visibility of system status** | Does the user always know what's happening? Loading states, progress indicators, confirmation feedback. |
| 2 | **Match between system and real world** | Does the UI use the user's language? No developer jargon in user-facing text. Icons match conventions. |
| 3 | **User control and freedom** | Can the user undo, go back, cancel, or escape? Is there always a clear exit? |
| 4 | **Consistency and standards** | Same action = same result everywhere. Buttons styled consistently. Terms used uniformly. |
| 5 | **Error prevention** | Does the design prevent errors before they happen? Confirmation dialogs for destructive actions. Disabled buttons when form is incomplete. |
| 6 | **Recognition over recall** | Are options visible or easily retrievable? No memorizing codes or IDs. Autocomplete, recent items, visible navigation. |
| 7 | **Flexibility and efficiency** | Keyboard shortcuts for power users. Sensible defaults. Batch operations where applicable. |
| 8 | **Aesthetic and minimalist design** | Every element earns its place. No decorative clutter. Information hierarchy is clear. |
| 9 | **Help users recognize, diagnose, recover from errors** | Error messages are specific ("Email format invalid" not "Error 422"). Suggest corrective action. |
| 10 | **Help and documentation** | If the feature needs explanation, is it available? Tooltips, onboarding hints, contextual help. |

### Norman's Design Principles

- **Affordance:** Do interactive elements look interactive? Can the user tell what's clickable/tappable without guessing?
- **Signifiers:** Are there clear indicators of where to act and how? Hover states, cursor changes, visual cues.
- **Feedback:** Does every action produce visible, immediate response? Button press states, form submission confirmations.
- **Mapping:** Does the layout of controls match their effect? Left/right arrows move content left/right. Vertical sliders control vertical properties.
- **Constraints:** Does the design prevent impossible or harmful actions? Disabled states, input validation, type restrictions.
- **Conceptual model:** Does the user's mental model match how the system works? If they expect a "save" button, is there one — or does it auto-save with clear indication?

### Severity Rating for Heuristic Violations

| Severity | Definition | Action |
|----------|-----------|--------|
| **Critical** | User cannot complete a core task | Must fix before ship |
| **Major** | User can complete the task but with significant friction or confusion | Should fix before ship |
| **Minor** | Noticeable but doesn't impede task completion | Log for next iteration |
| **Cosmetic** | Preference-level. Won't affect most users. | Note and move on |

---

## Gate 3: Frontend Anti-Patterns

Quick scan for common implementation mistakes that slip through automated testing.

- [ ] No `onClick` handlers on non-interactive elements (divs, spans) without `role` and `tabIndex`
- [ ] No inline styles for anything that should be themeable or consistent
- [ ] No `!important` in CSS except for genuinely necessary overrides
- [ ] No `z-index` arms race — values are systematic (10, 20, 30...), not arbitrary (9999)
- [ ] No text truncation without `title` attribute or tooltip showing full content
- [ ] No disabled buttons without explanation of why they're disabled
- [ ] No empty states that are actually empty — every list/table/feed needs an empty state message
- [ ] No modals without keyboard escape and outside-click dismiss
- [ ] No forms that lose data on accidental navigation without warning
- [ ] No auto-playing media without user-initiated control

---

## Output Format

When this skill is loaded during QA review, the reviewing agent produces:

```
### UI Quality Gate — [Task ID]
**Gate 1 (Web Standards):** X of Y checks passed. Failures: [list]
**Gate 2 (UX Heuristics):** [# Critical / # Major / # Minor violations]. Details: [list with severity]
**Gate 3 (Anti-Patterns):** X flags. [list]
**Verdict:** Pass | Conditional Pass (minor issues logged) | Fail (critical/major issues)
```
