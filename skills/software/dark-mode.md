---
name: dark-mode
description: Complete dark mode implementation — color remapping, toggle patterns, persistence, and component considerations. Depends on SW-015 design-tokens.
domain: software
auto-load: false
used-by:
  - developer-agent
  - ui-ux-agent
---

# Skill: Dark Mode Implementation

> **Skill ID:** SW-018
> **Cluster:** Design
> **Depends on:** SW-015 (design-tokens)

## Purpose

Dark mode is a user expectation, not a feature. But bad dark mode — inverted colors that wash out, OLED-hostile pure blacks, inconsistent component states — is worse than no dark mode. This skill ensures dark mode is a first-class experience, not an afterthought.

## Prerequisites

**SW-015 (Design Tokens) must be implemented first.** Dark mode works by remapping semantic tokens to different primitives. Without the token layer, dark mode becomes hundreds of individual overrides.

## Color Remapping Strategy

### The Rule: Remap Semantics, Not Primitives

Dark mode doesn't invert colors. It reassigns semantic tokens to different primitive values that work on dark backgrounds.

```css
/* dark.css — Semantic token overrides for dark mode */
.dark {
  --surface-primary: var(--color-slate-900);
  --surface-secondary: var(--color-slate-800);
  --surface-tertiary: var(--color-slate-700);
  --surface-inverse: var(--color-slate-50);
  --surface-brand: var(--color-brand-400);
  --surface-brand-subtle: var(--color-brand-950);

  --text-primary: var(--color-slate-50);
  --text-secondary: var(--color-slate-300);
  --text-tertiary: var(--color-slate-500);
  --text-inverse: var(--color-slate-900);
  --text-brand: var(--color-brand-400);
  --text-link: var(--color-brand-400);
  --text-link-hover: var(--color-brand-300);

  --border-primary: var(--color-slate-700);
  --border-secondary: var(--color-slate-800);
  --border-focus: var(--color-brand-400);

  --feedback-error: var(--color-red-400);
  --feedback-error-subtle: color-mix(in srgb, var(--color-red-500) 15%, var(--color-slate-900));
  --feedback-warning: var(--color-amber-400);
  --feedback-warning-subtle: color-mix(in srgb, var(--color-amber-500) 15%, var(--color-slate-900));
  --feedback-success: var(--color-green-400);
  --feedback-success-subtle: color-mix(in srgb, var(--color-green-500) 15%, var(--color-slate-900));
  --feedback-info: var(--color-blue-400);
  --feedback-info-subtle: color-mix(in srgb, var(--color-blue-500) 15%, var(--color-slate-900));

  --interactive-primary: var(--color-brand-500);
  --interactive-primary-hover: var(--color-brand-400);
  --interactive-primary-active: var(--color-brand-300);
  --interactive-secondary: var(--color-slate-800);
  --interactive-secondary-hover: var(--color-slate-700);
  --interactive-destructive: var(--color-red-500);
  --interactive-destructive-hover: var(--color-red-400);
  --interactive-disabled: var(--color-slate-700);

  --card-bg: var(--surface-primary);
  --card-border: var(--border-primary);
  --card-shadow: 0 0 0 1px var(--border-primary);

  --input-bg: var(--color-slate-800);
  --input-border: var(--color-slate-600);
}
```

### Critical Dark Mode Color Rules

1. **Never use pure black (`#000000`) as a background.** Use `slate-900` or `slate-950`. Pure black creates a "hole in the screen" effect.
2. **Reduce text contrast slightly.** Use `slate-50` instead of pure white for reduced eye strain.
3. **Brand colors shift lighter.** `500` on white becomes `400` on dark.
4. **Shadows become borders.** Box shadows are invisible on dark backgrounds. Use `ring-1 ring-border-primary`.
5. **Feedback colors desaturate.** Shift to `400` variants on dark backgrounds.

## Toggle Implementation

### Tailwind Dark Mode Setup

```typescript
// tailwind.config.ts
const config: Config = {
  darkMode: "class", // Class-based, not media-query based
};
```

### Theme Provider (Next.js)

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}>({ theme: "system", resolvedTheme: "light", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    let resolved: "light" | "dark";
    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      resolved = theme;
    }
    root.classList.toggle("dark", resolved === "dark");
    setResolvedTheme(resolved);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      document.documentElement.classList.toggle("dark", resolved === "dark");
      setResolvedTheme(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### Preventing Flash of Wrong Theme (FOWT)

```tsx
// app/layout.tsx — blocking script in <head>
<head>
  <script dangerouslySetInnerHTML={{
    __html: `
      (function() {
        try {
          var theme = localStorage.getItem('theme');
          var dark = theme === 'dark' ||
            (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          if (dark) document.documentElement.classList.add('dark');
        } catch(e) {}
      })();
    `,
  }} />
</head>
```

## Component Considerations

### Images
```tsx
// Dark mode image variants
<img src="/images/diagram-light.png" className="dark:hidden" alt="Diagram" />
<img src="/images/diagram-dark.png" className="hidden dark:block" alt="Diagram" />

// Screenshots: add border so they don't float on dark
<img className="rounded-lg border border-border-primary" />
```

### Charts and Data Visualization
- Chart backgrounds: transparent, inherit from container
- Grid lines: `border-primary` token
- Data colors: use `400` series in dark
- Axis labels: `text-secondary` token

## Testing Checklist

- [ ] No flash of wrong theme on initial load (FOWT eliminated)
- [ ] Theme toggle cycles through Light / System / Dark correctly
- [ ] Theme persists across page navigation and browser restart
- [ ] System preference changes are respected when "System" is selected
- [ ] No pure black backgrounds (unless OLED variant)
- [ ] No pure white text — use `slate-50` equivalent
- [ ] All feedback colors visible in both modes
- [ ] Shadows replaced with borders where shadows become invisible
- [ ] Form inputs clearly distinguishable from their containers
- [ ] Focus states visible in both modes

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Inverting all colors with CSS `filter: invert(1)` | Remap semantics properly |
| Pure black backgrounds | Use dark grays (`slate-900` / `slate-950`) |
| Same brand color in both modes | Brand colors shift lighter (`500` -> `400`) |
| Hard-coding colors in components | Token system is prerequisite |
| Separate CSS files for dark mode | Use `.dark` class override system |
| Forgetting `prefers-color-scheme` in `<meta>` | Add `<meta name="color-scheme" content="light dark" />` |
