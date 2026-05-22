// lib/server/clip-generate.ts
//
// Single-pass LLM call that produces src/Composition.tsx for a given clip.
// Build system + user prompt → call LLM → extract tsx code block → overwrite
// src/Composition.tsx. Once SCAFFOLD_MARKER is gone, ensureScaffoldFresh stops
// overwriting on brief PUT.

import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { readBrief, clipDirPath, ClipNotFoundError } from './clip-store'
import { chatCompletion, extractTsxCodeBlock, LLMError } from './llm-client'
import { getCaptionPreset } from '@/lib/editor/caption-presets'
import { getPlatform } from '@/lib/editor/publish-platforms'
import { BRANDS, DEFAULT_BRAND } from '@/lib/editor/brand-mock'
import type { ClipBrief } from '@/lib/editor/clip-instance'

export interface GenerateInput {
  clipId: string
  scenePrompt: string
  durationSeconds: number
  cameraHint?: string
}

export interface GenerateResult {
  ok: true
  clipId: string
  generatedAt: string
  codeLength: number
}

function aspectDims(ar: ClipBrief['aspectRatio']): { width: number; height: number } {
  if (ar === '9:16') return { width: 1080, height: 1920 }
  if (ar === '16:9') return { width: 1920, height: 1080 }
  return { width: 1080, height: 1080 }
}

function resolveBrand(brandRef: string | null) {
  if (!brandRef) return DEFAULT_BRAND
  return BRANDS.find((b) => b.id === brandRef) ?? DEFAULT_BRAND
}

function buildSystemPrompt(brief: ClipBrief): string {
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

function buildUserPrompt(input: GenerateInput, brief: ClipBrief): string {
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

export async function generateClipComposition(input: GenerateInput): Promise<GenerateResult> {
  const brief = await readBrief(input.clipId)
  if (!brief) throw new ClipNotFoundError(input.clipId)

  // Q1.7: archive current active take BEFORE we overwrite. Compute next version eagerly.
  const { nextVersion, previousMeta } = await archiveCurrentAndAllocateNext(input.clipId)

  const systemPrompt = buildSystemPrompt(brief)
  const userPrompt = buildUserPrompt(input, brief)

  const startedAt = Date.now()
  const chatRes = await chatCompletion({ systemPrompt, userPrompt, maxTokens: 8000 })
  const durationMs = Date.now() - startedAt

  const { text, meta } = chatRes
  if (!text) {
    await writeGenerateRecord(input, brief, systemPrompt, userPrompt, meta, durationMs, null, 'VALIDATION_EMPTY_RESPONSE')
    await registerNewTake(input.clipId, nextVersion, previousMeta, {
      generatedAt: new Date().toISOString(),
      model: meta.model,
      provider: meta.provider,
      codeLength: 0,
      errorCode: 'VALIDATION_EMPTY_RESPONSE',
      scenePrompt: input.scenePrompt,
    })
    throw new LLMError('VALIDATION_EMPTY_RESPONSE', 'LLM returned an empty response.')
  }
  const code = extractTsxCodeBlock(text)
  if (!code) {
    await writeGenerateRecord(input, brief, systemPrompt, userPrompt, meta, durationMs, text, 'VALIDATION_NO_CODE_BLOCK')
    await registerNewTake(input.clipId, nextVersion, previousMeta, {
      generatedAt: new Date().toISOString(),
      model: meta.model,
      provider: meta.provider,
      codeLength: 0,
      errorCode: 'VALIDATION_NO_CODE_BLOCK',
      scenePrompt: input.scenePrompt,
    })
    throw new LLMError('VALIDATION_NO_CODE_BLOCK', 'LLM response did not contain a parsable tsx code block.')
  }

  // Q1.12: import 白名单校验 — broken LLM 输出（如 hallucinate '@remotion/constants'）
  // 不允许覆盖 active Composition.tsx，否则 webpack 编译失败 → 全 route 500。
  // Take 仍 register 但 errorCode='VALIDATION_INVALID_IMPORT' + 不写 src/Composition.tsx。
  const importViolation = validateImports(code)
  if (importViolation) {
    await writeGenerateRecord(input, brief, systemPrompt, userPrompt, meta, durationMs, text, 'VALIDATION_INVALID_IMPORT')
    await registerNewTake(input.clipId, nextVersion, previousMeta, {
      generatedAt: new Date().toISOString(),
      model: meta.model,
      provider: meta.provider,
      codeLength: code.length,
      errorCode: 'VALIDATION_INVALID_IMPORT',
      scenePrompt: input.scenePrompt,
    })
    throw new LLMError(
      'VALIDATION_INVALID_IMPORT',
      `LLM output contains a disallowed import: ${importViolation} (only react / remotion / @remotion/* / framer-motion allowed).`,
    )
  }

  // Q1.12: syntax 校验 — 用 typescript transpileModule 检查能否编译。
  // 防 LLM 写出 'export default Foo:' 这种 syntax bug 把 webpack 整个 route 挂掉。
  const syntaxViolation = await validateSyntax(code)
  if (syntaxViolation) {
    await writeGenerateRecord(input, brief, systemPrompt, userPrompt, meta, durationMs, text, 'VALIDATION_INVALID_SYNTAX')
    await registerNewTake(input.clipId, nextVersion, previousMeta, {
      generatedAt: new Date().toISOString(),
      model: meta.model,
      provider: meta.provider,
      codeLength: code.length,
      errorCode: 'VALIDATION_INVALID_SYNTAX',
      scenePrompt: input.scenePrompt,
    })
    throw new LLMError('VALIDATION_INVALID_SYNTAX', `LLM output failed to parse as tsx: ${syntaxViolation}`)
  }

  const compPath = path.join(clipDirPath(input.clipId), 'src', 'Composition.tsx')
  await fs.writeFile(compPath, code, 'utf8')

  const generatedAt = new Date().toISOString()
  await writeGenerateRecord(input, brief, systemPrompt, userPrompt, meta, durationMs, text, null, generatedAt, code.length)
  await registerNewTake(input.clipId, nextVersion, previousMeta, {
    generatedAt,
    model: meta.model,
    provider: meta.provider,
    codeLength: code.length,
    errorCode: null,
    scenePrompt: input.scenePrompt,
  })

  return {
    ok: true,
    clipId: input.clipId,
    generatedAt,
    codeLength: code.length,
  }
}

// ===========================================================================
// Take history support (Q1.7) — 每次 generate 写新代码前先归档现有的 active take。
//   takes/meta.json schema: { schemaVersion, activeVersion, takes: [...] }
//
// 行为：
//   - 第一次 generate（无 meta）→ 直接写 v1 + meta
//   - 后续 generate → 现有 Composition.tsx + last-generate.json 复制到 takes/vN-<ts>.{tsx,json}，
//     更新 meta.takes append + 设 activeVersion 为新 vN+1
// ===========================================================================

interface TakeMeta {
  schemaVersion: number
  activeVersion: string
  takes: Array<{
    version: string
    generatedAt: string
    model: string
    provider: string
    codeLength: number
    errorCode: string | null
    scenePromptPreview: string
  }>
}

function takesDirPath(clipId: string): string {
  return path.join(clipDirPath(clipId), '.meta', 'takes')
}

function takesMetaPath(clipId: string): string {
  return path.join(takesDirPath(clipId), 'meta.json')
}

async function readTakesMeta(clipId: string): Promise<TakeMeta | null> {
  try {
    const buf = await fs.readFile(takesMetaPath(clipId), 'utf8')
    return JSON.parse(buf) as TakeMeta
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
}

async function writeTakesMeta(clipId: string, meta: TakeMeta): Promise<void> {
  await fs.mkdir(takesDirPath(clipId), { recursive: true })
  await fs.writeFile(takesMetaPath(clipId), JSON.stringify(meta, null, 2), 'utf8')
}

function tsForFilename(iso: string): string {
  // 2026-05-21T09:30:12.123Z → 2026-05-21T09-30-12
  return iso.replace(/[:.]/g, '-').slice(0, 19)
}

/**
 * Archive current Composition.tsx + last-generate.json into takes/vN-<ts>.{tsx,json}.
 * Returns the next version string (e.g. "v3") that the NEW generate should claim.
 * If no existing take to archive (first generate), still returns "v1".
 */
async function archiveCurrentAndAllocateNext(
  clipId: string,
): Promise<{ nextVersion: string; previousMeta: TakeMeta | null }> {
  const meta = await readTakesMeta(clipId)
  const compPath = path.join(clipDirPath(clipId), 'src', 'Composition.tsx')
  const recordPath = path.join(clipDirPath(clipId), '.meta', 'last-generate.json')

  // Determine next version — 用所有 takes 的最大 vN，不是 activeVersion。
  // 否则切到 v1 后再 generate 会生成 "v2" 与已有 v2 撞名。
  const maxN = meta && meta.takes.length > 0
    ? Math.max(...meta.takes.map((t) => Number(t.version.replace(/^v/, '')) || 0))
    : 0
  const nextVersion = `v${maxN + 1}`

  // Archive existing files if both exist and meta has activeVersion already
  // (avoid double-archiving when first generate hits this path)
  if (meta && meta.activeVersion) {
    try {
      const [code, record] = await Promise.all([
        fs.readFile(compPath, 'utf8').catch(() => null),
        fs.readFile(recordPath, 'utf8').catch(() => null),
      ])
      if (code !== null && record !== null) {
        const activeEntry = meta.takes.find((t) => t.version === meta.activeVersion)
        if (activeEntry) {
          const ts = tsForFilename(activeEntry.generatedAt)
          await fs.writeFile(
            path.join(takesDirPath(clipId), `${meta.activeVersion}-${ts}.tsx`),
            code,
            'utf8',
          )
          await fs.writeFile(
            path.join(takesDirPath(clipId), `${meta.activeVersion}-${ts}.json`),
            record,
            'utf8',
          )
        }
      }
    } catch {
      // Archive failures shouldn't block new generate; ignore
    }
  }

  return { nextVersion, previousMeta: meta }
}

/**
 * After new code written and record persisted, update takes/meta.json to register
 * the new active take.
 */
async function registerNewTake(
  clipId: string,
  version: string,
  previousMeta: TakeMeta | null,
  record: {
    generatedAt: string
    model: string
    provider: string
    codeLength: number
    errorCode: string | null
    scenePrompt: string
  },
): Promise<void> {
  const newEntry = {
    version,
    generatedAt: record.generatedAt,
    model: record.model,
    provider: record.provider,
    codeLength: record.codeLength,
    errorCode: record.errorCode,
    scenePromptPreview: record.scenePrompt.slice(0, 80),
  }
  // Q1.12: 失败 take（errorCode != null）不抢 activeVersion，让旧版本继续 active。
  // 这样 broken LLM 输出不会替换 Composition.tsx，UI 仍能渲染上一个 working 版本。
  const isSuccess = record.errorCode == null
  const meta: TakeMeta = previousMeta
    ? {
        ...previousMeta,
        activeVersion: isSuccess ? version : previousMeta.activeVersion,
        takes: [...previousMeta.takes, newEntry],
      }
    : {
        schemaVersion: 1,
        // 首次 take 失败时也用新 version 作 active（没旧的可保），但 UI 会显 ⚠
        activeVersion: version,
        takes: [newEntry],
      }
  await writeTakesMeta(clipId, meta)
}

interface ChatMeta {
  provider: string
  model: string
  usage?: unknown
}

// Q1.12: 校验 LLM 输出的 imports 在白名单内。返回违规的 module name，或 null 表示通过。
const ALLOWED_IMPORT_PREFIXES = ['react', 'remotion', '@remotion/', 'framer-motion']
function validateImports(code: string): string | null {
  // 匹配 import ... from "...";  | import "..."
  // 也匹配 dynamic import('...')，但限于 generated tsx 通常仅 top-level import
  const importRegex = /\bimport\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = importRegex.exec(code))) {
    const mod = m[1]
    if (!mod) continue
    if (mod.startsWith('.') || mod.startsWith('/')) return mod
    const allowed = ALLOWED_IMPORT_PREFIXES.some((p) =>
      p.endsWith('/') ? mod.startsWith(p) : mod === p || mod.startsWith(p + '/'),
    )
    if (!allowed) return mod
  }
  return null
}

// Q1.12: 校验 tsx 语法。用 typescript transpileModule 看是否能解析。
// 返回错误描述（不写盘）或 null（通过）。
async function validateSyntax(code: string): Promise<string | null> {
  try {
    const ts = await import('typescript')
    const result = ts.default.transpileModule(code, {
      compilerOptions: {
        jsx: ts.default.JsxEmit.ReactJSX,
        target: ts.default.ScriptTarget.ES2022,
        module: ts.default.ModuleKind.ESNext,
        moduleResolution: ts.default.ModuleResolutionKind.Bundler,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
      reportDiagnostics: true,
    })
    const fatal = (result.diagnostics ?? []).filter(
      (d) => d.category === ts.default.DiagnosticCategory.Error,
    )
    if (fatal.length > 0) {
      const first = fatal[0]
      if (first) {
        const msg = ts.default.flattenDiagnosticMessageText(first.messageText, '\n').slice(0, 200)
        return `TS${first.code}: ${msg}`
      }
    }
    // 还需要确认存在 `export default` — 否则 Player lazyComponent 拿不到
    if (!/\bexport\s+default\b/.test(code)) {
      return 'no-default-export: 缺少 `export default <Component>`'
    }
    return null
  } catch {
    // typescript unavailable / parse threw — skip validation, not fatal
    return null
  }
}

async function writeGenerateRecord(
  input: GenerateInput,
  brief: ClipBrief,
  systemPrompt: string,
  userPrompt: string,
  meta: ChatMeta,
  durationMs: number,
  rawResponse: string | null,
  errorCode: string | null,
  generatedAt = new Date().toISOString(),
  codeLength = 0,
): Promise<void> {
  const metaDir = path.join(clipDirPath(input.clipId), '.meta')
  await fs.mkdir(metaDir, { recursive: true })
  const record = {
    schemaVersion: 1,
    clipId: input.clipId,
    clipName: brief.name,
    scenePrompt: input.scenePrompt,
    durationSeconds: input.durationSeconds,
    cameraHint: input.cameraHint ?? null,
    references: brief.references,
    brand: {
      ref: brief.brandRef,
    },
    composition: {
      aspectRatio: brief.aspectRatio,
      resolution: brief.resolution,
      publishPlatform: brief.publishPlatform,
      captionStyle: brief.captionStyle,
    },
    llm: {
      provider: meta.provider,
      model: meta.model,
      usage: meta.usage ?? null,
    },
    systemPrompt,
    userPrompt,
    rawResponse,
    codeLength,
    durationMs,
    generatedAt,
    errorCode,
  }
  const recordPath = path.join(metaDir, 'last-generate.json')
  await fs.writeFile(recordPath, JSON.stringify(record, null, 2), 'utf8')
}
