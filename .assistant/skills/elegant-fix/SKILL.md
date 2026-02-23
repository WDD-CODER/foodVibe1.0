# Elegant Fix — Solution Refinement

After implementing a fix that feels mediocre, use this workflow to refine it into an elegant solution.

## When to Use

- After any fix that makes you uncomfortable
- When you notice duplicated logic
- When a solution requires too many special cases
- Before submitting a PR with "I know this isn't ideal" comments
- When a workaround could be a proper abstraction

## The Pattern

When you've made a fix that works but feels hacky, trigger a fresh perspective:

> "Knowing everything you know now, scrap this and implement the elegant solution"

This works because the initial implementation taught you the codebase constraints. The second pass leverages that knowledge.

## Workflow

### Step 1: Complete the Initial Fix
Get something working first. Don't overthink the first pass.

### Step 2: Identify the Smell
Notice when the fix feels:
- Like a workaround rather than a solution
- Too complex for what it accomplishes
- Inconsistent with the surrounding Signal-based patterns
- Like it might cause issues with change detection or reactivity

### Step 3: Request Refinement

```
Context: I just implemented [brief description] but it feels hacky.

Current implementation:
[paste the code or describe approach]

Issues I notice:
- [list concerns]

Knowing everything you know now about this codebase, scrap this and implement
the elegant solution. Follow the project standards:
- Signals-only (no BehaviorSubject)
- input()/output()/model() (no decorators)
- translatePipe for user-facing text
- Adapter Pattern for storage
```

### Step 4: Compare and Decide
Review both solutions:
- Is the elegant solution actually better?
- Does it introduce new risks?
- Is the maintenance burden lower?
- Does it follow existing patterns in the codebase?

## Examples

### Quick Hack → Proper Signal Computed

**Initial (imperative)**:
```typescript
updateTotal() {
  let sum = 0
  for (const item of this.items_()) {
    sum += item.quantity * item.price
  }
  this.total_.set(sum)
}
```

**After refinement (declarative)**:
```typescript
total_ = computed(() =>
  this.items_().reduce((sum, item) => sum + item.quantity * item.price, 0)
)
```

### Copy-Paste → Shared Utility

**Initial (duplicated across components)**:
```typescript
// In ComponentA
const filtered = this.items_().filter(i => i.category === this.selectedCategory_())

// In ComponentB
const filtered = this.items_().filter(i => i.category === this.activeCategory_())
```

**After refinement (shared computed pattern)**:
```typescript
// In a shared utility or base service
filterByCategory<T extends { category: string }>(
  items: Signal<T[]>,
  category: Signal<string>
): Signal<T[]> {
  return computed(() => items().filter(i => i.category === category()))
}
```

## Integration

After refinement, if you discovered a new pattern:
1. Update `.assistant/copilot-instructions.md` with the pattern
2. Update relevant `breadcrumbs.md` if structure changed
3. Consider if it should be a utility in `core/utils/`

## Related Skills

- `/techdebt` — Find other code that needs refinement
- `/update-docs` — Document new patterns discovered
