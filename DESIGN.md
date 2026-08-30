# OneQMS Design System

> **Source of truth for all visual decisions across the OneQMS suite.**
> Read this before any UI/frontend work. DESIGN.md wins over agent judgment, developer preference, and existing inconsistencies. Update deliberately through UI/UX Agent, not by accepting drift.
>
> **Applies to:** OneLPA, OneCAPA, OnePFMEA, OnePPAP, and all future One[Module] apps.
> **Reference implementation:** OneLPA (Awesome Audits) v8 — the most mature app in the suite.

---

## Brand Identity

**Name:** OneQMS (umbrella). Each module: One[Module] in PascalCase.
- Text: Always "One" spelled out — OneCAPA, OneLPA, OnePPAP
- Logo mark: The numeral "1" may appear as a visual anchor in the logo only
- Never: 1CAPA, 1LPA, oneCAPA, one-capa

**Personality:** Professional, unified, precise, efficient.
- Enterprise quality software for automotive manufacturing — not a startup toy
- Plant floor users need speed — zero friction, zero wasted taps
- One brand, one system, one experience across every module

**App Identity Pattern:**
- Sidebar logo: Two-letter abbreviation on a teal rounded square (e.g., "LP" for OneLPA, "CA" for OneCAPA)
- Below the mark: App name + subtitle (e.g., "LPA" / "Process Audit")

---

## Color Palette

### Primary — Brand Teal

The teal is the heart of OneQMS. It appears on active nav, primary buttons, success states, chart series 1, progress bars, and accent borders.

| Token | HSL | Usage |
|-------|-----|-------|
| `--primary` (light) | `168 80% 32%` | Primary buttons, active states, accent borders |
| `--primary` (dark) | `168 76% 42%` | Same roles, boosted for dark backgrounds |
| `--primary-foreground` | `0 0% 100%` | Text on primary surfaces (always white) |

### Semantic Colors

| Token | HSL | Usage |
|-------|-----|-------|
| `--destructive` | `347 77% 50%` | Errors, delete actions, overdue counts, critical badges |
| `--warning` | `38 92% 50%` | Caution, amber indicators, active findings icon |
| `--success` | `168 80% 32%` | Same as primary — confirmed, complete, passed |
| `--success-foreground` | `0 0% 100%` | Text on success surfaces |

### Light Mode (Default)

| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | `210 20% 98%` | Page background — cool off-white, not pure white |
| `--foreground` | `222 47% 11%` | Primary text — near-black with blue undertone |
| `--card` | `0 0% 100%` | Card surfaces — pure white |
| `--card-foreground` | `222 47% 11%` | Text on cards |
| `--secondary` | `210 20% 96%` | Secondary surfaces, hover backgrounds |
| `--secondary-foreground` | `222 47% 11%` | Text on secondary surfaces |
| `--muted` | `210 20% 96%` | Subtle backgrounds |
| `--muted-foreground` | `215 16% 47%` | Secondary text, metadata, timestamps |
| `--accent` | `168 80% 32%` | Accent = primary teal |
| `--accent-foreground` | `0 0% 100%` | Text on accent surfaces |
| `--border` | `214 20% 92%` | Borders, dividers |
| `--input` | `214 20% 92%` | Input field borders |
| `--ring` | `168 80% 32%` | Focus rings — teal |
| `--radius` | `0.75rem` | Base border radius (12px) |

### Dark Mode

| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | `222 47% 6%` | Page background — navy-tinted, NOT pure black |
| `--foreground` | `210 20% 98%` | Primary text |
| `--card` | `222 47% 9%` | Card surfaces |
| `--card-foreground` | `210 20% 98%` | Text on cards |
| `--secondary` | `222 40% 14%` | Elevated surfaces |
| `--secondary-foreground` | `210 20% 98%` | Text on secondary |
| `--muted` | `222 40% 14%` | Subtle backgrounds |
| `--muted-foreground` | `215 16% 57%` | Secondary text |
| `--accent` | `168 76% 42%` | Accent teal — boosted for dark |
| `--border` | `222 30% 18%` | Borders |
| `--input` | `222 30% 18%` | Input borders |
| `--ring` | `168 76% 42%` | Focus rings |

### Sidebar (Always Dark)

The sidebar is always dark regardless of light/dark mode. This is a OneQMS signature.

| Token | HSL | Usage |
|-------|-----|-------|
| `--sidebar` | `222 47% 11%` | Sidebar background — same as light foreground |
| `--sidebar-foreground` | `210 20% 90%` | Sidebar text |
| `--sidebar-muted` | `222 40% 18%` | Hover/active background on nav items |
| `--sidebar-accent` | `168 80% 32%` | Active nav indicator — teal highlight |

### Chart Palette

| Token | HSL | Usage |
|-------|-----|-------|
| `--chart-1` | `168 80% 32%` | Primary series (teal) |
| `--chart-2` | `38 92% 50%` | Secondary series (amber) |
| `--chart-3` | `347 77% 50%` | Tertiary series (red) |
| `--chart-4` | `215 20% 65%` | Neutral series (slate) |
| `--chart-5` | `222 47% 30%` | Dark series (navy) |

---

## Typography

### Font Stack

| Role | Family | Fallback |
|------|--------|----------|
| **All UI** | Plus Jakarta Sans | system-ui, sans-serif |

Loaded from Google Fonts: `Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800`

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display | 30px | 700 (bold) | 36px | Page titles ("Good evening, Storm") |
| Heading LG | 24px | 600 (semibold) | 32px | Section headers |
| Heading | 20px | 600 (semibold) | 28px | Card titles ("CAPA Summary", "Finding Trend") |
| Body LG | 16px | 400 (regular) | 24px | Primary body text, descriptions |
| Body | 14px | 400 (regular) | 20px | Default body, form labels, nav items |
| Label | 14px | 500 (medium) | 20px | Labels, table headers, metadata |
| Caption | 12px | 400 (regular) | 16px | Timestamps, help text, secondary metadata |
| Overline | 11px | 500 (medium) | 16px | Section labels, KPI labels — UPPERCASE, tracked 0.05em |

---

## Spacing

Base unit: **4px**. All spacing uses Tailwind's 4px scale.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps |
| `space-2` | 8px | Between related elements |
| `space-3` | 12px | Compact card padding |
| `space-4` | 16px | Standard card padding, section gaps |
| `space-5` | 20px | Card internal padding (standard) |
| `space-6` | 24px | Section padding, page margins |
| `space-8` | 32px | Between major sections |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | 12px | Base — cards, panels |
| `rounded-lg` | 8px | Buttons, inputs |
| `rounded-md` | 6px | Small elements |
| `rounded-sm` | 4px | Tight elements |
| `rounded-full` | 9999px | Badges, avatars, logo mark |

---

## Components

### Sidebar Navigation

- Fixed left, always dark (`--sidebar` background)
- Width: 256px (w-64) on desktop, collapsible on tablet, bottom tabs on mobile
- Logo mark at top: two-letter abbreviation on teal rounded square
- Nav items grouped by section with overline labels (OPERATIONS, MANAGEMENT, ADMIN)
- Active item: teal background (`--sidebar-accent`), white text, rounded-lg
- Inactive items: `--sidebar-foreground` text, hover `--sidebar-muted` background
- User name at bottom of sidebar

### KPI Cards (Signature Component)

The rounded teal left-border card is a OneQMS signature pattern.

```
Layout: Grid of 4 across (responsive: 2×2 on tablet, stacked on mobile)
Border: 2px left border, rounded — teal for normal, red for warning states
Background: --card
Padding: p-5 (20px)
Content:
  - Overline label (11px, uppercase, tracked, --muted-foreground)
  - Large metric value (30px, bold, --primary for normal, --destructive for warning)
  - Caption below metric (12px, --muted-foreground)
```

### Status Banner

```
Full-width, rounded-lg, teal background (--primary)
Left: Icon (check circle for success, alert for warnings)
Text: white, 14px medium
Dismiss arrow on the right
```

### Dashboard Cards

```
Background: --card
Border: 1px --border
Radius: rounded-xl (12px)
Padding: p-5 (20px)
Header: Heading (20px semibold) + Caption subtitle ("Last 30 days")
Body: Metrics, charts, or lists
Optional footer: "View Report →" link in --muted-foreground
```

### Metric Display (inside cards)

```
Icon: 40px circle with tinted background + semantic color icon
Value: 24-30px bold
Label: 11px overline, uppercase, --muted-foreground
Grid: 2×2 for multi-metric cards
```

### Progress Bars

```
Track: --muted background, rounded-full, h-2
Fill: --primary (teal) for normal, --warning (amber) for caution
Label: left-aligned text, right-aligned percentage
```

### Numbered List Items

```
Circle: 24px, rounded-full, --primary background, white text, 12px bold
Text: 14px regular, --foreground
Right: horizontal bar (colored by severity) + count
```

### Buttons

```
Primary:   bg-primary text-primary-foreground h-10 px-4 rounded-lg font-medium
Secondary: border border-input bg-background h-10 px-4 rounded-lg font-medium
Destructive: bg-destructive text-white h-10 px-4 rounded-lg font-medium
Ghost:     text-muted-foreground hover:bg-muted h-10 px-4 rounded-lg font-medium
```

All buttons: minimum 44px touch target on mobile.

### Inputs

```
h-10, px-3, rounded-lg
Border: --input (1px)
Focus: ring-2 ring-primary/40 ring-offset-2
Placeholder: --muted-foreground
Label: 14px medium, above input, mb-1
```

### Status Badges

```
Pill shape: px-2.5 py-0.5 rounded-full, text-xs (11px) font-medium

Active:      bg-primary text-white
In Progress: bg-primary/10 text-primary
Overdue:     bg-warning/15 text-warning
Critical:    bg-destructive text-white
Draft:       bg-muted text-muted-foreground
Closed:      bg-muted/80 text-muted-foreground/70
```

### Charts

- Use the chart palette in order (teal, amber, red, slate, navy)
- Area fills use gradient from color to transparent
- Grid lines: `--border` color
- Axis labels: caption size, `--muted-foreground`
- Legend: dots + caption text below chart

---

## Layout

### Responsive Behavior

**Desktop (1024px+):** Fixed sidebar (256px) + main content area. Cards in grid.
**Tablet (768px):** Collapsible sidebar, content adapts to narrower width.
**Mobile (<768px):** Sidebar becomes bottom tab bar. Single column layout. Full-width cards.

### Page Structure

```
Sidebar (fixed left, always dark)
  └── Main Content Area (scrollable)
      ├── Page Header: Greeting or page title + date + filter dropdown
      ├── Status Banner (conditional)
      ├── KPI Cards (grid row)
      ├── Content Cards (2-column grid on desktop)
      └── Additional sections
```

### Page Margins

- Desktop: `px-8` (32px) horizontal, `py-6` (24px) top
- Mobile: `px-4` (16px) horizontal, `py-4` (16px) top

---

## Animation & Motion

All from OneLPA's globals.css — port these exactly:

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `fadeIn` | 250ms | ease-out | Page content entry |
| `slideUp` | 250ms | ease-out | Mobile sheets |
| `slideDown` | 300ms | ease-out | Offline banner |
| `slideLeft` | 200ms | ease-out | Question transition forward |
| `slideRight` | 200ms | ease-out | Question transition back |
| `scaleIn` | 200ms | ease-out | Cards, dialogs |
| `shimmer` | 1500ms | infinite | Skeleton loading |
| `press` | 150ms | ease-out | Button press feedback |

**Respects `prefers-reduced-motion`:** All animations disabled when set.

---

## Accessibility

- **WCAG AA** minimum across all components
- **Touch targets:** 44×44px minimum on all interactive elements (coarse pointer)
- **Focus:** `ring-2 ring-primary/40 ring-offset-2 ring-offset-background`
- **Contrast:** Foreground on background ≥ 7:1, muted-foreground ≥ 4.5:1
- **Safe areas:** Padding for notched phones (`env(safe-area-inset-*)`)
- **Custom scrollbar:** 6px width, muted thumb, transparent track

---

## Iconography

- **Library:** Lucide React (consistent across all One[Module] apps)
- **Style:** Outlined / stroke, 1.5px weight
- **Sizes:** 16px inline, 20px in nav and buttons, 24px standalone
- **Color:** `--muted-foreground` default, `--foreground` emphasized, `--primary` active

---

## Implementation

### Required Files

Every One[Module] app must have:
1. `globals.css` with the full token set (copy from OneLPA)
2. `tailwind.config.ts` extending colors from CSS variables
3. Plus Jakarta Sans loaded from Google Fonts
4. `tailwindcss-animate` plugin installed

### Token Format

All colors use HSL via CSS custom properties:
```css
--primary: 168 80% 32%;
```

Referenced in Tailwind as:
```ts
primary: { DEFAULT: 'hsl(var(--primary))' }
```

This allows runtime theme switching and keeps the single source of truth in CSS.

---

*Version: 1.0 — April 2026*
*Status: Active*
*Reference: OneLPA v8*
