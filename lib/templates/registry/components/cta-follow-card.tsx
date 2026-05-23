// lib/templates/registry/components/cta-follow-card.tsx
//
// cta/follow-card — card-style CTA with social-media chips (follow / comment /
// share) animated for engagement. Aimed at short-form creators wrapping up.

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

type ChipStyle = 'filled' | 'outlined' | 'glass'
type ChipLayout = 'horizontal' | 'vertical' | 'grid'
type ChipAnimation = 'fade-in' | 'scale-in' | 'slide-up' | 'stagger'
type AccentMode = 'mono' | 'duo'

interface ChipProps {
  icon: string
  label: string
  style: ChipStyle
  primary: string
  secondary: string
  index: number
  animation: ChipAnimation
  fps: number
  frame: number
}

function SocialChip({ icon, label, style, primary, secondary, index, animation, fps, frame }: ChipProps) {
  const delay = animation === 'stagger' ? index * 6 : 0
  const kind = animation === 'stagger' ? 'slide-up' : animation
  const t = Math.max(0, frame - delay)
  const fade = interpolate(t, [0, fps * 0.35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const slide = kind === 'slide-up'
    ? interpolate(t, [0, fps * 0.45], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0
  const scale = kind === 'scale-in'
    ? spring({ frame: t, fps, from: 0.85, to: 1, config: { damping: 14, stiffness: 110 } })
    : 1
  const bg =
    style === 'filled'
      ? primary
      : style === 'glass'
        ? 'rgba(255,255,255,0.12)'
        : 'transparent'
  const border = style === 'outlined' ? `3px solid ${primary}` : style === 'glass' ? '1px solid rgba(255,255,255,0.32)' : 'none'
  const color = style === 'filled' ? '#fff' : style === 'glass' ? TEXT_HIGH : primary
  return (
    <div
      style={{
        background: bg,
        border,
        borderRadius: 24,
        padding: '24px 32px',
        minWidth: 180,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        boxShadow: style === 'filled' ? `0 18px 40px ${primary}59` : '0 8px 24px rgba(0,0,0,0.35)',
        opacity: fade,
        transform: `translateY(${slide}px) scale(${scale})`,
      }}
    >
      <div style={{ fontSize: 64, color, lineHeight: 1 }}>{icon}</div>
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 28,
          color,
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 32,
          height: 3,
          borderRadius: 999,
          background: style === 'filled' ? 'rgba(255,255,255,0.6)' : secondary,
        }}
      />
    </div>
  )
}

const FONT_SCALE: Record<DemoBrandState['fontPreset'], number> = {
  compact: 0.92,
  comfortable: 1,
  spacious: 1.08,
}

const SOCIAL_CHIPS: ReadonlyArray<{ icon: string; label: string }> = [
  { icon: '♡', label: '关注' },
  { icon: '💬', label: '评论' },
  { icon: '↗', label: '分享' },
]

function CtaFollowCard({ brand, brief, elements }: SegmentProps) {
  const { fps } = useVideoConfig()
  const frame = useCurrentFrame()
  const fontPreset =
    (elements.fontPreset as DemoBrandState['fontPreset']) ?? brand.fontPreset ?? 'comfortable'
  const chipStyle = (elements.chipStyle as ChipStyle) ?? 'filled'
  const chipLayout = (elements.chipLayout as ChipLayout) ?? 'horizontal'
  const animation = (elements.animation as ChipAnimation) ?? 'slide-up'
  const showWatermark = (elements.showWatermark as boolean | undefined) ?? true
  const accentMode = (elements.accentMode as AccentMode) ?? 'duo'

  const primary = brand.colors.primary
  const secondary = accentMode === 'duo' ? brand.colors.secondary ?? primary : primary
  const scaleFactor = FONT_SCALE[fontPreset]
  const handle = (brand.logo.text || brand.name).toLowerCase().replace(/\s+/g, '')

  const layoutStyle: React.CSSProperties =
    chipLayout === 'horizontal'
      ? { display: 'flex', flexDirection: 'row', gap: 24 }
      : chipLayout === 'vertical'
        ? { display: 'flex', flexDirection: 'column', gap: 16 }
        : { display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: 16 }

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #0b0b10 0%, ${primary}26 100%)`, color: TEXT_HIGH }}>
      <AbsoluteFill
        style={{
          padding: '120px 80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 56,
        }}
      >
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 76 * scaleFactor,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            maxWidth: 920,
          }}
        >
          {brief.cta.text || '下期不见不散'}
        </div>

        <div style={layoutStyle}>
          {SOCIAL_CHIPS.map((c, i) => (
            <SocialChip
              key={c.icon}
              icon={c.icon}
              label={c.label}
              style={chipStyle}
              primary={primary}
              secondary={secondary}
              index={i}
              animation={animation}
              fps={fps}
              frame={frame}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: 24,
            fontFamily: FONT_MONO,
            fontSize: 30,
            color: TEXT_MEDIUM,
            letterSpacing: '0.06em',
          }}
        >
          {brand.name} · @{handle}
        </div>
      </AbsoluteFill>
      {showWatermark && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            right: 60,
            fontFamily: FONT_MONO,
            fontSize: 20,
            color: TEXT_LOW,
            letterSpacing: '0.06em',
            opacity: 0.7,
          }}
        >
          ▌ remotion-kit
        </div>
      )}
    </AbsoluteFill>
  )
}

export const ctaFollowCardEntry: ComponentEntry = {
  metadata: {
    id: 'cta/follow-card',
    name: 'Follow Card 三连卡片',
    description:
      'Card-style CTA with social media chips (follow / comment / share). Animated for engagement-driving wrap-ups.',
    tags: ['follow', 'social', 'card', 'medium-density', 'expressive'],
    aesthetic: { density: 'medium', motion: 'expressive', palette: 'duo' },
    brandConstraints: {
      requires: ['colors', 'name'],
      optional: ['logo'],
    },
    elementsDefaults: {
      fontPreset: 'comfortable',
      chipStyle: 'filled',
      chipLayout: 'horizontal',
      animation: 'slide-up',
      showWatermark: true,
      accentMode: 'duo',
    },
    elementsSchema: [
      {
        key: 'fontPreset',
        label: '字体粒度',
        kind: 'font-preset',
        enumValues: ['compact', 'comfortable'],
      },
      {
        key: 'chipStyle',
        label: 'Chip 风格',
        kind: 'enum',
        enumValues: ['filled', 'outlined', 'glass'],
      },
      {
        key: 'chipLayout',
        label: 'Chip 排列',
        kind: 'enum',
        enumValues: ['horizontal', 'vertical', 'grid'],
      },
      {
        key: 'animation',
        label: '入场动效',
        kind: 'enum',
        enumValues: ['fade-in', 'scale-in', 'slide-up', 'stagger'],
      },
      { key: 'showWatermark', label: '角标 watermark', kind: 'boolean' },
      { key: 'accentMode', label: '配色模式', kind: 'enum', enumValues: ['mono', 'duo'] },
    ],
  },
  Component: CtaFollowCard,
}
