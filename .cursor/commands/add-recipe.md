# Add Recipe or Dish

1. **Read and follow** [.assistant/skills/add-recipe/SKILL.md](.assistant/skills/add-recipe/SKILL.md) start-to-finish.
2. Use the image or pasted text the user provided (or ask for it if missing).
3. **Duplicate name check (Step 4b):** Before Step 5, check if the chosen name already exists in demo-recipes.json or demo-dishes.json. If it does, use "[name] (2)" (or (3) if (2) exists) for the new entry and in Step 5 explicitly tell the user: "The name '[name]' is already in use (as [id]); the new entry will be stored as **[name] (2)** so you can tell it's not the same one. You can rename it later if you prefer."
4. **Step 5 (confirm) is mandatory and must be done in full, every time.** You must present in this order:
   - **Visual structure**: target file, new ID, type, and the tree (name_hebrew, yield, station, ingredients count, steps, logistics count, mise). If a similar entry exists, ask: new entry or update existing?
   - **Summary table**: name, type, yield, default_station_, measurement units, labels_, ingredient count, logistics count, mise (count or none).
   - **מרכיבים table** (all ingredients with OK? column).
   - **לוגיסטיקה table** (all equipment).
   - **מיסום table** (for dishes).
   - End with: "Reply **confirm** (or yes / add it) to add this to the demo data, or **deny** and say what to change. I will not write any file until you confirm."
5. **Do not write** to any demo JSON until the user explicitly confirms (e.g. confirm, yes, add it). Then run Step 6 → verify → report.
