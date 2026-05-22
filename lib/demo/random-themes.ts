// lib/demo/random-themes.ts
//
// Color pool for the 🎲 random-theme button. Each pair is hand-picked for
// WCAG AA contrast against the dark canvas backdrop and avoids muddy /
// over-saturated combinations. The first three entries mirror the bundled
// brand kits so the random pool stays culturally consistent with them.

export interface ThemePair {
  primary: string
  secondary: string
}

export const RANDOM_THEME_PAIRS: readonly ThemePair[] = [
  { primary: '#A855F7', secondary: '#3B82F6' },
  { primary: '#3B82F6', secondary: '#10B981' },
  { primary: '#F59E0B', secondary: '#EF4444' },
  { primary: '#EC4899', secondary: '#8B5CF6' },
  { primary: '#06B6D4', secondary: '#A855F7' },
  { primary: '#10B981', secondary: '#F59E0B' },
  { primary: '#F97316', secondary: '#EAB308' },
  { primary: '#84CC16', secondary: '#06B6D4' },
  { primary: '#14B8A6', secondary: '#F43F5E' },
  { primary: '#8B5CF6', secondary: '#22D3EE' },
  { primary: '#D946EF', secondary: '#FB923C' },
  { primary: '#0EA5E9', secondary: '#FACC15' },
  { primary: '#F43F5E', secondary: '#0EA5E9' },
  { primary: '#A3E635', secondary: '#7C3AED' },
  { primary: '#FB7185', secondary: '#06B6D4' },
] as const

export function randomThemePair(currentIdx: number): { pair: ThemePair; idx: number } {
  if (RANDOM_THEME_PAIRS.length === 0) {
    throw new Error('RANDOM_THEME_PAIRS pool is empty')
  }
  let next = Math.floor(Math.random() * RANDOM_THEME_PAIRS.length)
  if (next === currentIdx && RANDOM_THEME_PAIRS.length > 1) {
    next = (next + 1) % RANDOM_THEME_PAIRS.length
  }
  return { pair: RANDOM_THEME_PAIRS[next]!, idx: next }
}
