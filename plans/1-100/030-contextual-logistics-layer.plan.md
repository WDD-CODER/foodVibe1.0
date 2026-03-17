---
name: Contextual Logistics Layer
overview: Build a full "Logistics Shadow" system that attaches dynamic equipment and supply requirements to every dish, adapts them based on venue infrastructure and service style, and generates event-specific load-out lists — with a managed Equipment catalog, hybrid Venue profiles, auto-scaling with manual overrides, and historical analytics.
todos:
  - id: phase1-models
    content: "Phase 1: Create equipment.model.ts, venue.model.ts, logistics.model.ts; extend Recipe and MenuEvent interfaces"
    status: pending
  - id: phase1-equipment-service
    content: "Phase 1: Build EquipmentDataService (CRUD, localStorage, signals) following dish-data.service pattern"
    status: pending
  - id: phase1-equipment-page
    content: "Phase 1: Build Equipment Inventory page (list + add/edit form) with routing"
    status: pending
  - id: phase1-dictionary
    content: "Phase 1: Add Hebrew dictionary entries for all new equipment/logistics labels"
    status: pending
  - id: phase2-venue-service
    content: "Phase 2: Build VenueDataService + Venue Profile management UI"
    status: pending
  - id: phase2-dish-logistics
    content: "Phase 2: Add Logistics editor section to Recipe Builder (baseline + service overrides)"
    status: pending
  - id: phase2-demo-data
    content: "Phase 2: Create demo equipment items and demo venue profiles JSON"
    status: pending
  - id: phase3-engine
    content: "Phase 3: Build LogisticsEngineService (6-step resolution pipeline)"
    status: pending
  - id: phase3-menu-intel
    content: "Phase 3: Wire logistics summary into Menu Intelligence page"
    status: pending
  - id: phase4-planner-page
    content: "Phase 4: Build dedicated Logistics Planner page with load-out list, overrides, and export"
    status: pending
  - id: phase4-conflicts
    content: "Phase 4: Implement concurrent usage detection and conflict warnings"
    status: pending
  - id: phase5-analytics
    content: "Phase 5: Historical pattern queries and Dashboard integration"
    status: pending
---

# Contextual Logistics Layer — "The Logistics Shadow"

## The Three Original Layers + Two Upgrades

The original concept defines three layers: **Baseline** (what), **Environmental** (where), and **Service Style** (how). This plan adds two more:

- **Layer 4: Consumables** — Items that are always consumed per-event and never return (fuel canisters, ice, disposable packaging, cling wrap). These scale with guest count and dish complexity but are distinct from reusable equipment.
- **Layer 5: Concurrent Usage Detection** — When multiple dishes on a menu need the same equipment during overlapping phases (e.g., three dishes need the blender during prep), the system flags it and recommends either sequential scheduling or additional units.

---

## Data Model Design

### A. Equipment Entity (new model: `equipment.model.ts`)

A fully managed catalog item, similar in spirit to `Product`.

```typescript
interface Equipment {
  _id: string;
  name_hebrew: string;
  category_: EquipmentCategory;
  owned_quantity_: number;
  scaling_rule_?: ScalingRule;
  is_consumable_: boolean;
  tags_?: string[];
  notes_?: string;
  created_at_: string;
  updated_at_: string;
}

type EquipmentCategory =
  | 'heat_source' | 'tool' | 'container' | 'packaging' | 'infrastructure' | 'consumable';

interface ScalingRule {
  per_guests_: number;
  min_quantity_: number;
  max_quantity_?: number;
}
```

### B. Venue Profile (new model: `venue.model.ts`)

Hybrid approach — environment type + optional saved profile.

```typescript
type EnvironmentType =
  | 'professional_kitchen' | 'outdoor_field' | 'client_home' | 'popup_venue';

interface VenueProfile {
  _id: string;
  name_hebrew: string;
  environment_type_: EnvironmentType;
  available_infrastructure_: VenueInfraItem[];
  notes_?: string;
  created_at_: string;
}

interface VenueInfraItem {
  equipment_id_: string;
  available_quantity_: number;
}
```

### C. Dish Logistics (extend `Recipe`)

Add optional `logistics_` to Recipe. Baseline + service overrides.

### D. Event Logistics (extend `MenuEvent`)

Add optional `logistics_` with environment_type_, venue_profile_id_, resolved_items_, manual_overrides_.

---

## Computation Flow: The Logistics Resolution Engine

1. Collect Baselines — Aggregate equipment from all dishes on the menu.
2. Apply Service Style — Add/replace packaging per serving_type_.
3. Apply Scaling — Per guest_count_ and equipment scaling_rule_.
4. Venue Gap Analysis — Subtract venue available_infrastructure_; only gap on load-out.
5. Concurrent Usage — Flag when same equipment needed in same phase by multiple dishes.
6. Manual Overrides — Apply event-specific overrides (stored only on MenuEvent).

---

## UI Architecture

- **Equipment Inventory** — `/equipment` (list + add/edit, like Inventory).
- **Venue Profiles** — `/venues` (list + form, environment type + infrastructure).
- **Dish Logistics** — Section in Recipe Builder (baseline + service overrides).
- **Logistics Summary** — Collapsible section in Menu Intelligence + link to planner.
- **Logistics Planner** — `/logistics-planner/:menuEventId` (full load-out, overrides, export).

---

## Services

- `equipment-data.service.ts` — CRUD Equipment (localStorage, signals).
- `venue-data.service.ts` — CRUD Venue Profiles.
- `logistics-engine.service.ts` — 6-step resolution for a MenuEvent.
- `logistics-history.service.ts` — Pattern analysis (Phase 5).

---

## Implementation Phases

**Phase 1:** Models, EquipmentDataService, Equipment Inventory page, dictionary.
**Phase 2:** VenueDataService, Venue UI, Dish Logistics in Recipe Builder, demo data.
**Phase 3:** LogisticsEngineService, Menu Intelligence summary.
**Phase 4:** Logistics Planner page, conflict detection, export.
**Phase 5:** Analytics, Dashboard, polish.
