// lib/templates/registry/components/cover-split-card.tsx
//
// cover/split-card — left half = brand identity (name + tag + logo), right
// half = vertical stack of metric cards. Balanced information for B2B /
// tech / product cover frames.

import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import {
  FONT_SANS,
  FONT_MONO,
  TEXT_HIGH,
  TEXT_LOW,
  TEXT_MEDIUM,
} from '@/lib/templates/brief/tokens'
import type { DemoBrandState } from '@/lib/demo/types'
import type { ComponentEntry, SegmentProps } from '../types'

type SplitRatio = 'left-heavy' | '40-60' | '50-50' | 'right-heavy'
type CardStyle = 'outlined' | 'filled' | 'gradient'
type CardSeparator = 'border' | 'shadow' | 'gap'
type AccentMode = 'mono' | 'duo'

function splitCols(ratio: SplitRatio): string {
  switch (ratio) {
    case 'left-heavy':
      return '60% 40%'
    case '40-60':
      return '40% 60%'
    case '50-50':
      return '50% 50%'
    case 'right-heavy':
      return '30% 70%'
    default:
      return '40% 60%'
  }
}

const FONT_SCALE: Record<DemoBrandState['fontPreset'], number> = {
  compact: 0.92,
  comfortable: 1,
  spacious: 1.08,
}

interface MetricCardProps {
  value: string
  label: string
  style: CardStyle
  separator: CardSeparator
  primary: string
  accent: string
  index: number
  fps: number
  frame: number
}

function MetricCard({ value, label, style, separator, primary, accent, index, fps, frame }: MetricCardProps) {
  const enter = spring({
    frame: frame - index * 4,
    fps,
    from: 0,
    to: 1,
    config: { damping: 12, stiffness: 110 },
  })
  const bg =
    style === 'filled'
      ? primary
      : style === 'gradient'
        ? `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`
        : 'rgba(255,255,255,0.04)'
  const textColor = style === 'outlined' ? primary : '#FFFFFF'
  const border = separator === 'border' ? `2px solid ${accent}` : '0'
  const boxShadow = separator === 'shadow' ? `0 12px 32px rgba(0,0,0,0.45)` : 'none'
  return (
    <div
      style={{
        background: bg,
        border,
        borderRadius: 14,
        boxShadow,
        padding: '20px 28px',
        minWidth: 240,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
      }}
    >
      <div
        style={{
          color: textColor,
          fontFamily: FONT_MONO,
          fontWeight: 700,
          fontSize: 88,
          lineHeight: 1.02,
          letterSpacing: '0.01em',
        }}
      >
        {value || '—'}
      </div>
      <div
        style={{
          color: style === 'outlined' ? TEXT_MEDIUM : 'rgba(255,255,255,0.78)',
          fontFamily: FONT_SANS,
          fontSize: 24,
          marginTop: 6,
        }}
      >
        {label || '—'}
      </div>
    </div>
  )
}

function CoverSplitCard({ brand, brief, elements }: SegmentProps) {
  const { fps } = useVideoConfig()
  const frame = useCurrentFrame()
  const fontPreset =
    (elements.fontPreset as DemoBrandState['fontPreset']) ?? brand.fontPreset ?? 'comfortable'
  const splitRatio = (elements.splitRatio as SplitRatio) ?? '40-60'
  const cardStyle = (elements.cardStyle as CardStyle) ?? 'outlined'
  const cardSeparator = (elements.cardSeparator as CardSeparator) ?? 'border'
  const metricsCount = Math.max(1, Math.min(3, (elements.metricsCount as number) ?? 3))
  const accentMode = (elements.accentMode as AccentMode) ?? 'duo'
  const primary = brand.colors.primary
  const secondary = brand.colors.secondary ?? primary
  const accent = accentMode === 'duo' ? secondary : primary
  const scaleFactor = FONT_SCALE[fontPreset]

  const today = new Date()
  const dateLabel = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}`

  const titleLines = (brief.cover.title || '').split('\n')
  const metrics = brief.cover.metrics
    .filter((m) => m.value || m.label)
    .slice(0, metricsCount)

  return (
    <AbsoluteFill style={{ background: '#0b0b10' }}>
      <AbsoluteFill
        style={{
          display: 'grid',
          gridTemplateColumns: splitCols(splitRatio),
          padding: '64px 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 24,
            padding: '0 56px',
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 120 * scaleFactor,
              fontWeight: 800,
              lineHeight: 0.95,
              color: TEXT_HIGH,
              letterSpacing: '-0.01em',
            }}
          >
            {titleLines[0] || brief.cover.title || ' '}
            {titleLines[1] && (
              <>
                <br />
                <span style={{ color: primary }}>{titleLines[1]}</span>
              </>
            )}
          </div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 28,
              color: TEXT_MEDIUM,
              letterSpacing: '0.04em',
            }}
          >
            ▌ {brand.name}
          </div>
          {brief.cover.tag && (
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 24,
                color: TEXT_LOW,
                letterSpacing: '0.08em',
              }}
            >
              {brief.cover.tag} · {dateLabel}
            </div>
          )}
          {brand.logo.text && (
            <div
              style={{
                marginTop: 24,
                fontFamily: FONT_MONO,
                fontSize: 30,
                color: primary,
              }}
            >
              ◯ {brand.logo.text}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: cardSeparator === 'gap' ? 32 : 16,
            padding: '0 56px',
          }}
        >
          {metrics.length === 0 ? (
            <div
              style={{
                color: TEXT_LOW,
                fontFamily: FONT_MONO,
                fontSize: 22,
                textAlign: 'center',
              }}
            >
              metrics 为空 — 加几个数据点试试
            </div>
          ) : (
            metrics.map((m, i) => (
              <MetricCard
                key={i}
                value={m.value}
                label={m.label}
                style={cardStyle}
                separator={cardSeparator}
                primary={primary}
                accent={accent}
                index={i}
                fps={fps}
                frame={frame}
              />
            ))
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

export const coverSplitCardEntry: ComponentEntry = {
  metadata: {
    id: 'cover/split-card',
    name: 'Split 左右分屏卡片',
    description:
      'Left half brand identity + right half metric card stack. Balanced information for tech / B2B / product covers.',
    tags: ['split', 'card', 'medium-density', 'balanced'],
    aesthetic: { density: 'medium', motion: 'subtle', palette: 'duo' },
    brandConstraints: {
      requires: ['colors', 'name'],
      optional: ['logo', 'defaultTag'],
    },
    elementsDefaults: {
      fontPreset: 'comfortable',
      splitRatio: '40-60',
      cardStyle: 'outlined',
      cardSeparator: 'border',
      metricsCount: 3,
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
        key: 'splitRatio',
        label: '分屏比例',
        kind: 'enum',
        enumValues: ['left-heavy', '40-60', '50-50', 'right-heavy'],
      },
      {
        key: 'cardStyle',
        label: '卡片风格',
        kind: 'enum',
        enumValues: ['outlined', 'filled', 'gradient'],
      },
      {
        key: 'cardSeparator',
        label: '卡片分隔',
        kind: 'enum',
        enumValues: ['border', 'shadow', 'gap'],
      },
      { key: 'metricsCount', label: 'Metric 数量', kind: 'number', min: 1, max: 3 },
      { key: 'accentMode', label: '配色模式', kind: 'enum', enumValues: ['mono', 'duo'] },
    ],
  },
  Component: CoverSplitCard,
}
