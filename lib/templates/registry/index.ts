// lib/templates/registry/index.ts
//
// Singleton segment registries. Modules importing this file get the
// fully-populated three registries — registration happens eagerly at module
// load so dynamic imports of `Registry.list()` see a stable set.

import { Registry } from './types'
import type { SegmentRole } from './types'
import { coverDefaultEntry } from './components/cover-default'
import { coverGradientHeroEntry } from './components/cover-gradient-hero'
import { coverSplitCardEntry } from './components/cover-split-card'
import { bodyDefaultEntry } from './components/body-default'
import { bodyDataChartEntry } from './components/body-data-chart'
import { bodyCompareSplitEntry } from './components/body-compare-split'
import { ctaDefaultEntry } from './components/cta-default'
import { ctaQrCalloutEntry } from './components/cta-qr-callout'
import { ctaFollowCardEntry } from './components/cta-follow-card'

export const coverRegistry = new Registry('cover')
export const bodyRegistry = new Registry('body')
export const ctaRegistry = new Registry('cta')

// Defaults first so empty briefs render the v0.2-fix baseline.
coverRegistry.register(coverDefaultEntry, { default: true })
coverRegistry.register(coverGradientHeroEntry)
coverRegistry.register(coverSplitCardEntry)

bodyRegistry.register(bodyDefaultEntry, { default: true })
bodyRegistry.register(bodyDataChartEntry)
bodyRegistry.register(bodyCompareSplitEntry)

ctaRegistry.register(ctaDefaultEntry, { default: true })
ctaRegistry.register(ctaQrCalloutEntry)
ctaRegistry.register(ctaFollowCardEntry)

export function registryFor(role: SegmentRole): Registry {
  if (role === 'cover') return coverRegistry
  if (role === 'body') return bodyRegistry
  return ctaRegistry
}

export type {
  Registry,
  SegmentRole,
  ComponentEntry,
  ComponentMetadata,
  ElementSchemaField,
  ElementKind,
  SegmentProps,
} from './types'
