---
name: component-polish
description: Standard patterns for loading states, empty states, error states, skeleton screens, and edge case UI — the Five States Rule.
domain: software
auto-load: false
used-by:
  - developer-agent
  - ui-ux-agent
  - qa-agent
---

# Skill: Component Polish

> **Skill ID:** SW-019
> **Cluster:** Design

## Purpose

The "happy path" is maybe 60% of what users actually experience. The other 40% — loading, errors, empty data, partial failures — is where users form their impression of quality. Professional apps handle every state gracefully.

## The Five States Rule

**Every component that depends on data or async operations must handle all five states:**

| State | What It Means | What the User Sees |
|---|---|---|
| **Ideal** | Data loaded, everything works | The designed experience |
| **Loading** | Data is being fetched | Skeleton, spinner, or placeholder |
| **Empty** | Request succeeded but returned no data | Helpful empty state with action |
| **Error** | Request failed | Error message with recovery action |
| **Partial** | Some data loaded, some failed | Graceful degradation of failed sections |

If a component only handles "ideal," it's not done.

## Loading States

### Skeleton Screens (Preferred)

```tsx
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-surface-tertiary", className)} />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-card border border-border-primary p-6 space-y-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 pb-2 border-b border-border-primary">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

### When to Use Spinners vs. Skeletons

| Context | Use | Why |
|---|---|---|
| Initial page/section load | Skeleton | Preserves layout, reduces perceived wait |
| Button action (submit, save) | Inline spinner + disabled state | User needs to know their action is processing |
| Pagination / load more | Skeleton rows appended | Preserves existing content while loading more |
| Full-page route change | Top progress bar (NProgress style) | Lightweight, doesn't block current content |
| Background refresh | Nothing visible, or subtle indicator | Don't punish the user for data refetching |
| Long operations (>5s) | Progress bar or step indicator | User needs to know it's not stuck |

### Button Loading State

```tsx
function Button({ loading, children, ...props }) {
  return (
    <button
      disabled={loading}
      className={cn(
        "relative flex items-center justify-center gap-2",
        "transition-colors duration-150",
        loading && "opacity-80 cursor-not-allowed"
      )}
      {...props}
    >
      {loading && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      <span className={cn(loading && "opacity-0")}>{children}</span>
      {loading && <span className="absolute">Processing...</span>}
    </button>
  );
}
```

## Empty States

Every empty state must: explain why it's empty, suggest what to do, include a primary action if applicable.

```tsx
function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-surface-secondary p-4 mb-4">
        <Icon className="h-8 w-8 text-content-tertiary" />
      </div>
      <h3 className="text-lg font-semibold text-content-primary mb-1">{title}</h3>
      <p className="text-sm text-content-secondary max-w-sm mb-6">{description}</p>
      {action && (
        <button onClick={action.onClick}
          className="rounded-button bg-interactive-primary text-white px-4 py-2 text-sm font-medium
            transition-colors hover:bg-interactive-primary-hover">
          {action.label}
        </button>
      )}
    </div>
  );
}
```

### Empty State Examples

| Context | Title | Description | Action |
|---|---|---|---|
| Search with no results | "No results found" | "Try adjusting your search terms or filters" | "Clear filters" |
| Empty project list | "No projects yet" | "Create your first project to get started" | "Create Project" |
| Empty notifications | "You're all caught up" | "We'll notify you when something needs your attention" | -- |
| Empty analytics | "No data yet" | "Data will appear here once your first users arrive" | -- |

## Error States

### Component-Level Errors

```tsx
function ErrorBlock({ title = "Something went wrong", description = "We couldn't load this content. Please try again.", onRetry }) {
  return (
    <div className="rounded-lg border border-feedback-error/20 bg-feedback-error-subtle p-4 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-feedback-error shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-content-primary">{title}</p>
        <p className="text-sm text-content-secondary mt-1">{description}</p>
        {onRetry && (
          <button onClick={onRetry}
            className="text-sm font-medium text-text-brand hover:text-text-link-hover mt-2 transition-colors">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
```

### Error State Rules

1. **Never show raw error messages to users.**
2. **Always provide a recovery action.** "Try again," "Go back," "Contact support" — never a dead end.
3. **Preserve user input on form errors.**
4. **Error states must be visually distinct but not alarming.** Use `feedback-error-subtle` backgrounds.
5. **Log the real error.** The user sees a friendly message; the console/error service gets the stack trace.

## Partial States

```tsx
function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<CardSkeleton />}>
        <RevenueCard />
      </Suspense>
      <ErrorBoundary fallback={
        <ErrorBlock title="Couldn't load activity" onRetry={() => window.location.reload()} />
      }>
        <Suspense fallback={<TableSkeleton />}>
          <ActivityFeed />
        </Suspense>
      </ErrorBoundary>
      <Suspense fallback={<CardSkeleton />}>
        <QuickActions />
      </Suspense>
    </div>
  );
}
```

**The Rule:** One failed API call should never take down an entire page.

## Form Polish

```tsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-content-primary">Email address</label>
  <input
    type="email"
    className={cn(
      "w-full rounded-input border px-3 py-2 text-sm",
      "bg-input-bg text-input-text placeholder:text-input-placeholder",
      "transition-colors duration-150",
      "focus:outline-none focus:ring-2 focus:ring-border-focus/20 focus:border-border-focus",
      error ? "border-border-error focus:ring-feedback-error/20 focus:border-border-error" : "border-input-border",
      disabled && "opacity-50 cursor-not-allowed bg-surface-secondary"
    )}
    aria-invalid={!!error}
    aria-describedby={error ? `${id}-error` : undefined}
  />
  {error && (
    <p id={`${id}-error`} className="text-xs text-feedback-error flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />{error}
    </p>
  )}
</div>
```

## Toast / Notification Rules

- Auto-dismiss success toasts after 4-5 seconds
- Error toasts persist until dismissed
- Maximum 3 visible toasts at once
- Position: top-right for desktop, bottom-center for mobile
- Include a dismiss button on every toast

## Testing Checklist

- [ ] Loading state renders correctly (skeleton matches final layout shape)
- [ ] Empty state is helpful and includes an action when applicable
- [ ] Error state shows a friendly message with recovery option
- [ ] Partial failure doesn't crash the entire page
- [ ] Form inputs preserve data on submission error
- [ ] Button loading states prevent double-submission
- [ ] Skeleton-to-content transition is smooth (no layout shift)
- [ ] Error messages are user-friendly (no raw errors exposed)
- [ ] Long content truncates gracefully with ellipsis or "show more"
- [ ] Rapid state changes don't cause visual glitches
