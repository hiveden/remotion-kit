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

// L0 = browse layout (sidebar + stage only). L1 = expanded layout, the right
// side panel reveals param sections + chat dock. Set by the TopBar toggle.
export type DemoLayout = 'L0' | 'L1'

// One param section per `<details>` block in the right-side panel.
export type ParamScope = 'brand' | 'cover' | 'body' | 'cta'

// Agent chat dock state machine (one prompt per submit; no multi-turn history).
export type AgentDockState = 'idle' | 'submitting' | 'streaming' | 'done' | 'error'

export type LlmErrorCategory = 'AUTH' | 'QUOTA' | 'SYSTEM' | 'VALIDATION'
