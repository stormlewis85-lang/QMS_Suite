---
name: seo-foundations
description: Technical SEO implementation for Next.js — metadata, structured data, sitemaps, canonical URLs, and crawlability.
domain: software
auto-load: false
used-by:
  - developer-agent
  - docs-agent
---

# Skill: SEO Foundations

> **Skill ID:** SW-033
> **Cluster:** App Quality

## Purpose

SEO isn't a marketing task — it's an engineering task. Without proper technical SEO, the best content in the world won't rank.

## Metadata Implementation (Next.js App Router)

### Static Metadata

```tsx
// app/layout.tsx — site-wide defaults
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://yourdomain.com"),
  title: {
    default: "Your Product — Tagline",
    template: "%s | Your Product",
  },
  description: "Your product's value proposition in one sentence.",
  openGraph: {
    type: "website",
    siteName: "Your Product",
    locale: "en_US",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@yourhandle",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// app/blog/[slug]/page.tsx — per-page dynamic metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.ogImage }],
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}
```

### Structured Data (JSON-LD)

```tsx
export default function ProductPage({ product }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    description: product.description,
    applicationCategory: "DeveloperApplication",
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Page content */}
    </>
  );
}
```

## Sitemap

```tsx
// app/sitemap.ts
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();

  const staticPages = [
    { url: "https://yourdomain.com", lastModified: new Date(), priority: 1.0 },
    { url: "https://yourdomain.com/pricing", lastModified: new Date(), priority: 0.8 },
    { url: "https://yourdomain.com/about", lastModified: new Date(), priority: 0.5 },
  ];

  const blogPages = posts.map(post => ({
    url: `https://yourdomain.com/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    priority: 0.7,
  }));

  return [...staticPages, ...blogPages];
}
```

## robots.txt

```tsx
// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/dashboard/", "/auth/"],
      },
    ],
    sitemap: "https://yourdomain.com/sitemap.xml",
  };
}
```

## Technical SEO Checklist

```
Page-Level:
[] Unique <title> per page (50-60 characters)
[] Unique <meta description> per page (120-155 characters)
[] One <h1> per page, matching the page's primary topic
[] Logical heading hierarchy (h1 -> h2 -> h3, no skipping)
[] Canonical URL set on every page
[] Meaningful alt text on all images
[] Internal links use descriptive anchor text

Site-Level:
[] sitemap.xml generated and submitted to Google Search Console
[] robots.txt configured correctly
[] 404 page returns actual 404 status code (not 200)
[] Redirects return 301 (permanent) or 302 (temporary) as appropriate
[] No redirect chains (max 1 hop)
[] HTTPS enforced on all pages
[] Mobile-friendly (responsive design)
[] Page speed optimized (see SW-030)
[] Structured data where applicable (JSON-LD)
[] Hreflang tags if multilingual

Auth Pages:
[] Login/signup/dashboard pages set to noindex
[] Auth-gated content not accidentally indexed
```
