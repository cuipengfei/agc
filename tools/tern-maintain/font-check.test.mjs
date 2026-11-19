import { test, expect } from 'bun:test';
import { classifyFonts } from './font-check.mjs';

const family = 'Maple Mono NF CN', builtin = 'Ioskeley Mono Term';
function evidence(cold, warm, extra = {}) {
  return { identityMatches: true, delivered: true, family, builtin, runs: [
    { phase: 'cold', matched: cold }, { phase: 'warm', matched: warm },
    { phase: 'builtin', matched: builtin }, { phase: 'missing', matched: null },
  ], ...extra };
}

test('cold and warm name selection must both choose the requested family', () => {
  expect(classifyFonts(evidence(family, family))).toBe('working');
  expect(classifyFonts(evidence(family, builtin))).toBe('needs_investigation');
  expect(classifyFonts(evidence(null, family))).toBe('needs_investigation');
});

test('a registration defect requires successful font delivery and valid controls', () => {
  expect(classifyFonts(evidence(null, null))).toBe('registration_missing');
  expect(classifyFonts(evidence(null, null, { delivered: false }))).toBe('needs_investigation');
  const invalidControl = evidence(null, null);
  invalidControl.runs[3].matched = family;
  expect(classifyFonts(invalidControl)).toBe('needs_investigation');
});

test('unknown modules and incomplete observations never authorize a patch', () => {
  expect(classifyFonts(evidence(null, null, { identityMatches: false }))).toBe('needs_investigation');
  const incomplete = evidence(family, family);
  incomplete.runs[0].error = 'Font selector local layout changed';
  expect(classifyFonts(incomplete)).toBe('needs_investigation');
  expect(classifyFonts({ ...incomplete, runs: [] })).toBe('needs_investigation');
});
