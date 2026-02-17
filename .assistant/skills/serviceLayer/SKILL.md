---
name: serviceLayer
description: Angular standards for data and state in foodVibe1.0 – core services, Signals, user feedback.
---
# Service Layer Guidelines (foodVibe1.0 – Angular Renaissance)

## File Location & Structure
- **Location**: Place all services under `src/app/core/services/`.
- **Naming**: Use the `.service.ts` suffix (e.g. `product-data.service.ts`, `ingredient.service.ts`).
- **Testing**: Add a corresponding `.spec.ts` for each service (Jasmine/Karma or Vitest).
- **Imports**: Prefer path alias `@services/*` for imports from other app code.

## Service Pattern (Injectable Singletons)
Services are classes with `@Injectable({ providedIn: 'root' })`. Use Signals for reactive state.

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureDataService {
  private storage = inject(AsyncStorageService)
  private msg = inject(UserMsgService)

  private _items_ = signal<Item[]>([])
  readonly items_ = this._items_.asReadonly()

  async loadItems() {
    try {
      const data = await this.storage.query<Item>('items_db')
      this._items_.set(data)
    } catch (err) {
      this.msg.onSetErrorMsg('Failed to load data')
    }
  }
}
```

- Use `AsyncStorageService` for persistence (simulated backend).
- Use `UserMsgService` for user-facing success/error feedback.
- Expose read-only state via `.asReadonly()` where appropriate.
