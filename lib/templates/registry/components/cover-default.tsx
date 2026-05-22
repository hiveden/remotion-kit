// lib/templates/registry/components/cover-default.tsx
//
// cover/metallic-default — 1:1 lift of the v0.2 fix CoverSegment. Visuals
// are owned by <CoverFrame> from the brief template; this entry just wraps
// it into the registry contract.

import React from 'react'
import { CoverFrame } from '@/lib/templates/shared/cover-frame'
import { DEMO_FRAMES } from '@/lib/demo/defaults'
import type { ComponentEntry, SegmentProps } from '../types'

function CoverMetallicDefault({ brand, brief }: SegmentProps) {
  const today = new Date()
  const dateLabel = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}`
  const labelText = brand.defaultTag ?? 'DEMO'
  return (
    <CoverFrame
      label={`${labelText} · ${dateLabel}`}
      date={dateLabel}
      title={brief.cover.title || ' '}
      subtitle={brief.cover.subtitle}
      tag={brief.cover.tag}
      metrics={brief.cover.metrics
        .filter((m) => m.value || m.label)
        .map((m) => ({ value: m.value, label: m.label }))}
      secondaryAccent={brand.colors.secondary}
      durationInFrames={DEMO_FRAMES.cover}
    />
  )
}

export const coverDefaultEntry: ComponentEntry = {
  metadata: {
    id: 'cover/metallic-default',
    name: 'Metallic 信息密报',
    description:
      'Information-dense cover with metallic header bar, bottom brand footer, and horizontal metrics. v0.2 fix baseline.',
    tags: ['default', 'metallic', 'data-driven', 'high-density'],
    aesthetic: { density: 'high', motion: 'static', palette: 'duo' },
    brandConstraints: {
      requires: ['colors', 'name'],
      optional: ['logo', 'fontPreset', 'defaultTag'],
    },
    elementsDefaults: {
      fontPreset: 'comfortable',
      backgroundStyle: 'metallic',
      metricsLayout: 'horizontal',
      showTag: true,
      accentMode: 'duo',
    },
    elementsSchema: [
      {
        key: 'fontPreset',
        label: '字体粒度',
        kind: 'font-preset',
        enumValues: ['compact', 'comfortable', 'spacious'],
      },
      {
        key: 'backgroundStyle',
        label: '背景风格',
        kind: 'enum',
        enumValues: ['metallic', 'solid', 'gradient'],
      },
      {
        key: 'metricsLayout',
        label: 'Metrics 排列',
        kind: 'enum',
        enumValues: ['horizontal', 'stacked', 'grid'],
      },
      { key: 'showTag', label: '显示 Tag', kind: 'boolean' },
      { key: 'accentMode', label: '配色模式', kind: 'enum', enumValues: ['mono', 'duo'] },
    ],
  },
  Component: CoverMetallicDefault,
}
