---
name: loading-state-management
description: Patterns for async state — loading indicators, optimistic updates, Suspense boundaries, SWR, and transition states.
domain: software
auto-load: false
used-by:
  - developer-agent
---

# Skill: Loading & State Management

> **Skill ID:** SW-032
> **Cluster:** App Quality

## Purpose

Users don't wait patiently. Every moment of perceived inactivity — a button that doesn't respond, a page that goes blank — erodes trust. This skill codifies how to make every async operation feel instant, responsive, and transparent.

## Async State Patterns

### React Suspense (Server Components)

```tsx
// app/dashboard/page.tsx — streaming with Suspense
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsCards />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <RevenueChart />
        </Suspense>
        <Suspense fallback={<TableSkeleton rows={5} />}>
          <RecentActivity />
        </Suspense>
      </div>
    </div>
  );
}

// Each component fetches its own data — no waterfall
async function MetricsCards() {
  const metrics = await getMetrics();
  return <div>{/* render metrics */}</div>;
}
```

### Optimistic Updates

```tsx
function TodoList() {
  const [todos, setTodos] = useState(initialTodos);

  async function toggleTodo(id: string) {
    // Optimistic: update UI immediately
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );

    try {
      await api.toggleTodo(id);
    } catch {
      // Revert on failure
      setTodos(prev =>
        prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      );
      toast.error("Failed to update. Please try again.");
    }
  }
}
```

### useTransition for Non-Urgent Updates

```tsx
function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value); // Urgent: update input immediately

    startTransition(async () => {
      const data = await searchAPI(value);
      setResults(data);
    });
  }

  return (
    <div>
      <input value={query} onChange={e => handleSearch(e.target.value)} />
      <div className={cn(isPending && "opacity-70 transition-opacity")}>
        <ResultsList results={results} />
      </div>
    </div>
  );
}
```

### SWR / React Query Patterns

```tsx
import useSWR from "swr";

function ProjectList() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "/api/projects",
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      errorRetryCount: 3,
    }
  );

  if (isLoading) return <ProjectListSkeleton />;
  if (error) return <ErrorBlock onRetry={() => mutate()} />;
  if (data.length === 0) return <EmptyState />;

  return (
    <div className="relative">
      {isValidating && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-interactive-primary animate-pulse" />
      )}
      {data.map(project => <ProjectCard key={project.id} {...project} />)}
    </div>
  );
}
```

## Navigation State

### Route Transition Indicator

```tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
      <div className="h-full bg-interactive-primary animate-[progress_2s_ease-in-out_infinite]" />
    </div>
  );
}
```

### loading.tsx per Route

```tsx
// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}
```

## State Communication Hierarchy

| Operation | User Feedback | Implementation |
|---|---|---|
| Instant action (< 100ms) | None needed | Direct state update |
| Quick action (100-500ms) | Subtle indicator | Disabled button + spinner |
| Normal action (500ms-2s) | Clear indicator | Loading state, skeleton |
| Slow action (2-5s) | Progress + message | Progress bar + "Loading your data..." |
| Long action (5s+) | Detailed progress | Step indicator + estimated time |
| Background action | Minimal indicator | Subtle bar or badge |
