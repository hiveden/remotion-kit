// packages/video-gui/lib/editor/caption-presets.ts
//
// Caption style preset registry — 把 brief.captionStyle 的 string id 映射到
// 实际可渲染的 token 集（font / color / stroke / background / position / animation）。
// clip-bootstrap.ts placeholder 用真实 preset 渲染示例字幕；
// cc 写代码时可 import 准确还原 platform 字幕风格。
//
// 3 presets 与 brief schema enum 1:1 对齐：subtle / bold / kinetic
//
// SSOT: docs/refactor-plan/2026-05-19-platforms/DESIGN.md §3
// 调研: docs/refactor-plan/2026-05-19-platforms/SUMMARY.md §"Caption Style 现状"

import type { CaptionStyle } from './clip-instance'

export interface CaptionPreset {
  id: CaptionStyle
  displayName: string
  description: string

  // 字体
  fontFamily: string
  /** 字号 (px @ 基准 1080×1920) */
  fontSize: number
  fontWeight: 400 | 500 | 600 | 700 | 800
  letterSpacing: number

  // 颜色
  color: string
  strokeColor: string | null
  strokeWidth: number
  textShadow: string | null

  // 背景
  background: string | null
  paddingX: number
  paddingY: number
  borderRadius: number

  // 位置（基准 1080×1920，px）
  position: 'bottom' | 'center' | 'top'
  safeAreaBottom: number

  // 动效
  animation: 'none' | 'fade-in' | 'word-pop'
  /** 入场动画总帧数（@ 30fps）；none animation = 0 */
  animationDurationFrames: number
}

// ─── 3 presets ───────────────────────────────────────────────────

const SUBTLE: CaptionPreset = {
  id: 'subtle',
  displayName: '静雅 · subtle',
  description:
    'YouTube 长视频 / Bilibili / 通用 web 风格。半透明背景条，中字号，无动效。',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  fontSize: 36,
  fontWeight: 500,
  letterSpacing: 0.5,
  color: '#ffffff',
  strokeColor: null,
  strokeWidth: 0,
  textShadow: '0 2px 6px rgba(0,0,0,0.7)',
  background: 'rgba(0,0,0,0.55)',
  paddingX: 18,
  paddingY: 8,
  borderRadius: 4,
  position: 'bottom',
  safeAreaBottom: 192,
  animation: 'none',
  animationDurationFrames: 0,
}

const BOLD: CaptionPreset = {
  id: 'bold',
  displayName: '粗体 · bold',
  description:
    'YouTube Shorts / 小红书 / 静态短视频风格。大字号 + 粗描边，无背景，视觉冲击。',
  fontFamily: '"Bebas Neue", Impact, "Inter", "PingFang SC", sans-serif',
  fontSize: 64,
  fontWeight: 800,
  letterSpacing: 4,
  color: '#ffffff',
  strokeColor: '#000000',
  strokeWidth: 4,
  textShadow: '0 3px 14px rgba(0,0,0,0.6)',
  background: null,
  paddingX: 0,
  paddingY: 0,
  borderRadius: 0,
  position: 'bottom',
  safeAreaBottom: 240,
  animation: 'fade-in',
  animationDurationFrames: 12,
}

const KINETIC: CaptionPreset = {
  id: 'kinetic',
  displayName: '动感 · kinetic',
  description:
    '抖音 / TikTok 卡点字幕风格。大字号 + 描边 + 字字弹出动效。MVP 占位渲染整词淡入，cc 接管后可实现真"逐字弹"。',
  fontFamily: '"Inter", "PingFang SC", "Helvetica Neue", sans-serif',
  fontSize: 56,
  fontWeight: 700,
  letterSpacing: 2,
  color: '#ffffff',
  strokeColor: '#000000',
  strokeWidth: 3,
  textShadow: '0 0 18px rgba(0,0,0,0.85), 0 4px 10px rgba(0,0,0,0.5)',
  background: null,
  paddingX: 0,
  paddingY: 0,
  borderRadius: 0,
  position: 'bottom',
  safeAreaBottom: 200,
  animation: 'word-pop',
  animationDurationFrames: 20,
}

// ─── Registry ────────────────────────────────────────────────────

export const CAPTION_PRESETS: Record<CaptionStyle, CaptionPreset> = {
  subtle: SUBTLE,
  bold: BOLD,
  kinetic: KINETIC,
}

export const CAPTION_PRESET_LIST: CaptionPreset[] = [SUBTLE, BOLD, KINETIC]

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * 查 caption preset。id 始终在 CaptionStyle union 内（brief validator 已过）。
 */
export function getCaptionPreset(id: CaptionStyle): CaptionPreset {
  return CAPTION_PRESETS[id]
}
