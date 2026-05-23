// lib/templates/registry/components/body-compare-split.tsx
//
// body/compare-split — vertical divider, two columns of bullet points, optional
// VS chip in the middle. For A-vs-B / pros-cons / dual-subject content.

import React from 'react'
import { AbsoluteFill } from 'remotion'
import {
  FONT_SANS,
  FONT_MONO,
  TEXT_HIGH,
  TEXT_LOW,
  TEXT_MEDIUM,
} from '@/lib/templates/brief/tokens'
import type { DemoBrandState } from '@/lib/demo/types'
import type { ComponentEntry, SegmentProps } from '../types'

type DividerStyle = 'solid' | 'gradient' | 'dotted' | 'none'
type ColumnLabelStyle = 'header' | 'tag' | 'underline'
type AccentMode = 'mono' | 'duo'

const FONT_SCALE: Record<DemoBrandState['fontPreset'], number> = {
  compact: 0.92,
  comfortable: 1,
  spacious: 1.08,
}

interface ColumnProps {
  label: string
  points: string[]
  accent: string
  labelStyle: ColumnLabelStyle
  scale: number
}

function Column({ label, points, accent, labelStyle, scale }: ColumnProps) {
  const labelEl =
    labelStyle === 'tag' ? (
      <span
        style={{
          alignSelf: 'flex-start',
          fontFamily: FONT_MONO,
          fontSize: 28,
          color: '#fff',
          background: accent,
          padding: '6px 16px',
          borderRadius: 999,
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
    ) : labelStyle === 'underline' ? (
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 40 * scale,
          fontWeight: 600,
          color: accent,
          borderBottom: `3px solid ${accent}`,
          paddingBottom: 6,
          alignSelf: 'flex-start',
        }}
      >
        {label}
      </div>
    ) : (
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 48 * scale,
          fontWeight: 700,
          color: accent,
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </div>
    )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 56px' }}>
      {labelEl}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {points.map((p, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONT_SANS,
              fontSize: 30 * scale,
              color: TEXT_MEDIUM,
              display: 'flex',
              gap: 12,
            }}
          >
            <span style={{ color: accent }}>▸</span>
            <span>{p}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Divider({
  style,
  primary,
  secondary,
}: {
  style: DividerStyle
  primary: string
  secondary: string
}) {
  if (style === 'none') return <div style={{ width: 12 }} />
  if (style === 'gradient') {
    return (
      <div
        style={{
          width: 4,
          background: `linear-gradient(180deg, transparent 0%, ${primary} 35%, ${secondary} 65%, transparent 100%)`,
        }}
      />
    )
  }
  if (style === 'dotted') {
    return (
      <div
        style={{
          width: 4,
          background:
            'repeating-linear-gradient(180deg, rgba(255,255,255,0.45) 0px, rgba(255,255,255,0.45) 14px, transparent 14px, transparent 28px)',
        }}
      />
    )
  }
  return <div style={{ width: 4, background: 'rgba(255,255,255,0.2)' }} />
}

function splitPoints(text: string): { left: string[]; right: string[]; leftLabel: string; rightLabel: string } {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  // If user wrote "A vs B" as title, split on "vs"; else use defaults.
  const vsMatch = lines[0]?.match(/^(.+?)\s+(?:vs\.?|对比|VS)\s+(.+)$/i)
  const leftLabel = vsMatch?.[1] ?? 'A 方案'
  const rightLabel = vsMatch?.[2] ?? 'B 方案'
  const restLines = vsMatch ? lines.slice(1) : lines
  const left: string[] = []
  const right: string[] = []
  restLines.forEach((line, i) => {
    const target = line.startsWith('-') || line.startsWith('~') ? (i % 2 === 0 ? left : right) : (i % 2 === 0 ? left : right)
    target.push(line.replace(/^[-~]\s*/, ''))
  })
  // Fallback default points so empty briefs still render something readable.
  if (left.length === 0) left.push('优点 1', '优点 2', '优点 3')
  if (right.length === 0) right.push('优点 1', '优点 2', '优点 3')
  return { left, right, leftLabel, rightLabel }
}

function BodyCompareSplit({ brand, brief, elements }: SegmentProps) {
  const fontPreset =
    (elements.fontPreset as DemoBrandState['fontPreset']) ?? brand.fontPreset ?? 'comfortable'
  const dividerStyle = (elements.dividerStyle as DividerStyle) ?? 'gradient'
  const columnLabelStyle = (elements.columnLabelStyle as ColumnLabelStyle) ?? 'header'
  const showVS = (elements.showVS as boolean | undefined) ?? true
  const accentMode = (elements.accentMode as AccentMode) ?? 'duo'

  const primary = brand.colors.primary
  const secondary = accentMode === 'duo' ? brand.colors.secondary ?? primary : primary
  const scaleFactor = FONT_SCALE[fontPreset]

  const { left, right, leftLabel, rightLabel } = splitPoints(brief.body.title || '')

  return (
    <AbsoluteFill style={{ background: '#09090b', color: TEXT_HIGH }}>
      <AbsoluteFill
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '160px 0',
          position: 'relative',
        }}
      >
        <Column
          label={leftLabel}
          points={left}
          accent={primary}
          labelStyle={columnLabelStyle}
          scale={scaleFactor}
        />
        <div style={{ position: 'relative', height: '100%' }}>
          <Divider style={dividerStyle} primary={primary} secondary={secondary} />
          {showVS && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                color: '#fff',
                fontFamily: FONT_MONO,
                fontWeight: 800,
                fontSize: 36,
                letterSpacing: '0.08em',
                padding: '12px 22px',
                borderRadius: 999,
                boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
              }}
            >
              VS
            </div>
          )}
        </div>
        <Column
          label={rightLabel}
          points={right}
          accent={secondary}
          labelStyle={columnLabelStyle}
          scale={scaleFactor}
        />
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT_MONO,
          color: TEXT_LOW,
          fontSize: 20,
          letterSpacing: '0.04em',
        }}
      >
        ▌ {brand.name}
      </div>
    </AbsoluteFill>
  )
}

export const bodyCompareSplitEntry: ComponentEntry = {
  metadata: {
    id: 'body/compare-split',
    name: 'Compare 左右对比',
    description:
      'Two-column comparison body with optional VS chip. Drives A-vs-B / pros-cons / dual-subject content.',
    tags: ['compare', 'split', 'medium-density', 'dual'],
    aesthetic: { density: 'medium', motion: 'subtle', palette: 'duo' },
    brandConstraints: {
      requires: ['colors'],
      optional: ['name'],
    },
    elementsDefaults: {
      fontPreset: 'comfortable',
      dividerStyle: 'gradient',
      columnLabelStyle: 'header',
      showVS: true,
      subtitleStyle: 'lecture',
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
        key: 'dividerStyle',
        label: '分隔线',
        kind: 'enum',
        enumValues: ['solid', 'gradient', 'dotted', 'none'],
      },
      {
        key: 'columnLabelStyle',
        label: '列标题样式',
        kind: 'enum',
        enumValues: ['header', 'tag', 'underline'],
      },
      { key: 'showVS', label: '中间显示 VS', kind: 'boolean' },
      {
        key: 'subtitleStyle',
        label: '字幕样式',
        kind: 'enum',
        enumValues: ['classic', 'bold', 'lecture'],
      },
      { key: 'accentMode', label: '配色模式', kind: 'enum', enumValues: ['mono', 'duo'] },
    ],
  },
  Component: BodyCompareSplit,
}
