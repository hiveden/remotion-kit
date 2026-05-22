// lib/server/llm-prompts.ts
//
// Pure prompt builders shared by:
// - clip-generate.ts (writes Composition.tsx to disk for server-fixed-session)
// - app/api/llm/raw/route.ts (returns text only for client-indexed-db)
//
// Inputs are intentionally minimal — the raw endpoint should not need to
// invent ClipBrief fields like id/createdAt/status to build a prompt.

import 'server-only'

import { getCaptionPreset } from '@/lib/editor/caption-presets'
import { getPlatform } from '@/lib/editor/publish-platforms'
import { BRANDS, DEFAULT_BRAND } from '@/lib/editor/brand-mock'
import type { ClipBrief } from '@/lib/editor/clip-instance'

/**
 * Minimal slice of ClipBrief that prompt builders actually consume.
 * Lets raw endpoint accept partial input without faking a full ClipBrief.
 */
export interface PromptBrief {
  aspectRatio: ClipBrief['aspectRatio']
  publishPlatform: ClipBrief['publishPlatform']
  captionStyle: ClipBrief['captionStyle']
  brandRef: ClipBrief['brandRef']
  references: string[]
}

export interface PromptInput {
  scenePrompt: string
  durationSeconds: number
  cameraHint?: string
}

export function aspectDims(ar: ClipBrief['aspectRatio']): { width: number; height: number } {
  if (ar === '9:16') return { width: 1080, height: 1920 }
  if (ar === '16:9') return { width: 1920, height: 1080 }
  return { width: 1080, height: 1080 }
}

export function resolveBrand(brandRef: string | null) {
  if (!brandRef) return DEFAULT_BRAND
  return BRANDS.find((b) => b.id === brandRef) ?? DEFAULT_BRAND
}

export function buildSystemPrompt(brief: PromptBrief): string {
  const platform = getPlatform(brief.publishPlatform)
  const caption = getCaptionPreset(brief.captionStyle)
  const brand = resolveBrand(brief.brandRef)
  const { width, height } = aspectDims(brief.aspectRatio)
  return `你是 Remotion 视频开发工程师。根据用户提供的 scene prompt 生成一个 Remotion Composition .tsx 文件。

严格输出约束：
1. 单一文件，仅返回一个 \`\`\`tsx ... \`\`\` 代码块（不要包额外解释 / markdown 标题 / 多代码块）
2. 必须 \`export default <Component>\` — Component 是 React.FC，不接受 inputProps（默认值都在组件内）
3. Composition 尺寸 ${width} × ${height}（${brief.aspectRatio}）
4. 时长按用户提供的 durationSeconds × 30fps 计算 durationInFrames
5. **不要** 含 \`registerRoot\` 或 \`<Composition>\` 包装 — Player 直接渲染 default export 的组件
6. **不要** 含 SCAFFOLD_MARKER 注释（"// <SCAFFOLDED PLACEHOLDER..."）
7. **import 严格白名单**（其他任何 import 路径都会导致 webpack 编译失败 → 整个项目不可用）：
   - \`'react'\`：React 默认 + hooks (useState, useEffect, useMemo, useRef 等)
   - \`'remotion'\`：AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Series, Img, Audio, Video 等 named exports（全在 'remotion' 这一个包里）
   - \`'framer-motion'\`：motion, AnimatePresence（仅在 Remotion 不够时用）
   严禁：
   - \`'@remotion/constants'\` / \`'@remotion/player'\` / \`'@remotion/bundler'\`（SDK 内部 sub-packages 不在 component 用）
   - 任何相对路径：\`'./xxx'\` / \`'../xxx'\` / \`'/xxx'\`（Composition 必须独立可运行，无外部文件依赖）
   - 第三方动画库：\`'gsap'\` / \`'react-spring'\` / \`'lottie-react'\` / \`'@react-spring/web'\` 等
8. 使用 React style 内联样式；不引外部 css；不要写 \`<style jsx>\`；CSS 属性用 camelCase（如 \`WebkitTextStroke\`），不要用 kebab-case (\`-webkit-text-stroke\`)

Brand / 平台 / 字幕风格约束（用户的 brief）：
- Brand 主色: ${brand.colors.primary}
- Brand logo: ${brand.logo.text ?? ''}
- 发布平台: ${platform.displayName}
- 字幕样式 (preset "${caption.id}"): fontFamily ${caption.fontFamily}, fontSize ${caption.fontSize}px, fontWeight ${caption.fontWeight}, color ${caption.color}, ${caption.strokeColor ? 'stroke ' + caption.strokeWidth + 'px ' + caption.strokeColor : 'no stroke'}, ${caption.background ? 'bg ' + caption.background : 'no bg'}, safe bottom ${caption.safeAreaBottom}px
- 字幕安全区（底部不可越界）: ${platform.captionGuideline.safeZone.bottom}px

输出仅一段代码，无任何解释文字。`
}

export function buildUserPrompt(input: PromptInput, brief: PromptBrief): string {
  const lines: string[] = []
  lines.push(`Scene prompt:\n${input.scenePrompt}`)
  lines.push(`\n时长: ${input.durationSeconds}s @ 30fps = ${input.durationSeconds * 30} frames`)
  if (input.cameraHint) {
    lines.push(`镜头提示: ${input.cameraHint}`)
  }
  if (brief.references.length > 0) {
    lines.push(`\n风格参考（自由文本；用户希望成品在风格 / 节奏 / 视觉上靠近这些参考）：`)
    for (const ref of brief.references) {
      lines.push(`- ${ref}`)
    }
  }
  lines.push(`\n请生成 Composition.tsx：`)
  return lines.join('\n')
}

/**
 * Default PromptBrief used when client supplies no brief context. Mirrors
 * DEFAULT_BRIEF from clip-instance.ts but only the subset prompts care about.
 */
export const DEFAULT_PROMPT_BRIEF: PromptBrief = {
  aspectRatio: '9:16',
  publishPlatform: 'generic',
  captionStyle: 'subtle',
  brandRef: null,
  references: [],
}
