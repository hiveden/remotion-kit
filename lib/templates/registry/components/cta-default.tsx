// lib/templates/registry/components/cta-default.tsx
//
// cta/logo-fade-default — 1:1 lift of the v0.2 fix CtaSegment.

import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { ThreePartLayout } from '@/lib/templates/shared/three-part-layout'
import {
  FONT_SANS,
  FONT_MONO,
  TEXT_HIGH,
  TEXT_LOW,
} from '@/lib/templates/brief/tokens'
import type { DemoBrandState, LogoPlacement } from '@/lib/demo/types'
import type { ComponentEntry, SegmentProps } from '../types'

function Logo({ brand, placement }: { brand: DemoBrandState; placement: LogoPlacement }) {
  const justify =
    placement === 'left' ? 'flex-start' : placement === 'right' ? 'flex-end' : 'center'
  return (
    <AbsoluteFill
      style={{
        position: 'relative',
        height: 'auto',
        display: 'flex',
        justifyContent: justify,
        alignItems: 'center',
        padding: '24px 80px',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: brand.colors.primary,
        }}
      />
      <span
        style={{
          color: TEXT_HIGH,
          fontFamily: FONT_SANS,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}
      >
        {brand.logo.type === 'text' ? brand.logo.text ?? brand.name : brand.name}
      </span>
    </AbsoluteFill>
  )
}

function CtaLogoFadeDefault({ brand, brief }: SegmentProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const fadeIn = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <ThreePartLayout
      backgroundColor="#09090b"
      disableNoise
      header={
        <div
          style={{
            paddingBottom: 40,
            textAlign: 'center',
            color: TEXT_LOW,
            fontFamily: FONT_MONO,
            fontSize: 32,
            letterSpacing: '0.1em',
          }}
        >
          {brand.defaultTag ?? 'DEMO'} · {(brand.name || '').toUpperCase()}
        </div>
      }
      footer={<Logo brand={brand} placement={brief.cta.logoPlacement} />}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 60px',
          opacity: fadeIn,
        }}
      >
        <div
          style={{
            color: TEXT_HIGH,
            fontFamily: FONT_SANS,
            fontSize: 60,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.3,
            letterSpacing: '0.04em',
          }}
        >
          {brief.cta.text || ' '}
        </div>
      </div>
    </ThreePartLayout>
  )
}

export const ctaDefaultEntry: ComponentEntry = {
  metadata: {
    id: 'cta/logo-fade-default',
    name: 'Logo Fade 默认',
    description:
      'Three-part CTA with brand mark + tagline header, fade-in main text, and aligned brand logo footer. v0.2 fix baseline.',
    tags: ['default', 'three-part', 'brand-led'],
    aesthetic: { density: 'medium', motion: 'subtle', palette: 'duo' },
    brandConstraints: {
      requires: ['colors', 'name'],
      optional: ['logo', 'defaultTag'],
    },
    elementsDefaults: {
      logoPlacement: 'center',
      headerStyle: 'brand-mono',
    },
    elementsSchema: [
      {
        key: 'logoPlacement',
        label: 'Logo 位置',
        kind: 'enum',
        enumValues: ['left', 'center', 'right'],
      },
      {
        key: 'headerStyle',
        label: 'Header 样式',
        kind: 'enum',
        enumValues: ['brand-mono', 'minimal', 'glow'],
      },
    ],
  },
  Component: CtaLogoFadeDefault,
}
