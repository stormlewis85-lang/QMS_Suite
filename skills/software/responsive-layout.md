---
name: responsive-layout
description: Mobile-first responsive layout patterns, breakpoint strategy, container behavior, and grid systems for Tailwind CSS projects.
domain: software
auto-load: false
used-by:
  - developer-agent
  - ui-ux-agent
---

# Skill: Responsive Layout Patterns

> **Skill ID:** SW-016
> **Cluster:** Design

## Purpose

Responsive layout is the structural skeleton of every page. Bad responsive behavior is the fastest way to look amateur. This skill codifies breakpoint strategy, container patterns, and grid approaches so every page in every project behaves consistently across devices.

## When to Use

- Building any page layout or page-level component
- Establishing the responsive grid system at project kickoff
- Reviewing layouts for cross-device consistency
- Building complex multi-column layouts
- Implementing navigation patterns that shift across breakpoints

## Breakpoint Strategy

Use Tailwind's default breakpoints. Don't add custom breakpoints unless a specific device target demands it.

```
sm:  640px   — Large phones / small tablets (landscape phone)
md:  768px   — Tablets (portrait iPad)
lg:  1024px  — Small laptops / tablets (landscape iPad)
xl:  1280px  — Standard desktops
2xl: 1536px  — Large desktops / ultrawide
```

### Mobile-First Mandate

All styles start at the smallest viewport and scale up. This is not optional.

```tsx
// CORRECT — mobile-first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

// WRONG — desktop-first (setting 3 cols then overriding down)
<div className="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-6 sm:gap-4">
```

**The Rule:** If you're writing `sm:` to undo something, you're doing it backwards. Base styles = mobile. Breakpoint prefixes = progressive enhancement.

## Container Strategy

### Standard Content Container

```tsx
<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
  {/* Page content */}
</div>
```

### Container Widths by Content Type

| Content Type | Max Width | Class | Rationale |
|---|---|---|---|
| Prose / Blog | 65ch (~720px) | `max-w-prose` | Optimal reading line length |
| Dashboard | 1536px | `max-w-screen-2xl` | Maximize data density |
| Marketing / Landing | 1280px | `max-w-7xl` | Standard marketing width |
| Form-heavy | 640px | `max-w-xl` | Forms don't need width |
| Auth pages | 448px | `max-w-md` | Tight, focused UI |

### Full-Bleed with Contained Content

```tsx
<section className="bg-surface-secondary">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
    {/* Content stays contained, background bleeds */}
  </div>
</section>
```

## Grid Patterns

### Auto-Responsive Card Grid

```tsx
// Option A: Explicit breakpoint control
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

// Option B: CSS Grid auto-fill (cards self-organize based on available space)
<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
```

Use Option A when you need exact control over column counts at each breakpoint. Use Option B when the content is uniform and you want the grid to self-organize.

### Sidebar + Content Layout

```tsx
<div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
  <aside className="w-full lg:w-64 xl:w-72 shrink-0">
    {/* Sidebar content */}
  </aside>
  <main className="flex-1 min-w-0">
    {/* min-w-0 prevents flex child overflow */}
  </main>
</div>
```

### Two-Column Feature Section (Marketing)

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
  <div className="order-2 lg:order-1">
    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Feature headline</h2>
    <p className="mt-4 text-content-secondary text-base lg:text-lg">Feature description</p>
  </div>
  <div className="order-1 lg:order-2">
    {/* Image or illustration */}
  </div>
</div>
```

### Responsive Table Pattern

```tsx
// Approach 1: Horizontal scroll (data-heavy tables)
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <div className="inline-block min-w-full align-middle">
    <table className="min-w-full">{/* Standard table markup */}</table>
  </div>
</div>

// Approach 2: Card stack (fewer columns, user-facing)
<div className="hidden sm:block">
  <table>{/* Full table */}</table>
</div>
<div className="sm:hidden space-y-4">
  {data.map(item => (
    <div key={item.id} className="rounded-card border p-4 space-y-2">
      <div className="font-medium">{item.name}</div>
      <div className="text-sm text-content-secondary">{item.status}</div>
    </div>
  ))}
</div>
```

## Spacing Rhythm

| Context | Mobile | Tablet+ | Desktop |
|---|---|---|---|
| Section padding (vertical) | `py-12` (48px) | `sm:py-16` (64px) | `lg:py-24` (96px) |
| Between major blocks | `space-y-8` | `sm:space-y-12` | `lg:space-y-16` |
| Between related items | `space-y-4` | `sm:space-y-6` | same |
| Grid gaps | `gap-4` | `sm:gap-6` | `lg:gap-8` |
| Component internal padding | `p-4` | `sm:p-6` | same |

## Typography Scaling

```tsx
// Hero heading
<h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight">

// Section heading
<h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">

// Subsection heading
<h3 className="text-xl sm:text-2xl font-semibold">

// Body copy
<p className="text-base lg:text-lg text-content-secondary">

// Small / caption
<span className="text-xs sm:text-sm text-content-tertiary">
```

## Navigation Patterns

### Standard Header

```tsx
<header className="sticky top-0 z-50 border-b bg-surface-primary/80 backdrop-blur-sm">
  <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
    <div className="flex-shrink-0">{/* Logo */}</div>
    <div className="hidden md:flex items-center gap-8">{/* Nav links */}</div>
    <button className="md:hidden">{/* Hamburger icon */}</button>
  </nav>
</header>
```

**Rules:**
- Breakpoint for nav collapse: `md:` (768px). Don't try to squeeze desktop nav into smaller viewports.
- Mobile nav: slide-out panel or full-screen overlay. Never a cramped dropdown.
- Sticky header must have `backdrop-blur` and semi-transparent background for content scrolling beneath.

## Testing Checklist

- [ ] Tested at 320px width (smallest common phone — iPhone SE)
- [ ] Tested at 375px (standard iPhone)
- [ ] Tested at 768px (iPad portrait)
- [ ] Tested at 1024px (iPad landscape / small laptop)
- [ ] Tested at 1280px (standard desktop)
- [ ] Tested at 1920px (full HD)
- [ ] No horizontal scroll at any viewport (except intentional overflow patterns)
- [ ] No text truncation that hides critical content
- [ ] Touch targets >= 44px x 44px on mobile
- [ ] Images and media scale proportionally without breaking layout
- [ ] Forms are usable at every breakpoint

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Desktop-first CSS (`grid-cols-3` then overriding smaller) | Start with `grid-cols-1`, add breakpoints up |
| Fixed pixel widths on containers | Use `max-w-*` with `w-full` |
| Hiding content on mobile with `hidden sm:block` as primary strategy | Redesign the layout for mobile, don't just hide things |
| Text too small on mobile to fit more content | Readability > density. `text-sm` minimum for body text on mobile |
| Ignoring landscape phone orientation | Test at 568px x 320px (iPhone SE landscape) |
| Nav links wrapping instead of collapsing to hamburger | Set a breakpoint for nav collapse |
