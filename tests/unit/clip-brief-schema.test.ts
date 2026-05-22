import { describe, it, expect } from 'vitest'
import {
  slugify,
  generateClipId,
  validateClipBrief,
  DEFAULT_BRIEF,
  type ClipBrief,
} from '@/lib/editor/clip-instance'

describe('slugify', () => {
  it('保留 ASCII 段，纯中文 fallback', () => {
    expect(slugify('CNN 入门')).toBe('cnn')
    expect(slugify('My Tech Brief')).toBe('my-tech-brief')
    expect(slugify('测试')).toBe('clip')
    expect(slugify('')).toBe('clip')
    expect(slugify('   ---   ')).toBe('clip')
  })
  it('折叠多 -、trim 边缘、截 32', () => {
    expect(slugify('aa---bb')).toBe('aa-bb')
    expect(slugify('-aa-')).toBe('aa')
    expect(slugify('x'.repeat(40))).toHaveLength(32)
  })
})

describe('generateClipId', () => {
  it('匹配 <slug>-<8 hex>', () => {
    expect(generateClipId('test')).toMatch(/^test-[0-9a-f]{8}$/)
    expect(generateClipId('CNN 入门')).toMatch(/^cnn-[0-9a-f]{8}$/)
  })
})

describe('validateClipBrief', () => {
  it('空对象 → 错误列表', () => {
    const r = validateClipBrief({})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(5)
  })

  it('完整合法 brief → ok', () => {
    const brief: ClipBrief = {
      id: 'test-deadbeef',
      name: 'Test Clip',
      status: 'draft',
      producerKind: 'remotion',
      brandRef: null,
      aspectRatio: '9:16',
      resolution: '1080p',
      publishPlatform: 'youtube',
      captionStyle: 'subtle',
      targetDuration: 15,
      references: [],
      note: '',
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    }
    const r = validateClipBrief(brief)
    expect(r.ok).toBe(true)
  })

  it('aspectRatio 枚举外 → 错', () => {
    const r = validateClipBrief({ ...validBrief(), aspectRatio: 'foo' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(',')).toContain('aspectRatio')
  })

  it('references 含非字符串 → 错', () => {
    const r = validateClipBrief({
      ...validBrief(),
      references: ['ok', 42],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(',')).toContain('references')
  })

  it('references 全是字符串 → ok', () => {
    const r = validateClipBrief({
      ...validBrief(),
      references: ['https://example.com/inspo', 'kinetic typography'],
    })
    expect(r.ok).toBe(true)
  })

  it('targetDuration 非数字 → 错', () => {
    const r = validateClipBrief({ ...validBrief(), targetDuration: '15' })
    expect(r.ok).toBe(false)
  })

  it('DEFAULT_BRIEF 通过 validate', () => {
    const r = validateClipBrief({
      ...DEFAULT_BRIEF,
      id: 'x-deadbeef',
      name: 'x',
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
    })
    expect(r.ok).toBe(true)
  })

  it('references 中混入非字符串 → ok:false', () => {
    const r = validateClipBrief({
      ...validBrief(),
      references: ['valid', { templateId: 'oops' }],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(',')).toContain('references[1]')
  })

  it('targetDuration = NaN → 错', () => {
    const r = validateClipBrief({ ...validBrief(), targetDuration: NaN })
    expect(r.ok).toBe(false)
  })

  it('ok:true 时 value 字段 round-trip 正确', () => {
    const input = {
      ...validBrief(),
      targetDuration: 22,
      references: ['https://example.com/inspo'],
    }
    const r = validateClipBrief(input)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.targetDuration).toBe(22)
      expect(r.value.references).toEqual(['https://example.com/inspo'])
      expect(r.value.aspectRatio).toBe('9:16')
    }
  })
})

function validBrief(): ClipBrief {
  return {
    id: 'test-deadbeef',
    name: 'Test',
    status: 'draft',
    producerKind: 'remotion',
    brandRef: null,
    aspectRatio: '9:16',
    resolution: '1080p',
    publishPlatform: 'youtube',
    captionStyle: 'subtle',
    targetDuration: 15,
    references: [],
    note: '',
    createdAt: '2026-05-18T00:00:00.000Z',
    updatedAt: '2026-05-18T00:00:00.000Z',
  }
}

describe('producerKind field', () => {
  it('DEFAULT_BRIEF.producerKind = "remotion"', () => {
    const r = validateClipBrief({
      ...DEFAULT_BRIEF,
      id: 'x-deadbeef',
      name: 'x',
      createdAt: '2026-05-20T00:00:00.000Z',
      updatedAt: '2026-05-20T00:00:00.000Z',
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.producerKind).toBe('remotion')
  })

  it('producerKind 枚举外 → 错', () => {
    const r = validateClipBrief({
      ...validBrief(),
      producerKind: 'invalid',
    })
    expect(r.ok).toBe(false)
  })

  it('producerKind = "image-to-video" → ok（v2 能力预留）', () => {
    const r = validateClipBrief({
      ...validBrief(),
      producerKind: 'image-to-video',
    })
    expect(r.ok).toBe(true)
  })
})
