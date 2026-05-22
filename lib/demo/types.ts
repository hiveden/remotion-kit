// lib/demo/types.ts
//
// Demo-only UI state. Not persisted. Mirrors the Designer spec §6 schema.

import type { Brand } from '@/lib/editor/brand-mock'

export type FontPreset = 'compact' | 'comfortable' | 'spacious'
export type SubtitleStyleId = 'classic' | 'bold' | 'lecture'
export type LogoPlacement = 'left' | 'center' | 'right'

export interface DemoBrandState extends Brand {
  fontPreset: FontPreset
}

export interface DemoCoverMetric {
  value: string
  label: string
}

export interface DemoBrief {
  cover: {
    title: string
    subtitle: string
    tag: string
    metrics: DemoCoverMetric[]
  }
  body: {
    title: string
    subtitleStyle: SubtitleStyleId
  }
  cta: {
    text: string
    logoPlacement: LogoPlacement
  }
}

export type ContentTab = 'cover' | 'body' | 'cta'
