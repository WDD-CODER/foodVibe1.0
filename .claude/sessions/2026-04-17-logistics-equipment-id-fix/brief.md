# Session Brief

## Session ID
2026-04-17-logistics-equipment-id-fix

## Branch
feat/session-20260417

## Date
2026-04-17

## Goal
Investigate and fix logistics container items showing raw IDs (eq_055, eq_056) instead of Hebrew equipment names for signed-in users.

## Success Criteria
1. Root cause of raw ID display identified
2. MongoDB data corruption fixed (206 documents: 160 dishes + 46 recipes)
3. Code fallback added so `getEquipmentNameById` resolves `_masterId` as backup
4. `recipe-ai-flow.service.ts` AI snapshot builder also uses `_masterId` fallback
5. `sync-master.js` remaps logistics equipment IDs when syncing master recipes/dishes to users
6. Build passes with 0 errors

## Out of Scope
- 404 errors on recipe navigation (expected behavior — two-step resolver fallback)
- UI changes
