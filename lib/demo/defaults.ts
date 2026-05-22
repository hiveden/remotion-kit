// lib/demo/defaults.ts
//
// Default values for the demo. Designer-spec §3.1 — populated on first load
// so the user immediately sees a fully-rendered preview.

import { DEFAULT_BRAND } from '@/lib/editor/brand-mock'
import type { DemoBrief, DemoBrandState } from './types'

export const DEFAULT_DEMO_BRAND: DemoBrandState = {
  ...DEFAULT_BRAND,
  fontPreset: 'compact',
}

export const DEFAULT_DEMO_BRIEF: DemoBrief = {
  cover: {
    title: 'Remotion Kit',
    subtitle: '三段式品牌壳模板',
    tag: 'DEMO',
    metrics: [
      { value: '9:16', label: '抖音竖屏' },
      { value: '14s', label: '默认时长' },
      { value: 'TSX', label: '可编辑代码' },
    ],
  },
  body: {
    title: '内容由代码驱动',
    subtitleStyle: 'lecture',
  },
  cta: {
    text: '克隆仓库 · 改 brief · 立即渲染',
    logoPlacement: 'center',
  },
}

// 30fps; Designer §3.1 + Architect default 14s totals
export const DEMO_FPS = 30
export const DEMO_FRAMES = {
  cover: 120,
  body: 240,
  cta: 90,
} as const
export const DEMO_DURATION_FRAMES = DEMO_FRAMES.cover + DEMO_FRAMES.body + DEMO_FRAMES.cta

export const DEMO_CANVAS = {
  width: 1080,
  height: 2060,
} as const
