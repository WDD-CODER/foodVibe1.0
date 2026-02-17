---
description: Angular component class structure - section order and CRDUL method grouping
globs: "**/*.component.ts"
alwaysApply: false
---

# Angular Component Class Structure

When creating or refactoring Angular components, follow this section order and method grouping.

## 1. Declaration Order (top to bottom)

```typescript
export class MyComponent {
  // INJECTED
  private fb = inject(FormBuilder);
  private someService = inject(SomeService);

  // INPUTS
  form = input.required<FormGroup>();
  label = input<string>('');

  // OUTPUTS
  valueChange = output<string>();

  // SIGNALS & CONSTANTS
  readonly someConstant = 'value';
  private state_ = signal(0);

  // COMPUTED SIGNALS
  protected derived_ = computed(() => this.state_() * 2);

  // CREATE
  addItem(): void { /* ... */ }

  // READ
  get items(): Item[] { /* ... */ }

  // DELETE
  removeItem(index: number): void { /* ... */ }

  // UPDATE
  updateItem(index: number, value: T): void { /* ... */ }

  // LIST
  get listItems(): Item[] { /* ... */ }
}
```

## 2. Section Definitions

| Section | Contents |
|---------|----------|
| `// INJECTED` | All `inject()` calls (services, FormBuilder, etc.) |
| `// INPUTS` | `input()`, `input.required()` |
| `// OUTPUTS` | `output()` |
| `// SIGNALS & CONSTANTS` | `signal()`, `readonly` constants |
| `// COMPUTED SIGNALS` | `computed()` |

## 3. CRDUL Method Grouping

Group public methods by intent:

| Section | Intent | Examples |
|---------|--------|----------|
| `// CREATE` | Add new items, create resources | `addItem`, `addSecondaryUnit` |
| `// READ` | Return single value or derived data | getters, `getItemById` |
| `// DELETE` | Remove items | `removeItem`, `removeSecondaryUnit` |
| `// UPDATE` | Modify existing state | `setValue`, `updateAmount`, `toggleType` |
| `// LIST` | Return collections for iteration | `get items`, `get secondaryConversions` |

## 4. Notes

- Private helpers that don't fit CRDUL can stay under the nearest related section or a small `// HELPERS` block.
- Use `// GETTERS` only if you prefer it over splitting READ/LIST; otherwise use READ for single values and LIST for collections.
- Keep sections in order even when empty; omit sections that don't apply.
