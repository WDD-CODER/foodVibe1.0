---
name: utilStandards
description: Shared utility functions and purity rules for foodVibe1.0.
---
# Utility Standards (foodVibe1.0)

## 1. Centralized utils
- **Rule**: Do not add one-off helper functions inside components or feature services.
- **Location**: Use `src/app/core/services/util.service.ts` (or a dedicated `core/utils/` module) for shared helpers.
- **Examples**: `makeId(length)` for entity IDs; shared formatters or validators.

## 2. Purity
- **Rule**: Utility functions must be pure: same inputs produce same outputs; no side effects (no I/O, no mutating arguments or shared state).
