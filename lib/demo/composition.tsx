// lib/demo/composition.tsx
//
// Demo Composition driven entirely by `inputProps` so the @remotion/player can
// re-render on every panel state change. Three sequences (cover / body / cta)
// reuse the `<ThreePartLayout>` skeleton from the brief template, but the
// internals are intentionally simplified for v0.1 — no karaoke, no kenBurns,
// no LLM-driven layouts.

import React from 'react'
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { ThreePartLayout } from '@/lib/templates/shared/three-part-layout'
import { CoverFrame } from '@/lib/templates/shared/cover-frame'
import { FONT_SANS, FONT_MONO, TEXT_HIGH, TEXT_LOW } from '@/lib/templates/brief/tokens'
import type { DemoBrandState, DemoBrief, SubtitleStyleId, LogoPlacement } from './types'
import { DEMO_FRAMES } from './defaults'

interface CompositionProps {
  brand: DemoBrandState
  brief: DemoBrief
}

export default function DemoComposition({ brand, brief }: CompositionProps) {
  return (
    <>
      <Sequence durationInFrames={DEMO_FRAMES.cover}>
        <CoverSegment brand={brand} brief={brief} />
      </Sequence>
      <Sequence from={DEMO_FRAMES.cover} durationInFrames={DEMO_FRAMES.body}>
        <BodySegment brand={brand} brief={brief} />
      </Sequence>
      <Sequence
        from={DEMO_FRAMES.cover + DEMO_FRAMES.body}
        durationInFrames={DEMO_FRAMES.cta}
      >
        <CtaSegment brand={brand} brief={brief} />
      </Sequence>
    </>
  )
}

function CoverSegment({ brand, brief }: CompositionProps) {
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

function BodySegment({ brand, brief }: CompositionProps) {
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
      footer={<SubtitleLine brand={brand} text={brief.body.title} style={brief.body.subtitleStyle} fps={fps} frame={frame} />}
    >
      <BodyVisual brand={brand} brief={brief} fontScale={fontScale} />
    </ThreePartLayout>
  )
}

function CtaSegment({ brand, brief }: CompositionProps) {
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
      footer={
        <Logo brand={brand} placement={brief.cta.logoPlacement} />
      }
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
  // Subtle fade so the footer feels alive without karaoke complexity.
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
          textTransform: isBold ? 'none' : 'none',
          lineHeight: 1.3,
        }}
      >
        {text || ' '}
      </div>
    </div>
  )
}

function Logo({ brand, placement }: { brand: DemoBrandState; placement: LogoPlacement }) {
  const justify = placement === 'left' ? 'flex-start' : placement === 'right' ? 'flex-end' : 'center'
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

function fontScaleFor(preset: DemoBrandState['fontPreset']): number {
  if (preset === 'comfortable') return 1.05
  if (preset === 'spacious') return 1.12
  return 1
}
