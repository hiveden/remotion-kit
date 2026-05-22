// lib/templates/registry/components/body-default.tsx
//
// body/header-content-default — 1:1 lift of the v0.2 fix BodySegment.

import React from 'react'
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { ThreePartLayout } from '@/lib/templates/shared/three-part-layout'
import {
  FONT_SANS,
  FONT_MONO,
  TEXT_HIGH,
  TEXT_LOW,
} from '@/lib/templates/brief/tokens'
import type {
  DemoBrandState,
  DemoBrief,
  SubtitleStyleId,
} from '@/lib/demo/types'
import type { ComponentEntry, SegmentProps } from '../types'

function fontScaleFor(preset: DemoBrandState['fontPreset']): number {
  if (preset === 'comfortable') return 1.05
  if (preset === 'spacious') return 1.12
  return 1
}

function BodyHeader({
  brand,
  topic,
  dateLabel,
}: {
  brand: DemoBrandState
  topic: string
  dateLabel: string
}) {
  return (
    <div style={{ paddingBottom: 32, paddingLeft: 60, paddingRight: 60 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <span
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: brand.colors.primary,
            fontFamily: FONT_MONO,
            letterSpacing: '0.1em',
          }}
        >
          {brand.defaultTag ?? 'DEMO'}
        </span>
        <span style={{ fontSize: 24, fontWeight: 500, color: TEXT_LOW, fontFamily: FONT_MONO }}>
          {dateLabel}
        </span>
        <span
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: TEXT_LOW,
            fontFamily: FONT_SANS,
            marginLeft: 'auto',
          }}
        >
          {brand.name}
        </span>
      </div>
      <div
        style={{
          marginTop: 16,
          paddingLeft: 20,
          borderLeft: `3px solid ${brand.colors.primary}`,
        }}
      >
        <span
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: TEXT_HIGH,
            fontFamily: FONT_SANS,
            letterSpacing: '0.04em',
          }}
        >
          {topic || ' '}
        </span>
      </div>
    </div>
  )
}

function BodyVisual({
  brand,
  brief,
  fontScale,
}: {
  brand: DemoBrandState
  brief: DemoBrief
  fontScale: number
}) {
  const metrics = brief.cover.metrics.filter((m) => m.value || m.label)
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 80px',
        gap: 40,
      }}
    >
      <div
        style={{
          color: TEXT_HIGH,
          fontSize: 72 * fontScale,
          fontWeight: 700,
          fontFamily: FONT_SANS,
          letterSpacing: '0.04em',
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {brief.body.title || ' '}
      </div>
      {metrics.length > 0 && (
        <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span
                style={{
                  color: brand.colors.primary,
                  fontSize: 96 * fontScale,
                  fontFamily: FONT_MONO,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}
              >
                {m.value}
              </span>
              <span
                style={{
                  color: TEXT_LOW,
                  fontSize: 28 * fontScale,
                  fontFamily: FONT_SANS,
                  marginTop: 8,
                }}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SubtitleLine({
  brand,
  text,
  style,
  fps,
  frame,
}: {
  brand: DemoBrandState
  text: string
  style: SubtitleStyleId
  fps: number
  frame: number
}) {
  const t = (frame / fps) % 4
  const opacity = interpolate(t, [0, 0.4, 3.6, 4], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const isBold = style === 'bold'
  const isClassic = style === 'classic'
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '24px 60px 0',
        opacity,
      }}
    >
      <div
        style={{
          color: isClassic ? TEXT_HIGH : brand.colors.primary,
          fontSize: isBold ? 56 : 44,
          fontWeight: isBold ? 800 : 600,
          fontFamily: FONT_SANS,
          textAlign: 'center',
          letterSpacing: '0.06em',
          lineHeight: 1.3,
        }}
      >
        {text || ' '}
      </div>
    </div>
  )
}

function BodyHeaderContentDefault({ brand, brief }: SegmentProps) {
  const { fps } = useVideoConfig()
  const frame = useCurrentFrame()
  const fontScale = fontScaleFor(brand.fontPreset)
  return (
    <ThreePartLayout
      backgroundColor="#09090b"
      disableNoise
      header={
        <BodyHeader
          brand={brand}
          topic={brief.body.title}
          dateLabel={`${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}`}
        />
      }
      footer={
        <SubtitleLine
          brand={brand}
          text={brief.body.title}
          style={brief.body.subtitleStyle}
          fps={fps}
          frame={frame}
        />
      }
    >
      <BodyVisual brand={brand} brief={brief} fontScale={fontScale} />
    </ThreePartLayout>
  )
}

export const bodyDefaultEntry: ComponentEntry = {
  metadata: {
    id: 'body/header-content-default',
    name: 'Header + Content 默认',
    description:
      'Three-part layout: brand-aware header bar, centered title + metrics body, animated subtitle footer. v0.2 fix baseline.',
    tags: ['default', 'three-part', 'data-driven'],
    aesthetic: { density: 'medium', motion: 'subtle', palette: 'duo' },
    brandConstraints: {
      requires: ['colors', 'name'],
      optional: ['fontPreset', 'defaultTag'],
    },
    elementsDefaults: {
      fontPreset: 'comfortable',
      subtitleStyle: 'lecture',
      showMetrics: true,
    },
    elementsSchema: [
      {
        key: 'fontPreset',
        label: '字体粒度',
        kind: 'font-preset',
        enumValues: ['compact', 'comfortable', 'spacious'],
      },
      {
        key: 'subtitleStyle',
        label: '字幕样式',
        kind: 'enum',
        enumValues: ['classic', 'bold', 'lecture'],
      },
      { key: 'showMetrics', label: '展示 metrics', kind: 'boolean' },
    ],
  },
  Component: BodyHeaderContentDefault,
}
