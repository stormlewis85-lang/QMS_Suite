---
name: landing-page-patterns
description: Conversion-optimized landing page structures, section patterns, CTA placement, social proof layouts, and hero designs.
domain: software
auto-load: false
used-by:
  - developer-agent
  - ui-ux-agent
  - architect-agent
---

# Skill: Landing Page Patterns

> **Skill ID:** SW-020
> **Cluster:** Design

## Purpose

A landing page has one job: convert a visitor into an action. Every section either builds toward that action or wastes the visitor's time. This skill codifies the structural patterns that work for SaaS/product pages.

## Page Architecture

### The Standard Flow

```
Hero (above the fold)
  -> Problem/Pain Point
    -> Solution/How It Works
      -> Social Proof
        -> Features/Benefits
          -> Pricing (if applicable)
            -> FAQ
              -> Final CTA
```

Not every page uses every section. But the order matters — each section answers the question the previous section creates.

### Above the Fold (Hero)

The hero has ~5 seconds to answer three questions:
1. **What is this?** (Headline)
2. **Why should I care?** (Subheadline)
3. **What do I do next?** (CTA)

```tsx
<section className="relative overflow-hidden">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
    <div className="max-w-3xl mx-auto text-center">
      <div className="inline-flex items-center rounded-full bg-surface-brand-subtle
        px-3 py-1 text-sm font-medium text-text-brand mb-6">
        Now in public beta
      </div>

      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight
        text-content-primary leading-tight">
        Ship quality software
        <span className="text-text-brand"> without the chaos</span>
      </h1>

      <p className="mt-6 text-lg sm:text-xl text-content-secondary max-w-2xl mx-auto">
        An AI-powered agent framework that brings structure to your development
        workflow. Design, build, test, and ship — with every step tracked.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="/signup"
          className="w-full sm:w-auto rounded-button bg-interactive-primary text-white
            px-8 py-3 text-base font-semibold transition-all duration-150
            hover:bg-interactive-primary-hover shadow-lg shadow-interactive-primary/25">
          Get started free
        </a>
        <a href="/demo"
          className="w-full sm:w-auto rounded-button border border-border-primary
            bg-surface-primary text-content-primary px-8 py-3 text-base font-medium
            transition-colors duration-150 hover:bg-surface-secondary">
          Watch the demo
        </a>
      </div>

      <p className="mt-4 text-sm text-content-tertiary">
        Free forever for individuals. No credit card required.
      </p>
    </div>

    <div className="mt-16 sm:mt-20 rounded-xl border border-border-primary shadow-2xl overflow-hidden">
      <img src="/images/hero-screenshot.png" alt="Product screenshot" className="w-full" />
    </div>
  </div>
</section>
```

### Hero Variants

| Variant | When to Use | Layout |
|---|---|---|
| **Centered text + image below** | Default. Works for most SaaS products. | Text center-aligned, screenshot beneath |
| **Split — text left, image right** | When the visual is the selling point | 50/50 grid, image at actual size |
| **Full-bleed background** | Bold brand statement, launch pages | Dark background, dramatic product shot |
| **Video hero** | Complex product that needs demonstration | Centered text with embedded video |
| **Interactive demo** | Developer tools, technical products | Embedded playground or terminal animation |

### Social Proof Section

```tsx
<section className="border-y border-border-secondary bg-surface-secondary/50">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
    <p className="text-center text-sm font-medium text-content-tertiary mb-6">Trusted by teams at</p>
    <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 grayscale">
      {logos.map(logo => (
        <img key={logo.name} src={logo.src} alt={logo.name} className="h-7 sm:h-8 object-contain" />
      ))}
    </div>
  </div>
</section>
```

### Features / Benefits Section

```tsx
<section className="py-16 sm:py-20 lg:py-24">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
      <h2 className="text-3xl sm:text-4xl font-bold">Everything you need to ship with confidence</h2>
      <p className="mt-4 text-lg text-content-secondary">One line expanding on the section headline</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {features.map(f => (
        <div key={f.id} className="space-y-3">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-surface-brand-subtle">
            <f.icon className="h-5 w-5 text-text-brand" />
          </div>
          <h3 className="text-lg font-semibold">{f.title}</h3>
          <p className="text-sm text-content-secondary leading-relaxed">{f.description}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

### Final CTA Section

```tsx
<section className="py-16 sm:py-20 lg:py-24">
  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="rounded-2xl bg-surface-brand p-8 sm:p-12 lg:p-16 text-center">
      <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to ship with confidence?</h2>
      <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
        Join thousands of developers who build better software with structured agent workflows.
      </p>
      <div className="mt-8">
        <a href="/signup"
          className="inline-flex rounded-button bg-white text-text-brand px-8 py-3 text-base font-semibold
            transition-all duration-150 hover:bg-white/90 shadow-lg">
          Get started free
        </a>
      </div>
    </div>
  </div>
</section>
```

## CTA Rules

1. **One primary CTA per viewport.** Competing CTAs split attention.
2. **CTA text is action-specific.** "Get started free" > "Sign up" > "Submit."
3. **Remove friction near the CTA.** "No credit card required," "Cancel anytime."
4. **Sticky CTA on mobile for long pages.**
5. **CTA color is the highest-contrast interactive element on the page.**

## Conversion Optimization Checklist

- [ ] Hero answers "what, why, what next" above the fold
- [ ] Page loads in under 3 seconds
- [ ] Primary CTA visible without scrolling on mobile
- [ ] Social proof appears within first two scrolls
- [ ] No more than one primary CTA per viewport
- [ ] CTA text is action-specific, not generic
- [ ] Trust signals near every CTA
- [ ] Page works without JavaScript for initial render (SSR/SSG)
- [ ] Mobile experience is equal quality to desktop
- [ ] FAQ addresses top 5 objections to conversion
- [ ] External links open in new tabs
- [ ] Form fields are minimal
- [ ] Page has a single clear narrative flow

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Hero headline describes the product ("An AI agent framework") | Describe the benefit ("Ship quality software without the chaos") |
| Three competing CTAs above the fold | One primary, one secondary max |
| Social proof at the bottom of the page | Move it up. Visitors who don't scroll never see it. |
| Feature dump with 12+ features in a grid | Pick 3-6 key features. Link to a features page for the rest. |
| No visual (hero is text-only) | Show the product. |
| Auto-playing video with sound | Instant bounce. Auto-play must be muted. |
| "Click here" as CTA text | What happens when I click? "Start building free." |
