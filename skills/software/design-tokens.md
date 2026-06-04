---
name: design-tokens
description: Foundational visual language — colors, typography, spacing, shadows, border radii, and motion timing as structured Tailwind CSS and CSS custom properties.
domain: software
auto-load: false
used-by:
  - developer-agent
  - ui-ux-agent
  - architect-agent
---

# Skill: Design Tokens

> **Skill ID:** SW-015
> **Cluster:** Design

## Purpose

Design tokens are the atomic building blocks of visual consistency. Without them, every component is a one-off decision. With them, the entire UI speaks the same language automatically. This skill defines how to create, structure, and enforce a token system for Tailwind CSS + shadcn/ui projects.

## When to Use

- Project kickoff (any project with a frontend)
- Establishing a new design system
- Refactoring an inconsistent UI into a unified system
- Onboarding a new project to the agents-master framework
- Before any UI/UX Agent or Developer Agent work on frontend components

## Token Architecture

### Layer 1: Primitive Tokens (Raw Values)

These are the raw palette — never referenced directly in components. They exist as the source material that semantic tokens pull from.

```css
/* primitives.css — NEVER use these in components directly */
:root {
  /* Color Primitives — Full scale per hue */
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  --color-slate-300: #cbd5e1;
  --color-slate-400: #94a3b8;
  --color-slate-500: #64748b;
  --color-slate-600: #475569;
  --color-slate-700: #334155;
  --color-slate-800: #1e293b;
  --color-slate-900: #0f172a;
  --color-slate-950: #020617;

  /* Brand hue — project-specific, defined in DESIGN.md */
  --color-brand-50: /* lightest tint */;
  --color-brand-100: ;
  --color-brand-200: ;
  --color-brand-300: ;
  --color-brand-400: ;
  --color-brand-500: /* base brand color */;
  --color-brand-600: ;
  --color-brand-700: ;
  --color-brand-800: ;
  --color-brand-900: ;
  --color-brand-950: /* darkest shade */;

  /* Spacing Primitives — 4px base unit */
  --space-0: 0;
  --space-px: 1px;
  --space-0.5: 0.125rem;  /* 2px */
  --space-1: 0.25rem;     /* 4px */
  --space-1.5: 0.375rem;  /* 6px */
  --space-2: 0.5rem;      /* 8px */
  --space-3: 0.75rem;     /* 12px */
  --space-4: 1rem;        /* 16px */
  --space-5: 1.25rem;     /* 20px */
  --space-6: 1.5rem;      /* 24px */
  --space-8: 2rem;        /* 32px */
  --space-10: 2.5rem;     /* 40px */
  --space-12: 3rem;       /* 48px */
  --space-16: 4rem;       /* 64px */
  --space-20: 5rem;       /* 80px */
  --space-24: 6rem;       /* 96px */

  /* Typography Primitives */
  --font-size-xs: 0.75rem;     /* 12px */
  --font-size-sm: 0.875rem;    /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg: 1.125rem;    /* 18px */
  --font-size-xl: 1.25rem;     /* 20px */
  --font-size-2xl: 1.5rem;     /* 24px */
  --font-size-3xl: 1.875rem;   /* 30px */
  --font-size-4xl: 2.25rem;    /* 36px */
  --font-size-5xl: 3rem;       /* 48px */
  --font-size-6xl: 3.75rem;    /* 60px */

  --line-height-none: 1;
  --line-height-tight: 1.25;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  --line-height-loose: 2;

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Border Radius Primitives */
  --radius-none: 0;
  --radius-sm: 0.125rem;   /* 2px */
  --radius-md: 0.375rem;   /* 6px */
  --radius-lg: 0.5rem;     /* 8px */
  --radius-xl: 0.75rem;    /* 12px */
  --radius-2xl: 1rem;      /* 16px */
  --radius-3xl: 1.5rem;    /* 24px */
  --radius-full: 9999px;

  /* Shadow Primitives */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  --shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);

  /* Motion Primitives */
  --duration-75: 75ms;
  --duration-100: 100ms;
  --duration-150: 150ms;
  --duration-200: 200ms;
  --duration-300: 300ms;
  --duration-500: 500ms;
  --duration-700: 700ms;
  --duration-1000: 1000ms;

  --ease-linear: linear;
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
}
```

### Layer 2: Semantic Tokens (Intent-Based)

These are what components actually reference. They map intent to primitives, enabling theme switching (dark mode, brand variations) by remapping this layer only.

```css
/* semantic.css — Components reference THESE */
:root {
  /* Surface Colors */
  --surface-primary: var(--color-white);
  --surface-secondary: var(--color-slate-50);
  --surface-tertiary: var(--color-slate-100);
  --surface-inverse: var(--color-slate-900);
  --surface-brand: var(--color-brand-500);
  --surface-brand-subtle: var(--color-brand-50);

  /* Text Colors */
  --text-primary: var(--color-slate-900);
  --text-secondary: var(--color-slate-600);
  --text-tertiary: var(--color-slate-400);
  --text-inverse: var(--color-white);
  --text-brand: var(--color-brand-600);
  --text-link: var(--color-brand-600);
  --text-link-hover: var(--color-brand-700);

  /* Border Colors */
  --border-primary: var(--color-slate-200);
  --border-secondary: var(--color-slate-100);
  --border-focus: var(--color-brand-500);
  --border-error: var(--color-red-500);
  --border-success: var(--color-green-500);

  /* Feedback Colors */
  --feedback-error: var(--color-red-500);
  --feedback-error-subtle: var(--color-red-50);
  --feedback-warning: var(--color-amber-500);
  --feedback-warning-subtle: var(--color-amber-50);
  --feedback-success: var(--color-green-500);
  --feedback-success-subtle: var(--color-green-50);
  --feedback-info: var(--color-blue-500);
  --feedback-info-subtle: var(--color-blue-50);

  /* Interactive Colors */
  --interactive-primary: var(--color-brand-500);
  --interactive-primary-hover: var(--color-brand-600);
  --interactive-primary-active: var(--color-brand-700);
  --interactive-secondary: var(--color-slate-100);
  --interactive-secondary-hover: var(--color-slate-200);
  --interactive-destructive: var(--color-red-500);
  --interactive-destructive-hover: var(--color-red-600);
  --interactive-disabled: var(--color-slate-200);

  /* Component Tokens */
  --card-bg: var(--surface-primary);
  --card-border: var(--border-primary);
  --card-shadow: var(--shadow-sm);
  --card-radius: var(--radius-xl);

  --input-bg: var(--surface-primary);
  --input-border: var(--border-primary);
  --input-border-focus: var(--border-focus);
  --input-radius: var(--radius-lg);
  --input-text: var(--text-primary);
  --input-placeholder: var(--text-tertiary);

  --button-radius: var(--radius-lg);
  --button-font-weight: var(--font-weight-medium);
}
```

### Layer 3: Tailwind Integration

Map semantic tokens into `tailwind.config.ts` so the entire team uses Tailwind utilities that resolve to your token system:

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        surface: {
          primary: "var(--surface-primary)",
          secondary: "var(--surface-secondary)",
          tertiary: "var(--surface-tertiary)",
          inverse: "var(--surface-inverse)",
          brand: "var(--surface-brand)",
          "brand-subtle": "var(--surface-brand-subtle)",
        },
        content: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          inverse: "var(--text-inverse)",
          brand: "var(--text-brand)",
          link: "var(--text-link)",
        },
        border: {
          DEFAULT: "var(--border-primary)",
          secondary: "var(--border-secondary)",
          focus: "var(--border-focus)",
          error: "var(--border-error)",
          success: "var(--border-success)",
        },
        feedback: {
          error: "var(--feedback-error)",
          "error-subtle": "var(--feedback-error-subtle)",
          warning: "var(--feedback-warning)",
          "warning-subtle": "var(--feedback-warning-subtle)",
          success: "var(--feedback-success)",
          "success-subtle": "var(--feedback-success-subtle)",
          info: "var(--feedback-info)",
          "info-subtle": "var(--feedback-info-subtle)",
        },
        interactive: {
          primary: "var(--interactive-primary)",
          "primary-hover": "var(--interactive-primary-hover)",
          "primary-active": "var(--interactive-primary-active)",
          secondary: "var(--interactive-secondary)",
          "secondary-hover": "var(--interactive-secondary-hover)",
          destructive: "var(--interactive-destructive)",
          "destructive-hover": "var(--interactive-destructive-hover)",
          disabled: "var(--interactive-disabled)",
        },
      },
      borderRadius: {
        card: "var(--card-radius)",
        input: "var(--input-radius)",
        button: "var(--button-radius)",
      },
      boxShadow: {
        card: "var(--card-shadow)",
      },
    },
  },
};
```

## Usage Rules

### Enforced by Developer Agent and UI/UX Agent:

1. **Never hardcode color values in components.** Use semantic token classes: `bg-surface-primary`, `text-content-secondary`, `border-focus`. If a value isn't in the token system, add it to the token system first.

2. **Never reference primitive tokens in components.** Components use semantic tokens only. Primitives exist exclusively as the backing store for semantic tokens.

3. **Spacing must use the scale.** Prefer `p-4`, `gap-6`, `mt-8` over arbitrary values like `p-[13px]`. Arbitrary values indicate a gap in the scale — add a token, don't hack around it.

4. **Typography uses the defined scale.** `text-sm`, `text-base`, `text-lg` — not `text-[15px]`. Pair with appropriate line-heights from the scale.

5. **Shadows use semantic names.** `shadow-card`, `shadow-sm`, `shadow-lg` — not custom `shadow-[0_2px_8px_rgba(0,0,0,0.12)]`.

6. **New tokens require justification.** If you need a token that doesn't exist, propose it to the token system — don't create a one-off CSS variable in a component file.

## Anti-Patterns

| Anti-Pattern | Why It Fails |
|---|---|
| `bg-[#3B82F6]` in a component | Hardcoded value. Breaks dark mode, breaks brand changes, invisible to the system. |
| `text-blue-500` for brand color | Semantic mismatch. What happens when the brand color changes? Find-and-replace across 200 files? |
| Different spacing values per developer | Visual inconsistency. One dev uses `p-3`, another uses `p-4` for the same type of container. Token system enforces consistency. |
| Component-level CSS variables | Token fragmentation. Tokens live in the global system, not scattered in component files. |
| Skipping the semantic layer | Dark mode becomes impossible. You can't remap `blue-500` to work in dark mode — you remap `--surface-primary`. |

## Files Created

```
/styles/
  tokens/
    primitives.css       <- Raw values, never referenced by components
    semantic.css         <- Intent-based tokens, components reference these
    dark.css             <- Dark mode overrides (remaps semantic to different primitives)
/tailwind.config.ts      <- Maps semantic tokens to Tailwind utilities
/DESIGN.md               <- Documents project-specific token decisions
```
