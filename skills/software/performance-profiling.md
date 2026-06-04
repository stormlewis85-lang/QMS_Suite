---
name: performance-profiling
domain: software
auto-load: false
used-by:
  - qa-agent
description: >-
  Fire when the user reports slow pages, memory issues, oversized bundles,
  slow queries, or asks for a performance audit / Lighthouse pass. Also fire
  before and after optimization work to measure delta, and during sprint
  review when a performance budget is defined. Trigger phrases: "performance
  audit", "slow page", "bundle size", "memory leak", "query optimization",
  "profiling", "lighthouse score", "this page is laggy", "N+1 queries".
---

# Skill: Performance Profiling

## When to Apply
- When QA Agent reviews code that touches performance-sensitive paths
- When users or tests report slow behavior
- Before and after optimization work (to measure improvement)
- During sprint reviews when performance budgets are defined
- When bundle size or memory usage crosses defined thresholds

## Core Framework

### 1. Establish Baselines
Before optimizing, measure the current state:
- **Page load:** Time to First Byte (TTFB), First Contentful Paint (FCP), Largest Contentful Paint (LCP)
- **Bundle size:** Total JS/CSS shipped, per-route chunks
- **Memory:** Heap usage at rest, heap growth over time, GC frequency
- **Queries:** Count per page load, slowest queries, N+1 detection
- **API response:** P50, P95, P99 latency per endpoint

### 2. Performance Scorecard

| Metric | Good | Acceptable | Poor |
|---|---|---|---|
| LCP | < 2.5s | 2.5-4.0s | > 4.0s |
| FCP | < 1.8s | 1.8-3.0s | > 3.0s |
| TTFB | < 200ms | 200-600ms | > 600ms |
| Bundle (JS) | < 200KB | 200-500KB | > 500KB |
| API P95 | < 200ms | 200-500ms | > 500ms |
| DB queries/page | < 10 | 10-25 | > 25 |
| Memory (heap) | Stable | Slow growth | Unbounded growth |

### 3. Profiling Procedure

**Frontend:**
1. Run Lighthouse audit (performance, accessibility, best practices).
2. Check bundle analyzer output — identify largest chunks.
3. Profile runtime with browser DevTools Performance tab.
4. Check for layout thrashing, excessive re-renders, memory leaks.

**Backend:**
1. Profile API endpoints under realistic load.
2. Enable query logging — count queries, identify N+1 patterns.
3. Check for synchronous blocking in async code paths.
4. Monitor memory allocation patterns for leaks.

**Database:**
1. Run EXPLAIN on slow queries.
2. Check index usage — missing indexes on WHERE/JOIN columns.
3. Identify full table scans on large tables.
4. Check connection pool utilization.

### 4. Optimization Priority
```
Impact Score = (User-Facing Impact x 3) + (Frequency x 2) + (Ease of Fix x 1)
```
Fix highest impact scores first. Don't optimize what doesn't matter.

## Output Format

```markdown
## Performance Report — [Date] — [Area]

### Scorecard
| Metric | Value | Rating | Target |
|---|---|---|---|
| ... | ... | Good/Acceptable/Poor | ... |

### Findings (prioritized)
1. **[Issue]** — Impact: [High/Med/Low] — [Root cause] — [Suggested fix]

### Before/After (if measuring optimization)
| Metric | Before | After | Change |
|---|---|---|---|
| ... | ... | ... | ... |
```

## Integration with Other Skills
- **code-review-checklist**: QA Agent flags performance concerns during review using this scorecard.
- **testing-strategy**: Performance regression tests validate that optimizations hold.
- **migration-planner**: Framework migrations must not regress performance baselines.
- **error-pattern-analysis**: Repeated performance issues in error logs trigger profiling.

## Gotchas

- Profiling in development instead of production-like environments. Dev boxes have different CPU, memory, network, and data volumes; numbers measured there rarely generalize.
- Optimizing the hot path you *think* exists instead of the one the profiler shows. Measure first, then optimize — the bottleneck is almost never where intuition points.
- Micro-benchmarks that exclude the cost of the real workload (cache warmup, GC, I/O). A function that's fast in isolation can still dominate when called in a loop.
- Shipping "faster" code with no regression test. If there's no benchmark in CI, the next refactor will undo the win silently.
