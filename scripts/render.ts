#!/usr/bin/env bun
//
// bun run render <clip-id> [--out <path>] [--codec h264|h265|vp8|vp9|prores]
//
// Renders the active Composition.tsx of a clip to mp4 by:
//   1. Reading brief.json for fps/duration/dimensions
//   2. Materializing src/remotion-entry.tsx.tmpl with concrete values into
//      .workspace/.render/<clip-id>.tsx
//   3. Invoking `npx remotion render <entry> Clip <out>`
//   4. Cleaning up the entry afterwards (kept on failure for inspection)
//
// SSOT for fps/dimensions logic is here, NOT in the LLM prompt (clip-generate
// embeds these values in the system prompt for the LLM, but the renderer must
// read brief.json directly — generated code can ignore the prompt).

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'

const FPS = 30

interface BriefShape {
  id: string
  aspectRatio: '9:16' | '16:9' | '1:1'
  targetDuration: number
}

function aspectDims(ar: BriefShape['aspectRatio']): { width: number; height: number } {
  if (ar === '9:16') return { width: 1080, height: 1920 }
  if (ar === '16:9') return { width: 1920, height: 1080 }
  return { width: 1080, height: 1080 }
}

interface RenderArgs {
  clipId: string
  out?: string
  codec: string
}

function parseArgs(argv: string[]): RenderArgs {
  const args: RenderArgs = { clipId: '', codec: 'h264' }
  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--out') {
      const v = argv[++i]
      if (!v) throw new Error('--out requires a value')
      args.out = v
    } else if (a === '--codec') {
      const v = argv[++i]
      if (!v) throw new Error('--codec requires a value')
      args.codec = v
    } else if (a && !a.startsWith('-')) {
      positional.push(a)
    } else {
      throw new Error(`Unknown argument: ${a}`)
    }
  }
  if (positional.length === 0) throw new Error('clip-id positional argument required')
  if (positional.length > 1) throw new Error(`Unexpected extra positional args: ${positional.slice(1).join(' ')}`)
  args.clipId = positional[0]!
  return args
}

/**
 * Build the materialized entry source from the template + brief metadata.
 * Exported for unit tests.
 */
export function buildEntrySource(
  template: string,
  ctx: { clipImport: string; fps: number; durationInFrames: number; width: number; height: number },
): string {
  return template
    .replace(/__CLIP_IMPORT__/g, ctx.clipImport)
    .replace(/__FPS__/g, String(ctx.fps))
    .replace(/__DURATION_IN_FRAMES__/g, String(ctx.durationInFrames))
    .replace(/__WIDTH__/g, String(ctx.width))
    .replace(/__HEIGHT__/g, String(ctx.height))
}

export function deriveRenderParams(brief: BriefShape): {
  durationInFrames: number
  width: number
  height: number
  fps: number
} {
  const { width, height } = aspectDims(brief.aspectRatio)
  const durationInFrames = Math.max(1, Math.round(brief.targetDuration * FPS))
  return { durationInFrames, width, height, fps: FPS }
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2))
  const projectRoot = process.env.REMOTION_KIT_ROOT ?? process.cwd()
  const clipDir = resolve(projectRoot, '.workspace/clips', args.clipId)
  const compPath = join(clipDir, 'src', 'Composition.tsx')
  const briefPath = join(clipDir, 'brief.json')
  const tmplPath = resolve(projectRoot, 'src/remotion-entry.tsx.tmpl')
  const renderDir = resolve(projectRoot, '.workspace/.render')
  const entryPath = join(renderDir, `${args.clipId}.tsx`)
  const outPath = args.out
    ? resolve(projectRoot, args.out)
    : join(clipDir, 'render', 'final.mp4')

  if (!existsSync(compPath)) {
    throw new Error(`Composition.tsx not found at ${compPath}`)
  }
  if (!existsSync(briefPath)) {
    throw new Error(`brief.json not found at ${briefPath}`)
  }
  if (!existsSync(tmplPath)) {
    throw new Error(`render entry template not found at ${tmplPath}`)
  }

  const brief = JSON.parse(await readFile(briefPath, 'utf8')) as BriefShape
  const params = deriveRenderParams(brief)
  const template = await readFile(tmplPath, 'utf8')

  // Use absolute path for clip import so esbuild resolves it without requiring
  // tsconfig path aliases. Relative would also work but absolute is clearer.
  const clipImport = compPath.replace(/\.tsx$/, '')
  const entrySrc = buildEntrySource(template, { clipImport, ...params })

  await mkdir(renderDir, { recursive: true })
  await mkdir(join(clipDir, 'render'), { recursive: true })
  await writeFile(entryPath, entrySrc, 'utf8')

  console.log(`▶ rendering clip=${args.clipId}`)
  console.log(`  entry:    ${entryPath}`)
  console.log(`  brief:    ${args.clipId}.brief.json (${brief.aspectRatio}, ${brief.targetDuration}s)`)
  console.log(`  params:   ${params.width}x${params.height} @ ${params.fps}fps, ${params.durationInFrames} frames`)
  console.log(`  out:      ${outPath}`)

  const exitCode = await runRemotion({
    entryPath,
    outPath,
    codec: args.codec,
    cwd: projectRoot,
  })

  if (exitCode === 0) {
    await rm(entryPath, { force: true })
    console.log(`✓ rendered ${outPath}`)
  } else {
    console.error(`✗ remotion render exited with ${exitCode}; entry kept for inspection: ${entryPath}`)
  }
  return exitCode
}

interface RunOpts {
  entryPath: string
  outPath: string
  codec: string
  cwd: string
}

function runRemotion(opts: RunOpts): Promise<number> {
  return new Promise((resolveExit, reject) => {
    const child = spawn(
      'npx',
      [
        'remotion',
        'render',
        opts.entryPath,
        'Clip',
        opts.outPath,
        '--codec=' + opts.codec,
        '--concurrency=1',
      ],
      { cwd: opts.cwd, stdio: 'inherit' },
    )
    child.on('error', reject)
    child.on('exit', (code) => resolveExit(code ?? 1))
  })
}

if (import.meta.main) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err.message ?? err)
      process.exit(1)
    })
}
