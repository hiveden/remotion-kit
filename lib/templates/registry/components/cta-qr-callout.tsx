// lib/templates/registry/components/cta-qr-callout.tsx
//
// cta/qr-callout — centered QR placeholder + emphatic CTA text + brand handle.
// Drives cross-platform / offline / "scan to follow" use cases.

import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import {
  FONT_SANS,
  FONT_MONO,
  TEXT_HIGH,
  TEXT_LOW,
  TEXT_MEDIUM,
} from '@/lib/templates/brief/tokens'
import type { DemoBrandState } from '@/lib/demo/types'
import type { ComponentEntry, SegmentProps } from '../types'

type QrSize = 'sm' | 'md' | 'lg'
type QrPlacement = 'top' | 'center' | 'bottom'
type AccentMode = 'mono' | 'duo'

function QrPlaceholder({ size, primary }: { size: QrSize; primary: string }) {
  const px = size === 'sm' ? 220 : size === 'md' ? 340 : 460
  // Deterministic checker pattern so the placeholder reads as "QR" without
  // looking like noise.
  const cells = 13
  const filled: boolean[][] = Array.from({ length: cells }, (_row, y) =>
    Array.from({ length: cells }, (_col, x) => {
      // corners + diagonal stripes — feels like a QR finder
      if ((x < 3 && y < 3) || (x < 3 && y >= cells - 3) || (x >= cells - 3 && y < 3)) {
        return !((x === 1 || x === cells - 2) && (y === 1 || y === cells - 2))
      }
      return ((x * 7 + y * 13) % 9) < 5
    }),
  )
  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: 18,
        background: '#fff',
        border: `6px solid ${primary}`,
        padding: 16,
        position: 'relative',
        boxShadow: '0 28px 64px rgba(0,0,0,0.55)',
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${cells} ${cells}`} shapeRendering="crispEdges">
        {filled.flatMap((row, y) =>
          row.map((on, x) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={on ? '#101010' : 'transparent'}
            />
          )),
        )}
      </svg>
    </div>
  )
}

const FONT_SCALE: Record<DemoBrandState['fontPreset'], number> = {
  compact: 0.92,
  comfortable: 1,
  spacious: 1.1,
}

function CtaQrCallout({ brand, brief, elements }: SegmentProps) {
  const { fps } = useVideoConfig()
  const frame = useCurrentFrame()
  const fontPreset =
    (elements.fontPreset as DemoBrandState['fontPreset']) ?? brand.fontPreset ?? 'comfortable'
  const qrSize = (elements.qrSize as QrSize) ?? 'md'
  const qrPlacement = (elements.qrPlacement as QrPlacement) ?? 'center'
  const ctaArrow = (elements.ctaArrow as boolean | undefined) ?? true
  const labelAbove = (elements.labelAbove as boolean | undefined) ?? false
  const accentMode = (elements.accentMode as AccentMode) ?? 'mono'

  const primary = brand.colors.primary
  const secondary = accentMode === 'duo' ? brand.colors.secondary ?? primary : primary
  const scaleFactor = FONT_SCALE[fontPreset]
  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const text = brief.cta.text || '扫码关注，更多内容'
  const handle = brand.logo.text || brand.name

  const justify =
    qrPlacement === 'top' ? 'flex-start' : qrPlacement === 'bottom' ? 'flex-end' : 'center'

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #0b0b10 0%, ${primary}1a 100%)`,
        color: TEXT_HIGH,
      }}
    >
      <AbsoluteFill
        style={{
          padding: '120px 80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: justify,
          gap: 48,
          opacity: fadeIn,
        }}
      >
        {labelAbove && (
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 60 * scaleFactor,
              fontWeight: 600,
              color: TEXT_HIGH,
              textAlign: 'center',
              maxWidth: 900,
              lineHeight: 1.2,
            }}
          >
            {text}
          </div>
        )}
        <QrPlaceholder size={qrSize} primary={primary} />
        {!labelAbove && (
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 60 * scaleFactor,
              fontWeight: 600,
              color: TEXT_HIGH,
              textAlign: 'center',
              maxWidth: 900,
              lineHeight: 1.2,
            }}
          >
            {text}
          </div>
        )}
        {ctaArrow && (
          <div style={{ fontSize: 72, color: secondary, fontFamily: FONT_MONO }}>↓</div>
        )}
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT_MONO,
          fontSize: 32,
          color: TEXT_MEDIUM,
          letterSpacing: '0.08em',
        }}
      >
        @{handle}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT_MONO,
          fontSize: 20,
          color: TEXT_LOW,
          letterSpacing: '0.06em',
        }}
      >
        ▌ remotion-kit
      </div>
    </AbsoluteFill>
  )
}

export const ctaQrCalloutEntry: ComponentEntry = {
  metadata: {
    id: 'cta/qr-callout',
    name: 'QR 二维码 Callout',
    description:
      'Centered QR placeholder + emphatic CTA text + brand label. Drives cross-platform / offline conversion.',
    tags: ['qr', 'callout', 'low-density', 'cross-platform'],
    aesthetic: { density: 'low', motion: 'static', palette: 'mono' },
    brandConstraints: {
      requires: ['colors', 'name'],
      optional: ['logo'],
    },
    elementsDefaults: {
      fontPreset: 'comfortable',
      qrSize: 'md',
      qrPlacement: 'center',
      ctaArrow: true,
      labelAbove: false,
      accentMode: 'mono',
    },
    elementsSchema: [
      {
        key: 'fontPreset',
        label: '字体粒度',
        kind: 'font-preset',
        enumValues: ['compact', 'comfortable', 'spacious'],
      },
      { key: 'qrSize', label: 'QR 大小', kind: 'enum', enumValues: ['sm', 'md', 'lg'] },
      { key: 'qrPlacement', label: 'QR 位置', kind: 'enum', enumValues: ['top', 'center', 'bottom'] },
      { key: 'ctaArrow', label: '显示 CTA 箭头', kind: 'boolean' },
      { key: 'labelAbove', label: 'Label 在 QR 上方', kind: 'boolean' },
      { key: 'accentMode', label: '配色模式', kind: 'enum', enumValues: ['mono', 'duo'] },
    ],
  },
  Component: CtaQrCallout,
}
