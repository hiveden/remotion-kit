// lib/templates/brief/types.ts
//
// Brief template data schema. Pure types, no implementation.
//
// Migrated from astral-video's legacy schema (purity-allow: see comment) with
// business concepts purified out: the renamed types here are BriefMeta and
// BriefSegment.

import type React from 'react'

export interface SubtitleWord {
  text: string
  start: number // seconds, relative to the current segment
  end: number
}

export interface SubtitleLine {
  id: string
  text: string
  start: number
  end: number
  words?: SubtitleWord[]
}

// Cover metadata describes the title-card frame at the top of a clip.
export interface BriefCover {
  title: string
  subtitle?: string
  tag?: string
  metrics?: Array<{
    value: string
    label: string
    color?: string
  }>
  // Optional accent color for a fingerprint tint (e.g. blue accent on a
  // mostly-purple template). Eventually this should live on brand config; kept
  // here for v0.1 simplicity. (purity-allow: design note)
  secondaryAccent?: string
  // Optional anchor string for variant fingerprints (e.g. a Python REPL line
  // like `>>> formula`). (purity-allow: design note)
  formula?: string
}

// Top-level metadata that drives the header bar + cover frame.
export interface BriefMeta {
  // Brand label shown in the top-left of every header (e.g. "工具人研究所").
  brandLabel: string
  // Date / issue label, e.g. "2026.05".
  dateLabel: string
  // Core topic shown in the top-right of body / cta headers.
  topic: string
  // Cover frame metadata.
  cover: BriefCover
}

// Roles supported by a single brief segment. Renamed from astral-video's
// `'hook' | 'content' | 'cta'` — `body` replaces `content` to avoid the React
// children word.
export type BriefSegmentRole = 'hook' | 'body' | 'cta'

export interface BriefSegment {
  id: string
  role: BriefSegmentRole
  topic: string
  durationFrames: number
  subtitles: SubtitleLine[]
  // Optional local audio file path (relative to project public/). Not a
  // cross-repo identifier — v0.1 templates assume audio lives next to the
  // brief if it exists.
  audioSrc?: string
}

// Background image for a single header / footer region.
export interface SegmentRegionBackground {
  src: string
  opacity?: number
  overlay?: string
  position?: string
  // 'kenBurns' = subtle 8s scale + 16s drift loop.
  animate?: 'kenBurns' | false
}

export interface SegmentBackgrounds {
  portraitHeader?: SegmentRegionBackground
  portraitFooter?: SegmentRegionBackground
  // Full-canvas background for landscape (under the content layer).
  landscape?: SegmentRegionBackground
}

// Render-prop children API for SegmentWrapper. Receives the resolved content
// box + a fitted-font helper, so visuals can size themselves to the canvas.
export type SegmentChildren =
  | ((props: { box: ContentBox; fitted: ComputeFittedFontSize; fps: number }) => React.ReactNode)
  | React.ReactNode

// ContentBox describes the safe area for body visuals after the template has
// laid out header + footer.
export interface ContentBox {
  width: number
  height: number
  safeTop: number
  safeHeight: number
}

// Pure compute function for fitted font size (no hook). Visuals use this when
// rendering inside a render-prop child.
export type ComputeFittedFontSize = (input: {
  text: string
  withinWidth: number
  maxFontSize: number
  minFontSize: number
  fontFamily?: string
  fontWeight?: string | number
  letterSpacing?: string
}) => number
