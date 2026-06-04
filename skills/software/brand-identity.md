---
name: brand-identity
description: >-
  Fire when the user asks to define or document a brand identity, pick a color
  palette, choose typography, set brand voice/personality, or produce a
  BRAND.md / DESIGN.md. Also fire at the start of a new product or when
  rebranding an existing one. Trigger phrases: "brand identity", "color
  palette", "typography system", "brand personality", "visual language",
  "BRAND.md", "rebrand", "what should our brand feel like".
domain: software
auto-load: false
used-by:
  - ui-ux-agent
  - architect-agent
---

# Skill: Brand Identity System

> **Skill ID:** SW-021
> **Cluster:** Branding

## Purpose

Brand identity is the visual trust layer. Before a user reads a word or clicks a button, the visual identity has already told them whether this is a professional tool, a toy, or something they should take seriously. This skill ensures every project has a coherent brand identity that's documented, consistent, and enforceable.

## When to Use

- Any new user-facing project at kickoff
- When establishing brand guidelines for the first time
- When a project is moving from prototype to public
- Before any design work begins (this precedes SW-015 Design Tokens)

## Brand Identity Framework

### 1. Brand Personality Definition

```markdown
## Brand Personality

### Core Attributes (pick 3-5)
- [ ] Professional / Trustworthy
- [ ] Innovative / Cutting-edge
- [ ] Friendly / Approachable
- [ ] Sophisticated / Premium
- [ ] Playful / Fun
- [ ] Bold / Confident
- [ ] Minimal / Clean
- [ ] Warm / Human
- [ ] Technical / Precise
- [ ] Rebellious / Disruptive

### Voice Spectrum
Formal <----*----> Casual
Serious <----*----> Playful
Corporate <----*----> Personal
Reserved <----*----> Bold
Technical <----*----> Accessible
```

### 2. Color Palette

#### Primary Brand Color

Selection criteria:
- **Distinctiveness** — Does it stand out from competitors?
- **Versatility** — Does it work on light backgrounds, dark backgrounds, as text, as a background?
- **Accessibility** — Does it meet WCAG AA contrast ratios?
- **Emotional alignment** — Does it match the brand personality?

```markdown
## Color Psychology Reference
| Color Family | Associations | Best For |
|---|---|---|
| Blue | Trust, stability, professionalism | Finance, SaaS, enterprise |
| Green | Growth, health, nature, money | Health, finance, sustainability |
| Purple | Creativity, luxury, wisdom | Creative tools, premium products |
| Red/Orange | Energy, urgency, warmth | Marketplaces, social, food |
| Yellow/Gold | Optimism, clarity, warmth | Education, creative, productivity |
| Black/Dark | Luxury, power, sophistication | Premium, fashion, creative |
| Teal/Cyan | Innovation, clarity, freshness | Tech, startups, developer tools |
```

#### Extended Palette

```markdown
### Brand Colors
- Primary: #[value] — Main brand color
- Primary Light: #[value] — Tints for backgrounds, hover states
- Primary Dark: #[value] — Pressed states, text on light backgrounds

### Neutral Scale
- Use slate, gray, or zinc — pick ONE neutral family and commit
- The neutral family should complement the brand color's warmth/coolness

### Accent Color (Optional)
- One contrasting accent for special emphasis
- Must pass AA contrast on both light and dark surfaces
- Used sparingly: max 5-10% of the visual surface

### Functional Colors (Non-Negotiable)
- Error: Red family (#EF4444 range)
- Warning: Amber family (#F59E0B range)
- Success: Green family (#22C55E range)
- Info: Blue family (#3B82F6 range)
- These never change between brands
```

### 3. Typography System

#### Font Pairing Rules

| Heading Font Type | Pairs Well With | Example |
|---|---|---|
| Geometric sans (Outfit, Plus Jakarta Sans) | Humanist sans for body (Inter, Source Sans) | Modern, clean SaaS |
| Serif (Playfair, Fraunces) | Clean sans for body (DM Sans, Geist) | Premium, sophisticated |
| Rounded (Nunito, Varela Round) | Matching rounded body or clean sans | Friendly, approachable |
| Monospace (JetBrains Mono, Fira Code) | Clean sans for body | Developer tools, technical |
| Bold grotesque (Clash Display, Cabinet Grotesk) | Neutral body font | Bold, modern startup |

**Rules:**
- Maximum two font families in any project (heading + body). Three if mono is needed.
- Heading and body fonts must have visual contrast.
- Test the pairing at actual sizes used in the product.
- Every font must be available in the required weights.

### 4. Logo Usage

```markdown
### Versions
- **Primary:** Full logo (mark + wordmark)
- **Compact:** Logo mark only — favicons, app icons, small spaces
- **Wordmark:** Text only

### Clear Space
- Minimum clear space around logo: equal to the height of the logo mark

### Minimum Sizes
- Primary logo: min 120px wide (digital)
- Logo mark: min 24px (favicon), min 32px (UI placement)

### Color Variants
- Full color on light background
- Full color on dark background
- White (knockout) on dark/colored backgrounds
- Black on light backgrounds (no color available)

### Misuse Rules
- Never stretch, skew, or rotate the logo
- Never add effects (drop shadow, glow, bevel)
- Never place on busy/low-contrast backgrounds
- Never recreate in a different font
```

### 5. Imagery and Iconography

```markdown
### Icon Style
- [ ] Outlined (light, modern — Lucide, Phosphor)
- [ ] Filled (solid, bold — Heroicons solid)
- [ ] Duotone (two-tone, distinctive — Phosphor duotone)
- Stick to ONE icon set across the entire product.

### UI Graphics
- Screenshots: rounded corners (radius-xl), subtle shadow, border
- Decorative elements: consistent geometric shapes or patterns
- Background textures or patterns: subtle, never competing with content
```

## Deliverable: BRAND.md

This skill produces a `BRAND.md` file at the project root containing all of the above sections. This file becomes:
- The visual identity source of truth
- Input for SW-015 (Design Tokens)
- Reference for UI/UX Agent on every frontend task
- The document shared with any designer or collaborator

## Brand Consistency Audit

- [ ] Colors match the defined brand palette (no off-brand hex values)
- [ ] Typography uses only the approved font families and weights
- [ ] Logo usage follows the documented rules
- [ ] Icon style is consistent (same icon family throughout)
- [ ] Visual language matches the defined personality
- [ ] No competing visual styles within the same product

## Gotchas

- BRAND.md that documents aspirations rather than what the codebase actually uses. If the CSS says `#1a73e8` and BRAND.md says `#0066ff`, BRAND.md is wrong until one of them changes. Run the brand-consistency audit against real code, not a mood board.
- Too many "accent" colors. Two neutrals, one primary, one accent is enough for most products. Every additional color multiplies the design surface and invites drift.
- Typography stacks listed without weights. "Use Inter" is underspecified — the system needs weight + size + line-height tokens, otherwise every developer picks their own.
- Logo usage rules with no minimum size or clear-space guidance. That's where the brand visibly breaks first, especially in favicons and social previews.
