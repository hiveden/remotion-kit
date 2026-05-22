// lib/templates/registry/components/cover-gradient-hero.tsx
//
// cover/gradient-hero — full-screen attention-grab hero with oversized title,
// brand gradient backdrop, and a centered scale-in animation. Compared to the
// metallic default this variant favours expressiveness and low information
// density, ideal as a campaign opener.

import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { FONT_SANS, FONT_MONO, TEXT_HIGH } from '@/lib/templates/brief/tokens'
import type { DemoBrandState } from '@/lib/demo/types'
import type { ComponentEntry, SegmentProps } from '../types'

const FONT_SCALE: Record<DemoBrandState['fontPreset'], number> = {
  compact: 0.95,
  comfortable: 1,
  spacious: 1.08,
}

function CoverGradientHero({ brand, brief, elements }: SegmentProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const fontPreset =
    (elements.fontPreset as DemoBrandState['fontPreset']) ?? brand.fontPreset ?? 'spacious'
  const showMetadata = (elements.showMetadata as boolean | undefined) ?? false
  const showLogo = (elements.showLogo as boolean | undefined) ?? true
  const gradientAngle = (elements.gradientAngle as number | undefined) ?? 135
  const animation = (elements.titleAnimation as 'scale-in' | 'fade-in' | 'slide-up' | undefined) ?? 'scale-in'

  const scale = animation === 'scale-in'
    ? spring({ frame, fps, from: 0.85, to: 1, config: { damping: 14, stiffness: 110 } })
    : 1
  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const translateY = animation === 'slide-up'
    ? interpolate(frame, [0, fps * 0.6], [40, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0

  const primary = brand.colors.primary
  const secondary = brand.colors.secondary ?? primary
  const scaleFactor = FONT_SCALE[fontPreset]

  const today = new Date()
  const dateLabel = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}`

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, ${primary} 0%, ${secondary} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.35) 70%)',
        }}
      />
      <AbsoluteFill
        style={{
          padding: '120px 80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {showMetadata && (
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 28,
              color: 'rgba(255,255,255,0.78)',
              letterSpacing: '0.18em',
              opacity: fadeIn,
            }}
          >
            {(brand.defaultTag ?? 'DEMO').toUpperCase()} · {dateLabel}
          </div>
        )}

        <div
          style={{
            transform: `scale(${scale}) translateY(${translateY}px)`,
            opacity: animation === 'fade-in' ? fadeIn : 1,
            textAlign: 'center',
            color: TEXT_HIGH,
            fontFamily: FONT_SANS,
            fontWeight: 800,
            fontSize: 168 * scaleFactor,
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            textShadow: '0 12px 40px rgba(0,0,0,0.35)',
          }}
        >
          {brief.cover.title || ' '}
        </div>

        {brief.cover.subtitle && (
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 38 * scaleFactor,
              color: 'rgba(255,255,255,0.88)',
              maxWidth: 900,
              textAlign: 'center',
              opacity: fadeIn,
            }}
          >
            {brief.cover.subtitle}
          </div>
        )}

        {showLogo && (
          <div
            style={{
              marginTop: 'auto',
              fontFamily: FONT_MONO,
              fontSize: 32,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '0.12em',
              opacity: fadeIn,
            }}
          >
            {brand.logo.type === 'text' ? brand.logo.text ?? brand.name : brand.name}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

export const coverGradientHeroEntry: ComponentEntry = {
  metadata: {
    id: 'cover/gradient-hero',
    name: 'Gradient 大字 Hero',
    description:
      'Full-screen hero with oversized title centered, brand gradient background, minimal metadata. Maximum attention-grab.',
    tags: ['hero', 'attention', 'low-density', 'expressive'],
    aesthetic: { density: 'low', motion: 'expressive', palette: 'duo' },
    brandConstraints: {
      requires: ['colors'],
      optional: ['name', 'logo'],
      ignores: ['defaultTag'],
    },
    elementsDefaults: {
      fontPreset: 'spacious',
      gradientAngle: 135,
      titleAnimation: 'scale-in',
      showMetadata: false,
      showLogo: true,
      accentMode: 'duo',
    },
    elementsSchema: [
      {
        key: 'fontPreset',
        label: '字体粒度',
        kind: 'font-preset',
        enumValues: ['compact', 'comfortable', 'spacious'],
      },
      { key: 'gradientAngle', label: '渐变角度', kind: 'number', min: 0, max: 360 },
      {
        key: 'titleAnimation',
        label: '标题入场',
        kind: 'enum',
        enumValues: ['fade-in', 'scale-in', 'slide-up'],
      },
      { key: 'showMetadata', label: '展示日期标签', kind: 'boolean' },
      { key: 'showLogo', label: '展示 logo', kind: 'boolean' },
    ],
  },
  Component: CoverGradientHero,
}
