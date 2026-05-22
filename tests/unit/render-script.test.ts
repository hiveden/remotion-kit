import { describe, it, expect } from 'vitest'

const { buildEntrySource, deriveRenderParams } = await import('@/scripts/render')

describe('deriveRenderParams', () => {
  it('9:16 → 1080x1920 @ 30fps', () => {
    expect(deriveRenderParams({ id: 'x', aspectRatio: '9:16', targetDuration: 5 })).toEqual({
      width: 1080,
      height: 1920,
      fps: 30,
      durationInFrames: 150,
    })
  })

  it('16:9 → 1920x1080', () => {
    expect(deriveRenderParams({ id: 'x', aspectRatio: '16:9', targetDuration: 10 })).toEqual({
      width: 1920,
      height: 1080,
      fps: 30,
      durationInFrames: 300,
    })
  })

  it('1:1 → 1080x1080', () => {
    const p = deriveRenderParams({ id: 'x', aspectRatio: '1:1', targetDuration: 8 })
    expect(p.width).toBe(1080)
    expect(p.height).toBe(1080)
  })

  it('rounds fractional duration to nearest frame', () => {
    expect(deriveRenderParams({ id: 'x', aspectRatio: '9:16', targetDuration: 5.4 }).durationInFrames).toBe(162)
    expect(deriveRenderParams({ id: 'x', aspectRatio: '9:16', targetDuration: 5.5 }).durationInFrames).toBe(165)
  })

  it('clamps to at least 1 frame', () => {
    expect(deriveRenderParams({ id: 'x', aspectRatio: '9:16', targetDuration: 0.01 }).durationInFrames).toBe(1)
  })
})

describe('buildEntrySource', () => {
  const TEMPLATE = `import Clip from '__CLIP_IMPORT__'
const f = __FPS__
const d = __DURATION_IN_FRAMES__
const w = __WIDTH__
const h = __HEIGHT__
`

  it('substitutes all placeholders', () => {
    const out = buildEntrySource(TEMPLATE, {
      clipImport: '/abs/path/Composition',
      fps: 30,
      durationInFrames: 150,
      width: 1080,
      height: 1920,
    })
    expect(out).toContain("import Clip from '/abs/path/Composition'")
    expect(out).toContain('const f = 30')
    expect(out).toContain('const d = 150')
    expect(out).toContain('const w = 1080')
    expect(out).toContain('const h = 1920')
  })

  it('handles all placeholder repeats globally', () => {
    const tmpl = '__FPS__ __FPS__ __WIDTH__ __WIDTH__'
    const out = buildEntrySource(tmpl, {
      clipImport: 'x',
      fps: 30,
      durationInFrames: 1,
      width: 1080,
      height: 1080,
    })
    expect(out).toBe('30 30 1080 1080')
  })

  it('leaves no placeholders behind', () => {
    const out = buildEntrySource(TEMPLATE, {
      clipImport: 'x',
      fps: 30,
      durationInFrames: 1,
      width: 1,
      height: 1,
    })
    expect(out).not.toMatch(/__[A-Z_]+__/)
  })
})
