# Quantity & Unit Parsing — Worked Examples

Reference for `add-recipe` Phase 1. Consult this when an ingredient line doesn't obviously fit the inline rules. Each row shows the source text and the resulting `{amount, unit}` (plus `note_` when the rule requires preserving extra context).

## Integers and decimals

| Input | amount | unit | note_ |
|---|---|---|---|
| `2 eggs` | 2 | unit | — |
| `500 grams flour` | 500 | gram | — |
| `2.5 kg potatoes` | 2.5 | kg | — |
| `שתי ביצים` | 2 | unit | — |
| `500 גרם קמח` | 500 | gram | — |

## Fractions

| Input | amount | unit | note_ |
|---|---|---|---|
| `1½ cups sugar` | 1.5 | cup | — |
| `3/4 tsp salt` | 0.75 | teaspoon | — |
| `1 1/2 tablespoons oil` | 1.5 | tablespoon | — |
| `¼ ליטר שמן` | 0.25 | liter | — |
| `כוס וחצי קמח` | 1.5 | cup | — |

## Ranges

| Input | amount | unit | note_ |
|---|---|---|---|
| `2-3 tbsp olive oil` | 2.5 | tablespoon | "טווח מקורי: 2-3" |
| `2 עד 3 כפות שמן זית` | 2.5 | tablespoon | "טווח מקורי: 2-3" |
| `4-6 servings` (yield, not ingredient) | 5 | portion | "טווח מקורי: 4-6" |

## Embedded alternative quantities

| Input | amount | unit | note_ |
|---|---|---|---|
| `2 eggs (or 3 if small)` | 2 | unit | "חלופה: 3 אם קטנות" |
| `1 onion, or 2 small ones` | 1 | unit | "חלופה: 2 קטנים" |
| `2 ביצים (או 3 אם קטנות)` | 2 | unit | "חלופה: או 3 אם קטנות" |

## Hebrew numerals / number-words

| Input | amount | unit | note_ |
|---|---|---|---|
| `שתי ביצים` | 2 | unit | — |
| `כפית אחת מלח` | 1 | teaspoon | — |
| `שלוש כוסות מים` | 3 | cup | — |
| `חצי כפית סוכר` | 0.5 | teaspoon | — |

## No explicit quantity

| Input | amount | unit | note_ |
|---|---|---|---|
| `salt to taste` | null | to_taste (if resolvable) or unresolved-flag | "לפי הטעם" |
| `מלח לפי הטעם` | null | to_taste (if resolvable) or unresolved-flag | — |
| `garnish with parsley` | null | unresolved-flag | "לקישוט" |

## Unit abbreviation normalization (pre-resolution)

| Raw text token | Normalized before resolution |
|---|---|
| `כפ׳`, `כף` | tablespoon |
| `כפית` | teaspoon |
| `כוס` | cup |
| `גר׳`, `גרם` | gram |
| `ק"ג`, `קילו` | kg |
| `מ"ל` | ml |
| `ליטר` | liter |
| `יח׳`, `יחידה` | unit |
| `קורט` | pinch |

## Multi-part composite lines (split, don't merge)

| Input | Result |
|---|---|
| `2 cups flour + 1 tsp salt` | Two entries: `{2, cup}` (flour) and `{1, teaspoon}` (salt) |
| `500 גרם עוף, 2 כפות שמן זית` | Two entries: `{500, gram}` (עוף) and `{2, tablespoon}` (שמן זית) |

## Anti-patterns (do NOT do this)

- Do NOT take a quantity mentioned in the instructions/steps text and attach it to an ingredient line that itself has no quantity — this is a common source of an irrelevant quantity ending up on the wrong item.
- Do NOT average a range silently without recording the original range in `note_`.
- Do NOT let a parenthetical alternative quantity overwrite the primary amount.
- Do NOT invent a quantity of `1` as a fallback when none is stated — leave it flagged instead.
