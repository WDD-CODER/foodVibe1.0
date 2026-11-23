'use strict';
/**
 * Plan 679 (C-AI): the one place where the assistant's blocks live. Pure: `applyGuardrails(answer, ctx)` →
 * `{ ok: true, answer }` or `{ ok: false, reason }`. `ctx` is `{ profile, factIds, factsText, history, aiTurns, now, mode }`.
 * This plan: the model's own handoff flag, and facts the model named that do not exist (R-08). Plan 689 adds every
 * other check here and nowhere else.
 */
function applyGuardrails(answer, ctx) {
  if (answer.handoff === true) return { ok: false, reason: 'model' };
  const known = new Set(ctx.factIds ?? []);
  return { ok: true, answer: { ...answer, usedFacts: (answer.usedFacts ?? []).filter(id => known.has(id)) } };
}

module.exports = { applyGuardrails };
