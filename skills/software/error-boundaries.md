---
name: error-boundaries
description: React error boundary implementation patterns — component-level boundaries, page-level boundaries, fallback UI, error reporting, and recovery.
domain: software
auto-load: false
used-by:
  - developer-agent
  - qa-agent
---

# Skill: Error Boundary Patterns

> **Skill ID:** SW-031
> **Cluster:** App Quality

## Purpose

An unhandled error in React crashes the entire component tree. One bad prop, one null reference — and the user sees a white screen. Error boundaries prevent this by catching errors at defined levels and rendering fallback UI.

## Error Boundary Implementation

### Base Error Boundary Component

```tsx
"use client";

import React, { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    if (process.env.NODE_ENV === "development") {
      console.error("Error Boundary caught:", error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.reset);
      }
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

### Next.js App Router Error Boundaries

```tsx
// app/dashboard/error.tsx
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="rounded-full bg-feedback-error-subtle p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-feedback-error" />
      </div>
      <h2 className="text-xl font-semibold text-content-primary mb-2">Something went wrong</h2>
      <p className="text-sm text-content-secondary mb-6 text-center max-w-md">
        We ran into an unexpected error. Our team has been notified.
      </p>
      <button onClick={reset}
        className="rounded-button bg-interactive-primary text-white px-6 py-2 text-sm font-medium
          hover:bg-interactive-primary-hover transition-colors">
        Try again
      </button>
    </div>
  );
}

// app/global-error.tsx — catches root layout failures
"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <button onClick={reset} className="underline">Try again</button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

## Boundary Placement Strategy

```
App Root (global-error.tsx)
  -> Layout errors
      -> Page-level (error.tsx per route)
          -> Section-level (ErrorBoundary component)
              -> Widget-level (ErrorBoundary around individual components)
```

**Rules:**
1. **Every route has an error.tsx** — page-level errors never show a white screen
2. **Independent data sections get their own boundary** — one failed API call doesn't crash the page
3. **Third-party components always get a boundary** — you can't control their code quality
4. **User input areas get a boundary** — bad input shouldn't crash the app

## Error Reporting Integration

```typescript
// lib/error-reporting.ts
export function reportError(error: Error, context?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.Sentry) {
    window.Sentry.captureException(error, { extra: context });
  }
  if (process.env.NODE_ENV === "development") {
    console.error("Error reported:", error, context);
  }
}

// Usage
<ErrorBoundary
  onError={(error, errorInfo) => {
    reportError(error, {
      componentStack: errorInfo.componentStack,
      page: window.location.pathname,
    });
  }}
  fallback={(error, reset) => (
    <ErrorBlock title="Couldn't load this section" onRetry={reset} />
  )}
>
  <DashboardWidget />
</ErrorBoundary>
```

## What Error Boundaries Don't Catch

| Not Caught | Where to Handle |
|---|---|
| Event handler errors | try/catch in the handler |
| Async code (setTimeout, fetch) | try/catch, .catch(), or error state |
| Server-side errors | Server error handling, error.tsx for SSR |
| Errors in the boundary itself | Parent boundary or global-error.tsx |

```tsx
// Event handler — must use try/catch
async function handleSubmit() {
  try {
    await saveData();
    toast.success("Saved");
  } catch (error) {
    toast.error("Failed to save. Please try again.");
    reportError(error as Error);
  }
}

// Async data fetching — use error state
function useData(url: string) {
  const [data, setData] = useState(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, error, loading };
}
```
