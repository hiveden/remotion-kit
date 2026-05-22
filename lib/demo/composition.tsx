// lib/demo/composition.tsx
//
// Demo Composition driven by `inputProps` so @remotion/player re-renders on
// every panel state change. The actual segment rendering is delegated to the
// component registry (`lib/templates/registry`) — each segment looks up the
// matching variant via `brief.componentType` (fallback: registry default)
// and merges `brief.elements` overrides on top of the variant's defaults.

import React from 'react'
import { Sequence } from 'remotion'
import {
  coverRegistry,
  bodyRegistry,
  ctaRegistry,
  type Registry,
} from '@/lib/templates/registry'
import type { DemoBrandState, DemoBrief } from './types'
import { DEMO_FRAMES } from './defaults'

interface CompositionProps {
  brand: DemoBrandState
  brief: DemoBrief
}

interface SegmentSliceProps {
  brand: DemoBrandState
  brief: DemoBrief
  registry: Registry
  scope: 'cover' | 'body' | 'cta'
}

function SegmentSlice({ brand, brief, registry, scope }: SegmentSliceProps) {
  const componentType = brief.componentType?.[scope]
  const entry = registry.lookupOrDefault(componentType)
  const elements = {
    ...entry.metadata.elementsDefaults,
    ...brief.elements?.[scope],
  }
  const Component = entry.Component
  return <Component brand={brand} brief={brief} elements={elements} />
}

export default function DemoComposition({ brand, brief }: CompositionProps) {
  return (
    <>
      <Sequence durationInFrames={DEMO_FRAMES.cover}>
        <SegmentSlice brand={brand} brief={brief} registry={coverRegistry} scope="cover" />
      </Sequence>
      <Sequence from={DEMO_FRAMES.cover} durationInFrames={DEMO_FRAMES.body}>
        <SegmentSlice brand={brand} brief={brief} registry={bodyRegistry} scope="body" />
      </Sequence>
      <Sequence
        from={DEMO_FRAMES.cover + DEMO_FRAMES.body}
        durationInFrames={DEMO_FRAMES.cta}
      >
        <SegmentSlice brand={brand} brief={brief} registry={ctaRegistry} scope="cta" />
      </Sequence>
    </>
  )
}
