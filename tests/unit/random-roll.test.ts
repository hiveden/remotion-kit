import { describe, it, expect } from 'vitest'
import { rollEverything } from '@/lib/demo/random-roll'
import { DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF } from '@/lib/demo/defaults'
import { coverRegistry, bodyRegistry, ctaRegistry } from '@/lib/templates/registry'

describe('rollEverything', () => {
  it('returns a brand pair from the curated pool', () => {
    const r = rollEverything(DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF, -1)
    expect(r.brand.colors.primary).toMatch(/^#[0-9A-F]{6}$/i)
    expect(r.brand.colors.secondary).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('picks each segment from its registry', () => {
    const r = rollEverything(DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF, -1)
    expect(coverRegistry.lookup(r.snapshot.componentType.cover)).not.toBeNull()
    expect(bodyRegistry.lookup(r.snapshot.componentType.body)).not.toBeNull()
    expect(ctaRegistry.lookup(r.snapshot.componentType.cta)).not.toBeNull()
  })

  it('rolls element overrides inside elementsSchema bounds', () => {
    const r = rollEverything(DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF, -1)
    const coverEntry = coverRegistry.lookup(r.snapshot.componentType.cover)!
    for (const field of coverEntry.metadata.elementsSchema) {
      const value = r.snapshot.elements.cover[field.key]
      if (field.kind === 'enum' || field.kind === 'font-preset') {
        expect((field.enumValues ?? []).includes(value as string)).toBe(true)
      } else if (field.kind === 'boolean') {
        expect(typeof value).toBe('boolean')
      } else if (field.kind === 'number') {
        const min = field.min ?? 0
        const max = field.max ?? 100
        expect(typeof value).toBe('number')
        expect(value as number).toBeGreaterThanOrEqual(min)
        expect(value as number).toBeLessThanOrEqual(max)
      }
    }
  })

  it('does not pair mono components with duo accentMode', () => {
    for (let i = 0; i < 50; i++) {
      const r = rollEverything(DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF, -1)
      for (const scope of ['cover', 'body', 'cta'] as const) {
        const registry =
          scope === 'cover' ? coverRegistry : scope === 'body' ? bodyRegistry : ctaRegistry
        const entry = registry.lookup(r.snapshot.componentType[scope])!
        if (entry.metadata.aesthetic.palette === 'mono') {
          expect(r.snapshot.elements[scope].accentMode).not.toBe('duo')
        }
      }
    }
  })

  it('always returns a snapshot within MAX_RETRIES (no infinite loop)', () => {
    const r = rollEverything(DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF, -1)
    expect(r.retries).toBeLessThanOrEqual(6)
    expect(r.snapshot.componentType.cover).toBeTruthy()
  })

  it('updates brand state without losing the rest of the brand kit', () => {
    const r = rollEverything(DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF, -1)
    expect(r.brand.id).toBe(DEFAULT_DEMO_BRAND.id)
    expect(r.brand.name).toBe(DEFAULT_DEMO_BRAND.name)
    expect(r.brand.fontPreset).toBe(DEFAULT_DEMO_BRAND.fontPreset)
  })

  it('produces different pairIdx than last (avoids immediate repeats)', () => {
    const a = rollEverything(DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF, -1)
    const b = rollEverything(DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF, a.pairIdx)
    expect(b.pairIdx).not.toBe(a.pairIdx)
  })
})
