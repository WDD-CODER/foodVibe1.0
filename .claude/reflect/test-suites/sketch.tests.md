# Sketch Test Suite

## Metadata
- skill_file: .claude/skills/sketch/SKILL.md
- version: 2.0
- last_updated: 2026-04-04

## Test Cases

### TC-001: Draw a Cannabis Leaf (Happy Path)
**Prompt**: |
  Draw me a marijuana leaf as an SVG file

**Concrete Checks** (machine-verified by test-runner.sh):
- GREP: "SVG"
- GREP: "viewBox"
- GREP: "7 lobes"
- GREP: "serrated"
- GREP: "symmetric"
- GREP: "stem"

**Agent-Evaluated Behaviors** (scored by evaluator agent, 30% weight):
- [ ] Instructions specify lobe count precisely enough that an agent would reliably produce a 7-lobe shape (not a vague "many lobes")
- [ ] Instructions describe serration explicitly so an agent following them would produce visually jagged edges, not just a smooth outline

**Anti-Patterns** (machine-verified):
- GREP-NOT: "multiple pointed lobes"

### TC-002: Leaf Anatomy Detail (Veins and Proportions)
**Prompt**: |
  Sketch a detailed cannabis leaf SVG with accurate botanical proportions

**Concrete Checks** (machine-verified by test-runner.sh):
- GREP: "vein"
- GREP: "proportions"

**Agent-Evaluated Behaviors** (scored by evaluator agent, 30% weight):
- [ ] Instructions describe a vein hierarchy: a central vein plus branch veins into each lobe — not just "add veins" without placement guidance
- [ ] Instructions include a numerical or relative proportion spec so an agent produces consistent shapes

**Anti-Patterns** (machine-verified):
- GREP-NOT: "arbitrary shape"

### TC-003: SVG Technical Quality
**Prompt**: |
  Create a cannabis leaf symbol as a clean SVG vector graphic

**Concrete Checks** (machine-verified by test-runner.sh):
- GREP: "path"
- LINE-COUNT: <= 100

**Agent-Evaluated Behaviors** (scored by evaluator agent, 30% weight):
- [ ] Instructions specify the SVG must be self-contained with no external dependencies
- [ ] Instructions give a concrete viewBox value so an agent produces consistent canvas dimensions

**Anti-Patterns** (machine-verified):
- GREP-NOT: "requires a browser"

### TC-004: Trigger Boundary — Should NOT Activate
**Prompt**: |
  Draw me a rose as an SVG

**Concrete Checks** (machine-verified by test-runner.sh):
- GREP: "Do NOT trigger for"

**Agent-Evaluated Behaviors** (scored by evaluator agent, 30% weight):
- [ ] The trigger section explicitly lists non-cannabis plants as excluded so the skill would not activate for a rose or sunflower
- [ ] The exclusion list is broad enough to cover other common plants, not just one specific word

**Anti-Patterns** (machine-verified):
- GREP-NOT: "roses"

### TC-005: Trigger Boundary — SHOULD Activate
**Prompt**: |
  sketch cannabis plant symbol

**Concrete Checks** (machine-verified by test-runner.sh):
- GREP: "cannabis plant symbol"

**Agent-Evaluated Behaviors** (scored by evaluator agent, 30% weight):
- [ ] The trigger includes "cannabis plant symbol" so this prompt activates the skill
- [ ] The trigger uses inclusive OR logic (draw OR sketch OR illustrate) so stylistic prompt variations still activate the skill

**Anti-Patterns** (machine-verified):
- GREP-NOT: "do not draw"
