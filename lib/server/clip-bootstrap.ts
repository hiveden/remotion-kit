// packages/video-gui/lib/server/clip-bootstrap.ts
//
// 新建 / 更新 Clip 时初始化目录结构：
//   - brief.json     (writeBrief 调用方负责)
//   - src/Composition.tsx  占位 demo（含 SCAFFOLD_MARKER；cc 重写时去掉 marker
//     避免后续 brief PUT 覆盖 cc 写的代码）
//   - .meta/         preview bundle 缓存
//
// brand-aware：用 brief.brandRef 解析 brand mock 的 colors / logo / tag，
// inline 到 demo .tsx，human 立刻能"看到 brand 在视频里长啥样"。

import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { clipDirPath } from './clip-store'
import type { ClipBrief, AspectRatio } from '@/lib/editor/clip-instance'
import { BRANDS, DEFAULT_BRAND, type Brand } from '@/lib/editor/brand-mock'
import { getCaptionPreset } from '@/lib/editor/caption-presets'

/**
 * marker 注释：判断 src/Composition.tsx 是否仍是脚手架生成的占位。
 * cc 接管时只要不照搬整段文件就会去掉这一行，从而获得"再 PUT 不被覆盖"。
 */
const SCAFFOLD_MARKER = '// <SCAFFOLDED PLACEHOLDER — safe to overwrite>'

function resolveBrand(brandRef: string | null): Brand {
  if (!brandRef) return DEFAULT_BRAND
  return BRANDS.find((b) => b.id === brandRef) ?? DEFAULT_BRAND
}

function aspectDims(ar: AspectRatio): { width: number; height: number } {
  if (ar === '9:16') return { width: 1080, height: 1920 }
  if (ar === '16:9') return { width: 1920, height: 1080 }
  return { width: 1080, height: 1080 }
}

function safeStr(s: string): string {
  // 用于安全嵌入到模板字面值；不允许反引号 / ${} 注入
  return s.replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/\\/g, '\\\\')
}

function buildPlaceholder(brief: ClipBrief): string {
  const brand = resolveBrand(brief.brandRef)
  aspectDims(brief.aspectRatio) // dimension constants are baked into <Composition> elsewhere
  const fps = 30
  const durationInFrames = Math.max(30, Math.round(brief.targetDuration * fps))

  const primary = brand.colors.primary
  const secondary = brand.colors.secondary ?? '#1f2937'
  const logo = safeStr(brand.logo.text ?? brand.name)
  const tag = safeStr(brand.defaultTag ?? 'BRIEF')

  // Caption preset：把 registry 真实 token inline 到生成代码，placeholder 渲染
  // 时按 captionStyle 显示完整的字体 / 颜色 / 描边 / 背景 / 动效。human 切
  // captionStyle dropdown 后 placeholder 实际样式变化对比明显。
  const capPreset = getCaptionPreset(brief.captionStyle)
  const captionPreview = safeStr(`示例字幕 · ${capPreset.displayName.split(' · ')[0]}`)

  // Platform badge：用 brief.publishPlatform id 直接 uppercase（短）；
  // registry 完整 displayName 留给 form UI / info bar 使用
  const platform = safeStr(brief.publishPlatform.toUpperCase())

  return `${SCAFFOLD_MARKER}
// .workspace/clips/${brief.id}/src/Composition.tsx
//
// 占位 demo。cc 接管时把整段重写：
//   - 保留 \`export default <Component>\`（GUI ClipPreviewPane 走 @remotion/player
//     lazyComponent 走的就是这个 default export）。
//   - 去掉文件顶部 SCAFFOLD_MARKER 注释，下一次 brief PUT 不会再覆盖你的代码。
//   - 自由 import remotion 的任何 hook（useCurrentFrame / interpolate / spring …）。

import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'

const PRIMARY = ${JSON.stringify(primary)}
const SECONDARY = ${JSON.stringify(secondary)}
const LOGO = ${JSON.stringify(logo)}
const TAG = ${JSON.stringify(tag)}
const PLATFORM = ${JSON.stringify(platform)}
const CAPTION_TEXT = ${JSON.stringify(captionPreview)}
const CAPTION_STYLE = ${JSON.stringify(capPreset)} as const
const DURATION = ${durationInFrames}

const PlaceholderClip: React.FC = () => {
  const frame = useCurrentFrame()
  const titleOpacity = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' })
  const titleY = interpolate(frame, [0, 30], [40, 0], { extrapolateRight: 'clamp' })
  const subOpacity = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: 'clamp' })
  const captionOpacity = interpolate(frame, [55, 80], [0, 0.85], { extrapolateRight: 'clamp' })
  const pulse = 0.6 + Math.sin((frame / 30) * Math.PI) * 0.4
  const exitFade = interpolate(frame, [DURATION - 30, DURATION], [1, 0], { extrapolateLeft: 'clamp' })

  return (
    <AbsoluteFill
      style={{
        background: \`radial-gradient(circle at 30% 20%, \${PRIMARY}, \${SECONDARY} 75%, #0b0b0d)\`,
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Geist, "PingFang SC", sans-serif',
        opacity: exitFade,
      }}
    >
      {/* TAG badge */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 60,
          padding: '8px 16px',
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 6,
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: 2,
          fontFamily: 'Geist Mono, ui-monospace, monospace',
        }}
      >
        {TAG}
      </div>

      {/* platform 右上 */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          right: 60,
          fontSize: 18,
          opacity: 0.55,
          fontFamily: 'Geist Mono, ui-monospace, monospace',
          letterSpacing: 1.5,
        }}
      >
        {PLATFORM}
      </div>

      {/* 中央主标题 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 60,
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            transform: \`translateY(\${titleY}px)\`,
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: -1.5,
            lineHeight: 1.05,
            textAlign: 'center',
            textShadow: '0 6px 30px rgba(0,0,0,0.45)',
          }}
        >
          Brief 演示
        </div>
        <div
          style={{
            opacity: subOpacity,
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: 0.5,
            color: 'rgba(255,255,255,0.78)',
          }}
        >
          cc 接管 src/Composition.tsx 后替换
        </div>
      </div>

      {/* 字幕样式预览：完整 token from CAPTION_PRESETS registry。
          stroke 用 -webkit-text-stroke + multi-offset textShadow 模拟，
          兼容 Chrome / Safari Remotion bundle 运行时。 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: CAPTION_STYLE.safeAreaBottom,
          textAlign: 'center',
          opacity: captionOpacity,
          fontFamily: CAPTION_STYLE.fontFamily,
          fontSize: CAPTION_STYLE.fontSize,
          fontWeight: CAPTION_STYLE.fontWeight,
          letterSpacing: CAPTION_STYLE.letterSpacing,
          color: CAPTION_STYLE.color,
          WebkitTextStroke: CAPTION_STYLE.strokeColor
            ? \`\${CAPTION_STYLE.strokeWidth}px \${CAPTION_STYLE.strokeColor}\`
            : undefined,
          textShadow: CAPTION_STYLE.textShadow ?? undefined,
        }}
      >
        <span
          style={{
            // background 只包文字框；inline-block 让 padding 生效不撑满父宽
            display: 'inline-block',
            padding: CAPTION_STYLE.background
              ? \`\${CAPTION_STYLE.paddingY}px \${CAPTION_STYLE.paddingX}px\`
              : 0,
            background: CAPTION_STYLE.background ?? undefined,
            borderRadius: CAPTION_STYLE.borderRadius,
          }}
        >
          {CAPTION_TEXT}
        </span>
      </div>

      {/* 脉动小圈（节拍） */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 140,
          transform: \`translateX(-50%) scale(\${pulse})\`,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#ffffff',
          opacity: 0.85,
          boxShadow: '0 0 36px rgba(255,255,255,0.7)',
        }}
      />

      {/* logo 底部 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 60,
          textAlign: 'center',
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 1,
          opacity: 0.85,
          fontFamily: 'Geist Mono, ui-monospace, monospace',
        }}
      >
        {LOGO}
      </div>
    </AbsoluteFill>
  )
}

export default PlaceholderClip
`
}

/**
 * 创建 clip 时（POST）调用：写出 placeholder + 建立 .meta/。
 * brand / brief 字段后续变更后由 ensureScaffoldFresh 同步重写。
 */
export async function scaffoldClipDir(brief: ClipBrief): Promise<void> {
  const dir = clipDirPath(brief.id)
  const srcDir = path.join(dir, 'src')
  const metaDir = path.join(dir, '.meta')
  await fs.mkdir(srcDir, { recursive: true })
  await fs.mkdir(metaDir, { recursive: true })
  const compPath = path.join(srcDir, 'Composition.tsx')
  try {
    await fs.access(compPath)
    // 已存在 — 让 ensureScaffoldFresh 处理（保留 cc 改动）
  } catch {
    await fs.writeFile(compPath, buildPlaceholder(brief), 'utf8')
  }
}

/**
 * brief 字段变更后调用：如果 src/Composition.tsx 仍是脚手架占位（含 SCAFFOLD_MARKER），
 * 用最新 brief 重写一次，让 placeholder 反映最新 brand / aspect / duration 等。
 * 一旦 cc 删掉 marker（即重写过文件），此函数 no-op。
 */
export async function ensureScaffoldFresh(brief: ClipBrief): Promise<void> {
  const compPath = path.join(clipDirPath(brief.id), 'src', 'Composition.tsx')
  let existing: string
  try {
    existing = await fs.readFile(compPath, 'utf8')
  } catch {
    // 文件不存在 → 不在这里管，scaffoldClipDir 才负责"从无到有"
    return
  }
  if (!existing.includes(SCAFFOLD_MARKER)) {
    // cc 已改写 → 保留
    return
  }
  await fs.writeFile(compPath, buildPlaceholder(brief), 'utf8')
}
