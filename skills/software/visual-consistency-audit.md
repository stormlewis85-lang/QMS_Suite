---
name: visual-consistency-audit
description: >-
  Fire when the user asks to audit visual consistency, catch design drift,
  enforce the design system across an app, compare pages/components for
  inconsistencies, or polish before launch. Also fire during QA of a UI change
  that spans multiple surfaces. Trigger phrases: "visual audit", "design
  drift", "inconsistent spacing", "inconsistent colors", "inconsistent
  typography", "consistency check", "design system compliance", "why do these
  screens feel off".
domain: software
auto-load: false
used-by:
  - qa-agent
  - ui-ux-agent
---

# Skill: Visual Consistency Audit

> **Skill ID:** SW-023
> **Cluster:** Branding

## Purpose

Visual inconsistency is death by a thousand cuts. No single mismatch kills the experience, but accumulated drift — slightly different grays, inconsistent padding, two icon styles, mixed border radii — makes the product feel unfinished. This skill provides the structured audit process that catches drift before users see it.

## When to Use

- After every sprint with frontend changes
- Before any public launch or major release
- When onboarding a new developer to frontend work
- When a user reports that "something feels off"

## Audit Dimensions

### 1. Color Consistency

```
[] All colors reference semantic tokens (no hardcoded hex values in components)
[] Brand color used consistently for primary actions and accents
[] Neutral grays come from one family (all slate OR all gray — never mixed)
[] Feedback colors consistent across all components
[] Hover states use consistent color shifts
[] Disabled states use consistent treatment
[] No "almost the same" colors — if two elements should match, they must match exactly
[] Dark mode colors are properly remapped (not just inverted)
```

### 2. Typography Consistency

```
[] Only approved font families used (check computed styles, not just source code)
[] Font sizes follow the type scale — no arbitrary sizes
[] Font weights are consistent per element type
[] Line heights match the defined scale
[] Text colors use semantic tokens
[] No orphaned text styles
[] Heading hierarchy is consistent visually and semantically
```

### 3. Spacing Consistency

```
[] All spacing values come from the spacing scale (4px base unit)
[] Component internal padding is consistent (all cards use same padding)
[] Gap between similar elements is consistent
[] Section vertical padding follows responsive rhythm
[] Margin between form fields is consistent
[] No arbitrary spacing values
[] Alignment: elements that should be aligned are pixel-perfect aligned
```

### 4. Border and Shape Consistency

```
[] Border radii follow the defined scale
[] Border widths are consistent (all borders 1px unless intentionally different)
[] Border colors reference semantic tokens
[] Divider treatment is consistent
[] Card-like components all share the same border/shadow/radius treatment
[] No mixed border styles
```

### 5. Shadow Consistency

```
[] Shadow values come from the defined shadow scale
[] Elevation is logical (modals > dropdowns > cards > surface)
[] Dark mode shadows replaced with borders or ring
[] No arbitrary shadows
[] Shadow direction is consistent across all components
```

### 6. Icon Consistency

```
[] All icons come from ONE icon family
[] Icon sizes are consistent per context (16px inline, 20px in buttons, 24px standalone)
[] Icon stroke width is consistent
[] Icon color follows text color conventions
[] No mixing filled and outlined icons
[] Custom icons match the style of the icon library
```

### 7. Interactive State Consistency

```
[] Hover states exist on ALL interactive elements
[] Hover behavior is consistent per element type
[] Focus states are visible and consistent
[] Active/pressed states provide feedback
[] Disabled states look consistent
[] Cursor changes appropriately
[] Transitions are consistent (same duration and easing for same type of interaction)
```

### 8. Component Pattern Consistency

```
[] Similar components look similar
[] Buttons of the same type are identical in all contexts
[] Form inputs are identical in style across all forms
[] Modal/dialog style is consistent
[] Navigation patterns are consistent between sections
[] Badge/tag/pill styling is consistent
[] Avatar/user display is consistent
[] Timestamp display format is consistent
```

## Audit Process

### Step 1: Screenshot Sweep
Take screenshots of every major page and component. Lay them side by side. Visual inconsistencies become obvious in comparison.

### Step 2: Token Audit
Search the codebase for hardcoded values:
```bash
# Find hardcoded colors
grep -rn "#[0-9a-fA-F]{3,6}" --include="*.tsx" --include="*.css" src/

# Find arbitrary Tailwind values
grep -rn "\[.*px\]\|\[.*rem\]\|\[#" --include="*.tsx" src/

# Find inline styles
grep -rn "style=" --include="*.tsx" src/
```

### Step 3: Dimension Check
Walk through each audit dimension above. Mark failures with specific file and component.

### Step 4: Severity Classification

| Severity | Description | Action |
|---|---|---|
| **P0 — Brand violation** | Wrong brand color, wrong font family, misused logo | Fix immediately |
| **P1 — Inconsistency** | Mixed border radii, inconsistent spacing, different hover behaviors | Fix in current sprint |
| **P2 — Polish** | Subtle alignment issues, minor spacing differences | Fix before next release |
| **P3 — Nitpick** | Technically inconsistent but not user-perceptible | Log for next cleanup pass |

### Step 5: Report

```markdown
## Visual Consistency Audit — [Date]

### Summary
- P0 issues: [count]
- P1 issues: [count]
- P2 issues: [count]
- P3 issues: [count]

### Findings
[For each finding:]
- **Component/Page:** [where]
- **Issue:** [what's wrong]
- **Expected:** [what it should be]
- **Severity:** P0/P1/P2/P3
- **Fix:** [specific change needed]
```

## Gotchas

- Audits that become lists of 200 P3 findings drown the P0 issues. Stop at the first 10 P0/P1 findings; a shorter report gets fixed, a long one gets filed.
- Auditing against a Figma that's out of date. Verify the design source matches the current intent before grading the implementation against it — otherwise you're flagging correct code.
- Missing the *interactive* states. Most visual inconsistency lives in hover, focus, active, disabled, and error states that audits of default renders never see.
- Auditing only desktop widths. Mobile and tablet breakpoints are where spacing and typography most commonly diverge from the system.
