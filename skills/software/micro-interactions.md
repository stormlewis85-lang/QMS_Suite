---
name: micro-interactions
description: Animation patterns, transition standards, and micro-interaction specs for Tailwind CSS and Framer Motion projects.
domain: software
auto-load: false
used-by:
  - developer-agent
  - ui-ux-agent
---

# Skill: Micro-interactions & Animation

> **Skill ID:** SW-017
> **Cluster:** Design

## Purpose

Animation is the difference between "functional" and "feels great." But bad animation — too slow, too busy, inconsistent timing — is worse than none. This skill codifies when and how to animate so every interaction feels intentional and polished.

## Core Principle

**Every animation must answer: what is this helping the user understand?**

Animations serve exactly three purposes:
1. **Feedback** — Confirming the user's action was received (button press, form submit)
2. **Orientation** — Showing where something came from or went (page transitions, drawers)
3. **Focus** — Drawing attention to something important (notifications, errors)

If an animation doesn't serve one of these three purposes, delete it.

## Timing Standards

### Duration Scale

| Category | Duration | Use Case |
|---|---|---|
| Micro | 100-150ms | Hover states, color changes, opacity toggles |
| Short | 200-250ms | Button feedback, checkbox toggles, small reveals |
| Medium | 300-400ms | Drawers, modals, card expansions, page section reveals |
| Long | 500-700ms | Page transitions, complex orchestrations, hero reveals |
| Dramatic | 800-1000ms | One-time reveal animations (landing page hero, onboarding) |

### Easing Standards

```css
--ease-interactive: cubic-bezier(0.2, 0, 0, 1);   /* Quick interactions */
--ease-enter: cubic-bezier(0, 0, 0.2, 1);          /* Entrances */
--ease-exit: cubic-bezier(0.4, 0, 1, 1);           /* Exits */
--ease-emphasis: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy emphasis */
--ease-spring: cubic-bezier(0.22, 1, 0.36, 1);     /* Natural spring */
```

**Rules:**
- Never use `linear` for UI transitions (it feels robotic)
- Never use `ease` (CSS default) — it's a compromise that feels like nothing
- Entrances use deceleration (fast start, slow finish) — `ease-enter`
- Exits use acceleration (slow start, fast finish) — `ease-exit`

## Tailwind Transitions

### Standard Interactive Elements

```tsx
// Buttons
<button className="transition-colors duration-150 ease-interactive
  bg-interactive-primary hover:bg-interactive-primary-hover
  active:bg-interactive-primary-active">

// Links
<a className="transition-colors duration-100
  text-content-link hover:text-content-link-hover">

// Cards with hover elevation
<div className="transition-all duration-200 ease-interactive
  shadow-card hover:shadow-lg hover:-translate-y-0.5">

// Icon buttons with scale
<button className="transition-transform duration-150 ease-emphasis
  hover:scale-110 active:scale-95">
```

### Reveal and Show/Hide

```tsx
// Fade in/out
<div className={cn(
  "transition-opacity duration-200",
  isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
)}>

// Slide + fade (drawers, panels)
<div className={cn(
  "transition-all duration-300 ease-enter",
  isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
)}>

// Collapse (accordions)
<div className={cn(
  "grid transition-[grid-template-rows] duration-300 ease-interactive",
  isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
)}>
  <div className="overflow-hidden">{content}</div>
</div>
```

## Framer Motion Patterns

### Page / Section Entrance

```tsx
import { motion } from "framer-motion";

const FadeUp = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

const StaggerContainer = ({ children }) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: { transition: { staggerChildren: 0.08 } },
    }}
  >
    {children}
  </motion.div>
);

const StaggerItem = ({ children }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 16 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
    }}
  >
    {children}
  </motion.div>
);
```

### Layout Animations

```tsx
<motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
  {content}
</motion.div>

<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      key="unique-key"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>
```

### Scroll-Triggered Reveals

```tsx
import { motion, useInView } from "framer-motion";

const ScrollReveal = ({ children }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};
```

## Loading & Feedback Animations

```tsx
// Skeleton pulse
<div className="animate-pulse">
  <div className="h-4 bg-surface-tertiary rounded w-3/4 mb-2" />
  <div className="h-4 bg-surface-tertiary rounded w-1/2" />
</div>

// Spinner
<div className="h-5 w-5 animate-spin rounded-full border-2
  border-content-tertiary border-t-interactive-primary" />

// Checkmark animation (success)
<motion.svg viewBox="0 0 24 24"
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
>
  <motion.path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth={2} />
</motion.svg>
```

## Performance Rules

1. **Only animate `transform` and `opacity`.** These are GPU-composited and don't trigger layout.
2. **Use `will-change` sparingly.** Only on elements about to animate, remove after.
3. **Respect `prefers-reduced-motion`.** Always.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

4. **Limit simultaneous animations.** Max 3-4 elements at once. Use stagger to sequence.
5. **No animation on scroll position changes.** Parallax is a performance killer on mobile.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Everything bounces on hover | Bounce easing for emphasis only, not standard interactions |
| 800ms transition on a button hover | Micro interactions: 100-150ms. The user shouldn't wait. |
| Animation on page load blocking content | Content appears first, animation enhances. Never gate content behind animation. |
| Different timing for the same type of interaction | Standardize: all hover states = same duration, all modals = same entrance |
| Animating `height: auto` with CSS transitions | Use the `grid-rows` trick or Framer Motion's `layout` animation |
| Parallax scrolling | Performance killer on mobile, usually adds nothing. Avoid. |
| Animation playing every time a component re-renders | Use `once: true` on scroll reveals, or `AnimatePresence` with proper keys |
