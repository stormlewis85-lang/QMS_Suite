---
name: performance-budget
description: Performance budgets for Lighthouse scores, Core Web Vitals, bundle size, and load times with optimization strategies.
domain: software
auto-load: false
used-by:
  - developer-agent
  - qa-agent
  - devops-agent
---

# Skill: Performance Budget

> **Skill ID:** SW-030
> **Cluster:** App Quality

## Purpose

Performance is not an optimization to be done later. It's a budget that's set upfront and enforced throughout development.

## Performance Targets

### Lighthouse Scores

| Metric | Target | Minimum | Measured On |
|---|---|---|---|
| Performance | >= 90 | >= 80 | Landing page, core app pages |
| Accessibility | >= 95 | >= 90 | All pages |
| Best Practices | >= 95 | >= 90 | All pages |
| SEO | >= 95 | >= 90 | All public pages |

### Core Web Vitals

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| Largest Contentful Paint (LCP) | <= 2.5s | <= 4.0s | > 4.0s |
| Interaction to Next Paint (INP) | <= 200ms | <= 500ms | > 500ms |
| Cumulative Layout Shift (CLS) | <= 0.1 | <= 0.25 | > 0.25 |
| First Contentful Paint (FCP) | <= 1.8s | <= 3.0s | > 3.0s |
| Time to First Byte (TTFB) | <= 800ms | <= 1.8s | > 1.8s |

**Target: All Core Web Vitals in the "Good" range.**

### Bundle Size Budgets

| Asset Type | Budget | Rationale |
|---|---|---|
| Initial JS bundle | <= 150KB gzipped | First load performance |
| Per-route JS chunk | <= 50KB gzipped | Route transition speed |
| Total JS (initial) | <= 300KB gzipped | Overall page weight |
| CSS (total) | <= 50KB gzipped | Render-blocking resource |
| Largest image (above fold) | <= 200KB | LCP candidate |
| Total page weight | <= 1MB | 3G network target |
| Web fonts | <= 100KB total | Font loading budget |

## Optimization Strategies

### Images

```
[] Use next/image for all images (automatic optimization, lazy loading, sizing)
[] Format: WebP with JPEG fallback (or AVIF for cutting-edge)
[] Responsive sizes: provide srcSet for multiple viewport widths
[] Above-fold images: priority={true} to prevent lazy loading
[] Below-fold images: lazy loaded by default
[] Icons: Use SVG or icon font, not PNG
[] Decorative images: set alt="" and loading="lazy"
```

### JavaScript

```
[] Dynamic imports for route-specific code
[] Tree shaking verified — no importing entire libraries for one function
[] Bundle analyzer run periodically: ANALYZE=true next build
[] Third-party scripts loaded with strategy="lazyOnload" or "afterInteractive"
[] No synchronous third-party scripts in <head>
[] Remove unused dependencies regularly
[] Consider lighter alternatives (date-fns vs moment)
```

### Fonts

```
[] Use next/font for self-hosted Google Fonts
[] Subset fonts to used character sets
[] Preload critical fonts
[] font-display: swap
[] Maximum 2 font families
[] Maximum 4 font weight/style combinations total
```

### Rendering Strategy

```
[] Static pages: SSG (generateStaticParams) where possible
[] Dynamic pages: SSR with caching (revalidate in fetch options)
[] Streaming: use Suspense boundaries for progressive loading
[] Client components: minimize — use "use client" only when necessary
[] ISR for content that changes infrequently
[] Route handlers: cached by default in Next.js App Router
```

## Measurement and Enforcement

### Local Testing

```bash
npx lighthouse-ci https://localhost:3000 --output=json
ANALYZE=true next build
# Chrome DevTools -> Performance tab -> Web Vitals
```

### CI Enforcement

```yaml
- name: Check bundle size
  run: |
    npx next build
    # Check .next/analyze output against budgets

- name: Lighthouse audit
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      https://staging.yourdomain.com/
      https://staging.yourdomain.com/dashboard
    budgetPath: ./lighthouse-budget.json
```

### Budget File

```json
[
  {
    "path": "/",
    "resourceSizes": [
      { "resourceType": "script", "budget": 300 },
      { "resourceType": "stylesheet", "budget": 50 },
      { "resourceType": "image", "budget": 500 },
      { "resourceType": "total", "budget": 1000 }
    ],
    "timings": [
      { "metric": "interactive", "budget": 3000 },
      { "metric": "first-contentful-paint", "budget": 1800 }
    ]
  }
]
```

## Performance Checklist

```
Every build:
[] Bundle size within budget
[] No new dependencies without size check

Every release:
[] Lighthouse scores meet targets
[] Core Web Vitals in "Good" range
[] No layout shift on page load (CLS < 0.1)
[] Images optimized and properly sized
[] Fonts self-hosted and subsetted

Monthly:
[] Full performance audit on core pages
[] Bundle analysis — identify growth trends
[] Third-party script audit
[] Real-user monitoring data reviewed
```
