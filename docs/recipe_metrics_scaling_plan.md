---
name: Recipe metrics scaling and UX
overview: Fix recipe-builder weight/volume calculation (product conversion_rate_ and registry fallback), show bruto (gross) weight in the metrics-square for chef scale, add a weight/volume toggle (משקל ↔ L/ml), and add a warning icon with a list of ingredients that could not be converted to the current unit.
todos: []
isProject: false
---

# Recipe-builder: scaling, bruto, weight/volume toggle, and incomplete-calculation notice

## 1. Core weight calculation fix (required)

**File:** src/app/core/services/recipe-cost.service.ts

- **Product branch:** `conversion_rate_` is "purchase units per 1 base unit" (e.g. 0.001 L per 1 g). Weight in grams = amount in base units when base is gram/kg. Use `amountInBaseUnits = net / (opt.conversion_rate_ || 1)` then `return amountInBaseUnits * (baseKey === 'kg' ? 1000 : 1)`.
- **Registry fallback:** After product and recipe branches in `getRowWeightContributionG`, if the row unit is a known volume/weight key (e.g. `liter`, `l`, `ml`) and has a registry factor > 0, return `net * getConversion(key)`. Restrict to a whitelist so `unit`/`dish` are not treated as grams.

## 2. Bruto (gross) weight in metrics-square — net drives cost

**Cost semantics:** The measurement units the user sets (grams, kg, or any other as main or secondary) are the **net** value. **Cost of the end product is always calculated from net amounts and price per net unit.** Bruto is only for scale in the metrics-square; net drives cost everywhere.

- **RecipeCostService:** `getRowBrutoWeightG`, `computeTotalBrutoWeightG(rows)`.
- **recipe-builder.page.ts:** `totalBrutoWeightG_` signal; pass to header.
- **recipe-header:** Show bruto value as the main weight metric (משקל).

## 3. Weight / volume toggle (משקל ↔ L/ml)

- **RecipeCostService:** `computeTotalVolumeL(rows)` returns `{ totalL, unconvertibleNames }`; volume from registry or 1 g = 1 ml fallback.
- **recipe-header:** `metricsDisplayMode_: 'weight' | 'volume'`; click metric-group toggles; show bruto g or L/ml.

## 4. Incomplete-calculation notice (red icon + floating list)

- Notice applies to the **scale of the current measurement unit** only. Weight mode: icon when some have no weight conversion. Volume mode: icon when some have no volume conversion.
- **RecipeCostService:** `getUnconvertibleNamesForWeight(rows)`; `computeTotalVolumeL` returns unconvertible names.
- **recipe-header:** Red notice icon; floating container lists **names only**; hover (desktop) / click (mobile); ClickOutSideDirective to close.

## 5. File-level checklist

| File | Changes |
|------|--------|
| recipe-cost.service.ts | Fix product weight formula; registry fallback; computeTotalBrutoWeightG; getUnconvertibleNamesForWeight; computeTotalVolumeL with unconvertible names |
| recipe-builder.page.ts | totalBrutoWeightG_, totalVolumeL_, totalVolumeMl_, unconvertibleForWeight_, unconvertibleForVolume_; pass to header |
| recipe-builder.page.html | Bind new inputs to app-recipe-header |
| recipe-header.component.ts | Inputs; metricsDisplayMode_; toggleMetricsDisplayMode; unconvertibleNamesForCurrentMode_; showMetricsNoticeIcon_ |
| recipe-header.component.html | Metrics-square: bruto/volume by mode; clickable metric-group; notice icon + floating list |
| recipe-header.component.scss | .metric-group-weight-volume; .metrics-notice-wrap; .metrics-notice-icon; .metrics-notice-floating; .metrics-notice-item |

## 6. Order of implementation

1. RecipeCostService: Fix product weight conversion and registry fallback; bruto and volume + unconvertible names.
2. recipe-builder.page: Signals and pass to header.
3. recipe-header: Bruto/volume display, toggle, notice icon and floating list, styles.
