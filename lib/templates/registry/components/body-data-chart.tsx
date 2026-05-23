// lib/templates/registry/components/body-data-chart.tsx
//
// body/data-chart — single dominant numeric value + supporting label +
// decorative chart-shape SVG. Aimed at data briefs / benchmark recaps.

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

type ChartStyle = 'bar' | 'line' | 'donut' | 'dots'
type NumericEmphasis = 'subtle' | 'medium' | 'strong'
type LabelPosition = 'above' | 'below' | 'inline'
type AccentMode = 'mono' | 'duo'

interface ChartProps {
  style: ChartStyle
  primary: string
  secondary: string
  width: number
  height: number
}

function ChartDecoration({ style, primary, secondary, width, height }: ChartProps) {
  if (style === 'bar') {
    const bars = [0.6, 0.85, 0.4, 0.95, 0.55, 0.75, 0.35]
    const barWidth = width / bars.length
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {bars.map((h, i) => (
          <rect
            key={i}
            x={i * barWidth + barWidth * 0.12}
            y={height - h * height}
            width={barWidth * 0.76}
            height={h * height}
            rx={6}
            fill={i % 2 === 0 ? primary : secondary}
            opacity={0.85}
          />
        ))}
      </svg>
    )
  }
  if (style === 'line') {
    const points = [0.2, 0.45, 0.35, 0.7, 0.55, 0.85, 0.6, 0.95]
    const step = width / (points.length - 1)
    const path = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${i * step},${height - p * height}`)
      .join(' ')
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={path} fill="none" stroke={primary} strokeWidth={6} strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={i * step} cy={height - p * height} r={10} fill={secondary} />
        ))}
      </svg>
    )
  }
  if (style === 'donut') {
    const cx = width / 2
    const cy = height / 2
    const r = Math.min(width, height) / 2 - 12
    const circ = 2 * Math.PI * r
    const stroke = 36
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={primary}
          strokeWidth={stroke}
          strokeDasharray={`${circ * 0.7} ${circ}`}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={secondary}
          strokeWidth={stroke}
          strokeDasharray={`${circ * 0.18} ${circ}`}
          strokeDashoffset={-circ * 0.7}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
    )
  }
  // dots
  const cols = 12
  const rows = 4
  const cellW = width / cols
  const cellH = height / rows
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {Array.from({ length: cols * rows }).map((_, i) => {
        const cx = (i % cols) * cellW + cellW / 2
        const cy = Math.floor(i / cols) * cellH + cellH / 2
        const filled = ((i * 13) % 7) > 2
        return <circle key={i} cx={cx} cy={cy} r={10} fill={filled ? primary : secondary} opacity={filled ? 0.9 : 0.45} />
      })}
    </svg>
  )
}

const FONT_SCALE: Record<DemoBrandState['fontPreset'], number> = {
  compact: 0.94,
  comfortable: 1,
  spacious: 1.08,
}

function BodyDataChart({ brand, brief, elements }: SegmentProps) {
  const { fps } = useVideoConfig()
  const frame = useCurrentFrame()
  const fontPreset =
    (elements.fontPreset as DemoBrandState['fontPreset']) ?? brand.fontPreset ?? 'spacious'
  const chartStyle = (elements.chartStyle as ChartStyle) ?? 'bar'
  const numericEmphasis = (elements.numericEmphasis as NumericEmphasis) ?? 'strong'
  const labelPosition = (elements.labelPosition as LabelPosition) ?? 'below'
  const accentMode = (elements.accentMode as AccentMode) ?? 'duo'

  const primary = brand.colors.primary
  const secondary = accentMode === 'duo' ? brand.colors.secondary ?? primary : primary

  const metric = brief.cover.metrics.find((m) => m.value) ?? { value: '85%', label: '完成率' }
  const numericValue = metric.value
  const numericLabel = metric.label
  const scaleFactor = FONT_SCALE[fontPreset]
  const numericSize = (numericEmphasis === 'strong' ? 320 : numericEmphasis === 'medium' ? 240 : 180) * scaleFactor
  const numericWeight = numericEmphasis === 'strong' ? 800 : numericEmphasis === 'medium' ? 700 : 500
  const enter = spring({ frame, fps, from: 0.85, to: 1, config: { damping: 14, stiffness: 110 } })
  const fadeIn = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ background: '#09090b', color: TEXT_HIGH }}>
      <AbsoluteFill style={{ padding: '120px 80px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 56,
            fontWeight: 500,
            color: TEXT_MEDIUM,
            opacity: fadeIn,
            letterSpacing: '0.02em',
          }}
        >
          {brief.body.title || ' '}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            flex: 1,
          }}
        >
          {labelPosition === 'above' && numericLabel && (
            <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: TEXT_MEDIUM }}>
              {numericLabel}
            </div>
          )}
          {labelPosition === 'inline' && numericLabel ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: numericSize,
                  fontWeight: numericWeight,
                  color: primary,
                  lineHeight: 0.9,
                  letterSpacing: '0.01em',
                  transform: `scale(${enter})`,
                  transformOrigin: 'center',
                }}
              >
                {numericValue}
              </span>
              <span style={{ fontFamily: FONT_SANS, fontSize: 40, color: TEXT_MEDIUM }}>
                {numericLabel}
              </span>
            </div>
          ) : (
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: numericSize,
                fontWeight: numericWeight,
                color: primary,
                lineHeight: 0.9,
                letterSpacing: '0.01em',
                transform: `scale(${enter})`,
                transformOrigin: 'center',
              }}
            >
              {numericValue}
            </div>
          )}
          {labelPosition === 'below' && numericLabel && (
            <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: TEXT_MEDIUM }}>
              {numericLabel}
            </div>
          )}
        </div>

        <div style={{ opacity: fadeIn }}>
          <ChartDecoration style={chartStyle} primary={primary} secondary={secondary} width={920} height={240} />
        </div>

        <div
          style={{
            color: TEXT_LOW,
            fontFamily: FONT_MONO,
            fontSize: 22,
            letterSpacing: '0.05em',
          }}
        >
          ▌ {brand.name}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

export const bodyDataChartEntry: ComponentEntry = {
  metadata: {
    id: 'body/data-chart',
    name: 'Data + Chart 数据图表',
    description:
      'Body with prominent numeric value + supporting label + decorative chart-like SVG. For data briefs.',
    tags: ['data', 'chart', 'high-density', 'numeric'],
    aesthetic: { density: 'high', motion: 'subtle', palette: 'duo' },
    brandConstraints: {
      requires: ['colors'],
      optional: ['name'],
    },
    elementsDefaults: {
      fontPreset: 'spacious',
      chartStyle: 'bar',
      numericEmphasis: 'strong',
      labelPosition: 'below',
      subtitleStyle: 'lecture',
      accentMode: 'duo',
    },
    elementsSchema: [
      {
        key: 'fontPreset',
        label: '字体粒度',
        kind: 'font-preset',
        enumValues: ['comfortable', 'spacious'],
      },
      {
        key: 'chartStyle',
        label: '图表风格',
        kind: 'enum',
        enumValues: ['bar', 'line', 'donut', 'dots'],
      },
      {
        key: 'numericEmphasis',
        label: '数字强调',
        kind: 'enum',
        enumValues: ['subtle', 'medium', 'strong'],
      },
      {
        key: 'labelPosition',
        label: 'Label 位置',
        kind: 'enum',
        enumValues: ['above', 'below', 'inline'],
      },
      {
        key: 'subtitleStyle',
        label: '字幕样式',
        kind: 'enum',
        enumValues: ['classic', 'bold', 'lecture'],
      },
      { key: 'accentMode', label: '配色模式', kind: 'enum', enumValues: ['mono', 'duo'] },
    ],
  },
  Component: BodyDataChart,
}
