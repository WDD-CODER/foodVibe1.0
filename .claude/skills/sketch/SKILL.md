---
name: sketch
description: Teaches an agent to draw a marijuana cannabis leaf as a self-contained SVG file.
---

# Skill: sketch

**Trigger:** When the user asks to draw, sketch, illustrate, or render a cannabis leaf,
marijuana leaf, weed leaf, or cannabis plant symbol as SVG or vector art.

**Do NOT trigger for:** requests to draw other plants (roses, sunflowers, trees),
non-plant subjects, or non-SVG output formats.

---

## Phase 1: Canvas Setup

Create a self-contained SVG file with these attributes:
- `viewBox="0 0 200 200"` — square canvas, origin at center-top
- `xmlns="http://www.w3.org/2000/svg"` — required namespace
- `width` and `height` set to "200" for default display size

---

## Phase 2: Leaf Outline

Draw the cannabis leaf outline using a `<path>` element:
- The leaf has 7 lobes (seven pointed leaflets) radiating from a central base
- Each lobe has serrated (jagged) edges — small notches along both sides of every leaflet
- The shape is symmetric about the vertical center axis — mirror the left lobes to the right
- Proportions: leaf width ≈ 1.2× leaf height; the 3 central lobes are tallest, outer pairs shorter
- Lobes should alternate in size (larger lobes at the sides, smaller at top)
- The overall shape should fit within the upper 75% of the viewBox

---

## Phase 3: Vein Pattern

Add internal veins using thin `<line>` elements:
- **Central vein**: a single line running from the stem base to the tip of the center lobe
- **Branch veins**: one vein extending from the central vein into each of the 7 lobes
- Stroke: slightly darker green, width 0.5–1px — veins should be subtle, not dominant

---

## Phase 4: Stem

Add a stem below the leaf base:
- Use a `<line>` or narrow `<rect>` element
- Stem should extend downward from the bottom-center of the leaf

---

## Phase 4: Color and Stroke

Apply visual styling:
- Fill the leaf with a green color (e.g., `#2d6a2d` or `#4a7c3f`)
- Add a darker stroke for definition
- Stroke-width: 1–2px

---

## Completion Gate

Output: a single `.svg` file, self-contained, no external dependencies.
