---
name: Portions Per Guest Formula Fix
overview: Align menu calculation with the user's model: the dish field "כמות מנות" (portions per guest) drives total portions as guest_count × portions_per_guest. Remove take rate for plated/buffet; support fractional portions (0.15, 0.25, 0.5).
---

# Portions-per-guest formula fix

## User model

- **כמות מנות** (portions) = how much of this item we serve **per guest**.
- **Total portions** = **guests × portions per guest** (no take rate for plated/buffet).
- Fractional portions per guest (0.15, 0.25, 0.5) must work; no rounding so cost and list use exact value.

## Change

**menu-intelligence.service.ts — derivePortions**

- **plated_course** (default/else): return `guest_count × serving_portions` (no take rate, no rounding).
- **buffet_family**: same — `guest_count × serving_portions`.
- **cocktail_passed**: keep current — `round(guest_count × pieces_per_person × take_rate)`.

Result: 2 guests × 1 portion per guest → 2 total portions (cost and list for 2). 10 guests × 0.25 → 2.5 portions.
