---
name: manual-subscription
category: F3 — Manual Subscriptions in Components
applies-to: "*.component.ts"
auto-fix-paths: []
flag-only-paths: [real-violation]
version: 1
created: 2026-04-12
last-tested: 2026-04-23T10:30:00Z
last-tested-version: 1
last-score: "5/5"
---
<!--
Version bump rule:
- Bump `version` whenever DECIDE tree, FIX paths, DETECT pattern,
  or SAFETY rules change.
- Do NOT bump for typo fixes, formatting, or example additions.
- When you bump, leave last-tested/last-tested-version/last-score
  stale — the next /test-template run will refresh them.
-->

# Fix Template: Manual Subscription Audit

## PROBLEM
Angular components using `.subscribe()` on persistent streams without cleanup
cause memory leaks — the subscription lives beyond the component's lifecycle.

**Critical:** Most `.subscribe()` calls are NOT violations. The detection must
distinguish real leaks from safe patterns before flagging anything.

## DETECT

Step 1 — grep all `.subscribe(` in `*.component.ts` files.

Step 2 — For each match, classify using this filter:

```
Is the same pipe() chain using takeUntilDestroyed() or takeUntil()?
├─ YES → SAFE. Discard. Not a violation.
│
Is this a one-shot observable using take(1) or first()?
├─ YES → SAFE. Discard. Not a violation.
│
Is this call on an HttpClient method? (look for: .save, .delete, .load,
.get, .post, .put, .patch, or the service method returns Observable<...>
from HttpClient — these complete automatically)
├─ YES → SAFE. Discard. Not a violation.
│
Is this subscribe() inside a method that is called once (not in ngOnInit
or constructor), and the observable is known to complete?
├─ YES → SAFE. Discard.
│
None of the above → REAL VIOLATION. Flag it.
```

## DECIDE

Real violations only → FLAG (never auto-fix subscriptions unattended)

Why no auto-fix:
- Migration to toSignal() requires understanding the data shape
- takeUntilDestroyed() injection context must be verified
- Wrong migration can break the component silently

## FIX (manual, with agent guidance)

For a real violation, recommend ONE of:

**Option 1 — toSignal() (best for read-only reactive data)**
```ts
// Before
this.service.data$.subscribe(data => this.data = data);

// After
data = toSignal(this.service.data$, { initialValue: [] });
```

**Option 2 — takeUntilDestroyed() (best for side effects)**
```ts
// Before
this.service.event$.subscribe(e => this.handle(e));

// After
this.service.event$
  .pipe(takeUntilDestroyed())
  .subscribe(e => this.handle(e));
```

## EXAMPLE — False Positive (most common case)

```ts
// Looks like a violation — is NOT
this.route.data
  .pipe(takeUntilDestroyed(this.destroyRef))  // ← cleanup present
  .subscribe(({ product }) => { ... });

// Verdict: SAFE — discard flag
```

```ts
// HTTP fire-and-forget — is NOT a violation
this.kitchenStateService.saveProduct(updated)
  .subscribe({ next: () => {}, error: () => {} });

// Verdict: SAFE — HttpClient completes automatically
```

## SAFETY
- Never auto-fix subscriptions
- Never flag a subscribe() that has takeUntilDestroyed in the same pipe chain
- Never flag HttpClient-based observables
- When in doubt → SAFE (false positive is better than wrong migration)
