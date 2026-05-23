// lib/demo/random-roll.ts
//
// 🎲 Phase D — full random roll:
//   - brand primary/secondary from RANDOM_THEME_PAIRS
//   - per-segment componentType picked uniformly from registry entries
//   - per-segment element overrides picked from each component's
//     elementsSchema enum / boolean / number ranges
//
// Aesthetic gate: each candidate roll is scored; rolls that violate the
// rules (low contrast pair, mixing 'mono' with two distinct accents, etc.)
// are rejected up to N retries. After N retries we ship whatever we have
// rather than blocking the user — the gate is best-effort, not a hard fail.

import type { DemoBrandState, DemoBrief } from './types'
import { RANDOM_THEME_PAIRS, randomThemePair, type ThemePair } from './random-themes'
import { coverRegistry, bodyRegistry, ctaRegistry } from '@/lib/templates/registry'
import type {
  ComponentMetadata,
  ElementSchemaField,
  Registry,
  SegmentRole,
} from '@/lib/templates/registry'

const MAX_RETRIES = 6

export interface RollSnapshot {
  brand: { primary: string; secondary: string; pairIdx: number }
  componentType: { cover: string; body: string; cta: string }
  elements: {
    cover: Record<string, unknown>
    body: Record<string, unknown>
    cta: Record<string, unknown>
  }
}

function pickFrom<T>(xs: ReadonlyArray<T>): T {
  return xs[Math.floor(Math.random() * xs.length)]!
}

function pickElement(field: ElementSchemaField, currentElements: Record<string, unknown>): unknown {
  if (field.kind === 'boolean') {
    return Math.random() < 0.5
  }
  if (field.kind === 'number') {
    const min = field.min ?? 0
    const max = field.max ?? 100
    // Discrete pick across the range — feels intentional, not noise.
    const steps = Math.max(2, Math.min(8, max - min + 1))
    return min + Math.floor(Math.random() * steps) * Math.floor((max - min) / (steps - 1) || 1)
  }
  if (field.kind === 'font-preset' || field.kind === 'enum') {
    const options = field.enumValues ?? []
    if (options.length === 0) return currentElements[field.key]
    return pickFrom(options)
  }
  return currentElements[field.key]
}

function rollElements(metadata: ComponentMetadata): Record<string, unknown> {
  const result: Record<string, unknown> = { ...metadata.elementsDefaults }
  for (const field of metadata.elementsSchema) {
    result[field.key] = pickElement(field, result)
  }
  return result
}

function rollSegment(registry: Registry): { id: string; elements: Record<string, unknown> } {
  const entries = registry.list()
  const entry = entries.length > 0 ? pickFrom(entries) : null
  if (!entry) {
    throw new Error(`rollSegment: registry "${registry.constructor.name}" is empty`)
  }
  return {
    id: entry.metadata.id,
    elements: rollElements(entry.metadata),
  }
}

// ----- Aesthetic gate -----
//
// We only enforce a couple of cheap rules that have visible payoff:
//   - if a component is in `mono` palette, don't pick `accentMode: 'duo'`
//     for that component; if it explicitly defaults to 'mono', stick with it.
//   - prevent two consecutive segments from rolling the exact same component
//     id pattern that's known to clash (cover/gradient-hero + body/data-chart
//     looks fine; cover/split-card + body/compare-split feels redundant —
//     soft penalty).
//   - keep the brand pair contrast reasonable (handled by curated pool, so
//     no math required here).

function checkSegmentPalette(
  role: SegmentRole,
  id: string,
  elements: Record<string, unknown>,
): boolean {
  const registry =
    role === 'cover' ? coverRegistry : role === 'body' ? bodyRegistry : ctaRegistry
  const entry = registry.lookup(id)
  if (!entry) return true
  if (entry.metadata.aesthetic.palette === 'mono' && elements.accentMode === 'duo') {
    return false
  }
  return true
}

function passesGate(snapshot: RollSnapshot): boolean {
  // Rule 1: respect palette intent — if a component declares 'mono' palette
  // it must not be paired with accentMode: 'duo'.
  if (!checkSegmentPalette('cover', snapshot.componentType.cover, snapshot.elements.cover)) return false
  if (!checkSegmentPalette('body', snapshot.componentType.body, snapshot.elements.body)) return false
  if (!checkSegmentPalette('cta', snapshot.componentType.cta, snapshot.elements.cta)) return false

  // Rule 2: avoid pairing two heavy split layouts back-to-back.
  const heavySplits = new Set(['cover/split-card', 'body/compare-split'])
  if (heavySplits.has(snapshot.componentType.cover) && heavySplits.has(snapshot.componentType.body)) {
    return false
  }

  return true
}

export interface RandomRollResult {
  brand: DemoBrandState
  brief: DemoBrief
  snapshot: RollSnapshot
  pairIdx: number
  retries: number
}

export function rollEverything(brand: DemoBrandState, brief: DemoBrief, lastPairIdx: number): RandomRollResult {
  let attempts = 0
  let snapshot: RollSnapshot | null = null
  let pair: ThemePair
  let pairIdx: number
  while (attempts < MAX_RETRIES) {
    const picked = randomThemePair(lastPairIdx)
    pair = picked.pair
    pairIdx = picked.idx
    const cover = rollSegment(coverRegistry)
    const body = rollSegment(bodyRegistry)
    const cta = rollSegment(ctaRegistry)
    snapshot = {
      brand: { primary: pair.primary, secondary: pair.secondary, pairIdx },
      componentType: { cover: cover.id, body: body.id, cta: cta.id },
      elements: { cover: cover.elements, body: body.elements, cta: cta.elements },
    }
    if (passesGate(snapshot)) break
    attempts++
  }
  // Either we passed the gate or we hit MAX_RETRIES with the best we have.
  if (!snapshot) {
    // Defensive fallback — should never happen since the loop sets snapshot
    // on every iteration.
    const picked = randomThemePair(lastPairIdx)
    snapshot = {
      brand: { primary: picked.pair.primary, secondary: picked.pair.secondary, pairIdx: picked.idx },
      componentType: {
        cover: coverRegistry.defaultEntryId() ?? 'cover/metallic-default',
        body: bodyRegistry.defaultEntryId() ?? 'body/header-content-default',
        cta: ctaRegistry.defaultEntryId() ?? 'cta/logo-fade-default',
      },
      elements: { cover: {}, body: {}, cta: {} },
    }
  }
  const nextBrand: DemoBrandState = {
    ...brand,
    colors: {
      ...brand.colors,
      primary: snapshot.brand.primary,
      secondary: snapshot.brand.secondary,
    },
  }
  const nextBrief: DemoBrief = {
    ...brief,
    componentType: { ...brief.componentType, ...snapshot.componentType },
    elements: {
      cover: { ...brief.elements?.cover, ...snapshot.elements.cover },
      body: { ...brief.elements?.body, ...snapshot.elements.body },
      cta: { ...brief.elements?.cta, ...snapshot.elements.cta },
    },
  }
  return { brand: nextBrand, brief: nextBrief, snapshot, pairIdx: snapshot.brand.pairIdx, retries: attempts }
}

export { RANDOM_THEME_PAIRS }
