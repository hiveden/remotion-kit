// lib/templates/registry/index.ts
//
// Singleton segment registries. Modules importing this file get the
// fully-populated three registries — registration happens eagerly at module
// load so dynamic imports of `Registry.list()` see a stable set.

import { Registry } from './types'
import type { SegmentRole } from './types'
import { coverDefaultEntry } from './components/cover-default'
import { coverGradientHeroEntry } from './components/cover-gradient-hero'
import { bodyDefaultEntry } from './components/body-default'
import { ctaDefaultEntry } from './components/cta-default'

export const coverRegistry = new Registry('cover')
export const bodyRegistry = new Registry('body')
export const ctaRegistry = new Registry('cta')

// Cover variants: default first so empty briefs render the metallic baseline.
coverRegistry.register(coverDefaultEntry, { default: true })
coverRegistry.register(coverGradientHeroEntry)

// Body / CTA: only the lifted defaults for now; Designer Phase B §6/§7/§10
// variants are deferred to the next slice.
bodyRegistry.register(bodyDefaultEntry, { default: true })
ctaRegistry.register(ctaDefaultEntry, { default: true })

export function registryFor(role: SegmentRole): Registry {
  if (role === 'cover') return coverRegistry
  if (role === 'body') return bodyRegistry
  return ctaRegistry
}

export type { Registry, SegmentRole, ComponentEntry, ComponentMetadata } from './types'
