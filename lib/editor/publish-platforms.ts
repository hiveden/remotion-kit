// packages/video-gui/lib/editor/publish-platforms.ts
//
// Publish platform registry — 把 brief.publishPlatform 的 string id 映射到
// 真实约束（supportedAspects / maxDurations / captionGuideline / safeZone /
// coverSpec / notes）。cc 和未来 form UI 联动都从这里查。
//
// 5 keys 与 brief schema enum 1:1 对齐：
//   youtube / douyin / bilibili / xiaohongshu / generic
//
// SSOT: docs/refactor-plan/2026-05-19-platforms/DESIGN.md
// 调研: docs/refactor-plan/2026-05-19-platforms/SUMMARY.md

import type {
  AspectRatio,
  PublishPlatform,
  Resolution,
} from './clip-instance'

export interface PublishPlatformEntry {
  id: PublishPlatform
  displayName: string

  // 画面规格
  supportedAspects: AspectRatio[]
  primaryAspect: AspectRatio
  defaultResolution: Resolution

  // 时长（秒）
  maxDurations: {
    short?: number
    long?: number
  }

  // 文件
  maxFileSizeBytes?: number
  fileFormat: 'mp4' | 'mov'
  videoCodec: ('h264' | 'h265')[]

  // 字幕
  captionGuideline: {
    sidecarFormats: string[]
    burnedInRecommended: boolean
    /** Safe zone（基准 1080×1920 帧，px 距离） */
    safeZone: {
      top: number
      bottom: number
      left: number
      right: number
    }
  }

  // 封面
  coverSpec?: {
    width: number
    height: number
    aspectRatio: string
    maxFileSizeBytes?: number
  }

  /** 平台特性 hint，UI / cc 可直接展示 */
  notes?: string
}

// ─── 5 platforms ─────────────────────────────────────────────────

const YOUTUBE: PublishPlatformEntry = {
  id: 'youtube',
  displayName: 'YouTube Shorts (短视频) / 长视频',
  supportedAspects: ['9:16', '16:9'],
  primaryAspect: '9:16',
  defaultResolution: '1080p',
  maxDurations: {
    short: 180,       // 3 min (2024-10-15 由 60s 升级)
    long: 43200,      // 12h
  },
  maxFileSizeBytes: 256 * 1024 * 1024 * 1024, // 256 GB
  fileFormat: 'mp4',
  videoCodec: ['h264', 'h265'],
  captionGuideline: {
    sidecarFormats: ['srt', 'vtt'],
    burnedInRecommended: false,
    safeZone: { top: 180, bottom: 350, left: 60, right: 120 },
  },
  coverSpec: {
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    maxFileSizeBytes: 2 * 1024 * 1024,
  },
  notes: '默认 Shorts 风格（9:16 ≤180s）。长视频形态请使用 generic + 16:9，YouTube 长视频接受 SRT/VTT sidecar + 自动 CC。',
}

const DOUYIN: PublishPlatformEntry = {
  id: 'douyin',
  displayName: '抖音 / TikTok',
  supportedAspects: ['9:16', '1:1', '16:9'],
  primaryAspect: '9:16',
  defaultResolution: '1080p',
  maxDurations: {
    short: 900,       // 15 min (抖音严格值；TikTok Studio 可达 60min)
  },
  maxFileSizeBytes: 4 * 1024 * 1024 * 1024, // ~4 GB
  fileFormat: 'mp4',
  videoCodec: ['h264'],
  captionGuideline: {
    sidecarFormats: [],
    burnedInRecommended: true,
    safeZone: { top: 180, bottom: 300, left: 60, right: 120 },
  },
  coverSpec: {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
  },
  notes: '仅支持字幕烧录（不接受 sidecar）。卡点字幕 / 字字弹出 (kinetic preset) 是抖音流行风格。右侧 120px 区域常被互动按钮（点赞 / 关注 / 评论）占用。',
}

const BILIBILI: PublishPlatformEntry = {
  id: 'bilibili',
  displayName: 'Bilibili',
  supportedAspects: ['16:9', '9:16', '1:1'],
  primaryAspect: '16:9',
  defaultResolution: '1080p',
  maxDurations: {
    long: 7200,       // 2 h
  },
  maxFileSizeBytes: 8 * 1024 * 1024 * 1024, // 8 GB
  fileFormat: 'mp4',
  videoCodec: ['h264', 'h265'],
  captionGuideline: {
    sidecarFormats: ['srt', 'lrc', 'ass'],
    burnedInRecommended: false,
    safeZone: { top: 60, bottom: 100, left: 60, right: 60 },
  },
  coverSpec: {
    width: 1146,
    height: 717,
    aspectRatio: '16:9',
  },
  notes: '弹幕会全屏覆盖视频区域，subtle preset（细字 + 半透明背景条）效果会受影响。可考虑 bold preset 或调大字号。横屏长视频是主流；Story 模式支持 9:16。',
}

const XIAOHONGSHU: PublishPlatformEntry = {
  id: 'xiaohongshu',
  displayName: '小红书',
  supportedAspects: ['9:16', '1:1'],
  primaryAspect: '9:16',
  defaultResolution: '1080p',
  maxDurations: {
    short: 900,       // 15 min (保守值；部分账号可达 60min)
  },
  maxFileSizeBytes: 5 * 1024 * 1024 * 1024,
  fileFormat: 'mp4',
  videoCodec: ['h264'],
  captionGuideline: {
    sidecarFormats: [],
    burnedInRecommended: true,
    safeZone: { top: 100, bottom: 200, left: 50, right: 50 },
  },
  coverSpec: {
    width: 1242,
    height: 1660,
    aspectRatio: '3:4',
  },
  notes: 'Feed 流封面按 3:4 显示，9:16 视频上下会被裁切。主视觉（标题 / logo）请保持在 1080×1440 中央区域。',
}

const GENERIC: PublishPlatformEntry = {
  id: 'generic',
  displayName: '通用 Web Video（无平台约束）',
  supportedAspects: ['9:16', '16:9', '1:1'],
  primaryAspect: '16:9',
  defaultResolution: '1080p',
  maxDurations: {},
  fileFormat: 'mp4',
  videoCodec: ['h264'],
  captionGuideline: {
    sidecarFormats: ['vtt'],
    burnedInRecommended: false,
    safeZone: { top: 60, bottom: 192, left: 60, right: 60 },
  },
  notes: 'Fallback / 默认值。无特定平台约束；适合 HTML5 video / 内嵌 / 跨平台分发。字幕推荐 WebVTT sidecar（HTML5 video 原生支持）。',
}

// ─── Registry ────────────────────────────────────────────────────

export const PUBLISH_PLATFORMS: Record<PublishPlatform, PublishPlatformEntry> = {
  youtube: YOUTUBE,
  douyin: DOUYIN,
  bilibili: BILIBILI,
  xiaohongshu: XIAOHONGSHU,
  generic: GENERIC,
}

export const PUBLISH_PLATFORM_LIST: PublishPlatformEntry[] = [
  YOUTUBE,
  DOUYIN,
  BILIBILI,
  XIAOHONGSHU,
  GENERIC,
]

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * 查 platform entry。id 始终在 PublishPlatform union 内（brief validator 已过），
 * 不存在 fallback 需求。
 */
export function getPlatform(id: PublishPlatform): PublishPlatformEntry {
  return PUBLISH_PLATFORMS[id]
}

/**
 * 平台主推 aspectRatio（brief.aspectRatio 默认值参考）。
 */
export function getDefaultAspectFor(id: PublishPlatform): AspectRatio {
  return PUBLISH_PLATFORMS[id].primaryAspect
}

/**
 * 该 aspect 是否被该平台支持（form UI 联动 hint 用）。
 */
export function isAspectSupportedBy(
  platform: PublishPlatform,
  aspect: AspectRatio,
): boolean {
  return PUBLISH_PLATFORMS[platform].supportedAspects.includes(aspect)
}
