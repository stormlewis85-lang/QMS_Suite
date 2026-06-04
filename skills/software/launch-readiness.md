---
name: launch-readiness
description: Comprehensive pre-launch checklist — meta tags, OG images, favicons, social preview, SEO, analytics, legal, and brand presentation.
domain: software
auto-load: false
used-by:
  - qa-agent
  - devops-agent
---

# Skill: Launch Readiness Checklist

> **Skill ID:** SW-024
> **Cluster:** Branding

## Purpose

The first time someone visits your site — from a tweet, a Product Hunt post, a Google search — everything must work. Broken OG images, missing favicons, "Lorem ipsum" in the footer — any of these says "not ready" louder than any feature says "impressive."

## Meta Tags and SEO

```
[] <title> is set on every page (max 60 characters, includes brand name)
[] <meta name="description"> is set on every page (max 155 characters)
[] <link rel="canonical"> set to prevent duplicate content
[] <meta name="robots" content="index, follow"> on public pages
[] <meta name="robots" content="noindex"> on auth pages, admin, staging
[] <meta name="viewport" content="width=device-width, initial-scale=1">
[] <html lang="en"> (or appropriate language code)
[] <meta name="color-scheme" content="light dark"> (if dark mode supported)
[] Heading hierarchy: one <h1> per page, logical nesting
[] All images have meaningful alt text
[] sitemap.xml generated and accessible
[] robots.txt present and correctly configured
[] 404 page is custom-designed with navigation
[] Redirects configured for any changed URLs
```

## Open Graph and Social Preview

```
[] og:title — Compelling (max 60 chars)
[] og:description — Action-oriented (max 155 chars)
[] og:image — 1200x630px, designed (not auto-generated placeholder)
[] og:image text readable at thumbnail size
[] og:type — "website" for landing pages
[] og:url — Canonical URL
[] og:site_name — Brand name

[] twitter:card — "summary_large_image"
[] twitter:title, twitter:description, twitter:image
[] twitter:site — @handle if applicable

[] Test social preview with: Twitter card validator, Facebook Sharing Debugger,
   LinkedIn Post Inspector, Slack (paste URL in DM), iMessage
[] OG image looks good at both full size and thumbnail
[] Text on OG image doesn't get cropped by any platform
```

### OG Image Design Rules

- Keep text large and minimal — max 6-8 words
- Brand logo visible but not dominant
- High contrast — thumbnail size must be readable
- No thin fonts or fine detail
- Include the value prop, not just the product name
- Design at 1200x630px but check at 600x315px

## Favicons and App Icons

```
[] favicon.ico — 32x32 ICO file at root
[] apple-touch-icon.png — 180x180 PNG
[] favicon-16x16.png and favicon-32x32.png
[] android-chrome-192x192.png and android-chrome-512x512.png
[] site.webmanifest with name, short_name, icons, theme_color, background_color
[] <meta name="theme-color" content="#[brand color]">
[] Favicon is recognizable at 16x16px
[] Favicon works on both light and dark browser tabs
```

## Performance Pre-Launch

```
[] Lighthouse Performance score >= 90
[] LCP < 2.5s, FID < 100ms, CLS < 0.1
[] Total page weight < 1MB for landing page
[] Images optimized: WebP/AVIF, lazy loaded below fold
[] Fonts preloaded, display=swap
[] JavaScript bundle analyzed — no unnecessary dependencies
[] Above-the-fold content renders without JavaScript (SSR/SSG)
[] TTFB < 600ms
```

## Legal and Compliance

```
[] Privacy Policy page exists, linked in footer
[] Terms of Service page exists, linked in footer
[] Cookie consent banner (if required by jurisdiction)
[] GDPR compliance (if serving EU users)
[] Copyright notice in footer with current year
[] If collecting emails: CAN-SPAM compliance, unsubscribe mechanism
```

## Analytics and Monitoring

```
[] Analytics installed and receiving data (Plausible, PostHog, or GA4)
[] Core events tracked: page views, sign-ups, key conversions
[] Error monitoring installed (Sentry or equivalent)
[] Uptime monitoring configured
[] Console is clean — no errors, warnings, or debug logs in production
[] Source maps uploaded to error monitoring (not exposed to public)
```

## Content Quality

```
[] No placeholder text anywhere ("Lorem ipsum", "TODO", "Coming soon")
[] All links work — no 404s
[] All images load — no broken image icons
[] Email notifications are branded and tested
[] Footer includes: copyright, privacy policy, terms, contact/support link
[] No grammar or spelling errors on public pages
[] Pricing page is accurate and current
```

## Security Pre-Launch

```
[] HTTPS enforced on all pages
[] Security headers configured (HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy)
[] API keys and secrets not exposed in client-side code
[] Environment variables used for all configuration
[] Auth flows tested: sign up, sign in, password reset, sign out
[] Rate limiting on auth endpoints
[] Input validation on all forms (client and server)
[] CORS configured correctly (not wildcard in production)
```

## Cross-Browser and Device Testing

```
[] Chrome, Safari, Firefox, Edge (latest)
[] Safari on iOS, Chrome on Android (real device or BrowserStack)
[] Tablet (iPad portrait and landscape)
[] Dark mode on all browsers
[] Keyboard navigation works
[] Screen reader tested on at least one key flow
```

## Launch Day Readiness

```
[] Staging matches production configuration
[] Database migrated and seeded
[] DNS configured and propagated
[] CDN configured
[] Backup and recovery procedure documented
[] Rollback plan if launch fails
[] Support email or feedback mechanism is live
[] Team alerted and available for launch window
```
