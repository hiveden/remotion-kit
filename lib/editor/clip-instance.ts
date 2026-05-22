// lib/editor/clip-instance.ts
//
// ClipBrief schema + validator + ID helpers. Pure module, no fs IO.

export const ASPECT_RATIOS = ['9:16', '16:9', '1:1'] as const
export const RESOLUTIONS = ['1080p', '720p', '4k'] as const
export const PUBLISH_PLATFORMS = [
  'youtube',
  'douyin',
  'bilibili',
  'xiaohongshu',
  'generic',
] as const
export const CAPTION_STYLES = ['subtle', 'bold', 'kinetic'] as const
export const STATUSES = ['draft', 'archived'] as const
export const PRODUCER_KINDS = ['remotion', 'image-to-video'] as const

export type AspectRatio = (typeof ASPECT_RATIOS)[number]
export type Resolution = (typeof RESOLUTIONS)[number]
export type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number]
export type CaptionStyle = (typeof CAPTION_STYLES)[number]
export type Status = (typeof STATUSES)[number]
export type ProducerKind = (typeof PRODUCER_KINDS)[number]

export interface ClipBrief {
  id: string
  name: string
  status: Status
  producerKind: ProducerKind
  brandRef: string | null
  aspectRatio: AspectRatio
  resolution: Resolution
  publishPlatform: PublishPlatform
  captionStyle: CaptionStyle
  targetDuration: number
  references: string[]
  note: string
  createdAt: string
  updatedAt: string
}

const SLUG_MAX_LENGTH = 32
const UUID_SHORT_LENGTH = 8

export function slugify(input: string): string {
  if (typeof input !== 'string') return 'clip'
  const lowered = input.toLowerCase()
  const replaced = lowered.replace(/[^a-z0-9-]+/g, '-')
  const collapsed = replaced.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
  if (!collapsed) return 'clip'
  const truncated = collapsed.slice(0, SLUG_MAX_LENGTH).replace(/-+$/, '')
  return truncated || 'clip'
}

export function generateClipId(name: string): string {
  const slug = slugify(name)
  const uuid = crypto.randomUUID().split('-')[0]
  const suffix =
    uuid && uuid.length >= UUID_SHORT_LENGTH ? uuid.slice(0, UUID_SHORT_LENGTH) : 'deadbeef'
  return `${slug}-${suffix}`
}

export const DEFAULT_BRIEF: Omit<ClipBrief, 'id' | 'name' | 'createdAt' | 'updatedAt'> = {
  status: 'draft',
  producerKind: 'remotion',
  brandRef: null,
  aspectRatio: '9:16',
  resolution: '1080p',
  publishPlatform: 'generic',
  captionStyle: 'subtle',
  targetDuration: 15,
  references: [],
  note: '',
}

function isEnumValue<T extends readonly string[]>(arr: T, v: unknown): v is T[number] {
  return typeof v === 'string' && (arr as readonly string[]).includes(v)
}

function validateReferences(raw: unknown, errors: string[]): string[] | null {
  if (!Array.isArray(raw)) {
    errors.push('references: must be array of strings')
    return null
  }
  const out: string[] = []
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]
    if (typeof item !== 'string') {
      errors.push(`references[${i}]: must be string`)
      continue
    }
    const trimmed = item.trim()
    if (!trimmed) continue
    out.push(trimmed)
  }
  return out
}

export function validateClipBrief(
  raw: unknown,
): { ok: true; value: ClipBrief } | { ok: false; errors: string[] } {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['root: not a plain object'] }
  }
  const r = raw as Record<string, unknown>

  if (typeof r.id !== 'string' || !r.id) errors.push('id: missing or empty')
  if (typeof r.name !== 'string') errors.push('name: must be string')
  if (!isEnumValue(STATUSES, r.status)) errors.push(`status: must be one of ${STATUSES.join('|')}`)
  if (r.brandRef !== null && typeof r.brandRef !== 'string') errors.push('brandRef: must be string or null')
  if (!isEnumValue(ASPECT_RATIOS, r.aspectRatio)) errors.push(`aspectRatio: must be one of ${ASPECT_RATIOS.join('|')}`)
  if (!isEnumValue(RESOLUTIONS, r.resolution)) errors.push(`resolution: must be one of ${RESOLUTIONS.join('|')}`)
  if (!isEnumValue(PUBLISH_PLATFORMS, r.publishPlatform)) errors.push(`publishPlatform: must be one of ${PUBLISH_PLATFORMS.join('|')}`)
  if (!isEnumValue(CAPTION_STYLES, r.captionStyle)) errors.push(`captionStyle: must be one of ${CAPTION_STYLES.join('|')}`)
  if (!isEnumValue(PRODUCER_KINDS, r.producerKind)) errors.push(`producerKind: must be one of ${PRODUCER_KINDS.join('|')}`)
  if (typeof r.targetDuration !== 'number' || !Number.isFinite(r.targetDuration) || r.targetDuration <= 0) {
    errors.push('targetDuration: must be positive number')
  }
  if (typeof r.note !== 'string') errors.push('note: must be string')
  if (typeof r.createdAt !== 'string' || !r.createdAt) errors.push('createdAt: missing or empty')
  if (typeof r.updatedAt !== 'string' || !r.updatedAt) errors.push('updatedAt: missing or empty')

  const refs = validateReferences(r.references, errors)
  if (refs === null) return { ok: false, errors }

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      id: r.id as string,
      name: r.name as string,
      status: r.status as Status,
      brandRef: r.brandRef as string | null,
      aspectRatio: r.aspectRatio as AspectRatio,
      resolution: r.resolution as Resolution,
      publishPlatform: r.publishPlatform as PublishPlatform,
      captionStyle: r.captionStyle as CaptionStyle,
      producerKind: r.producerKind as ProducerKind,
      targetDuration: r.targetDuration as number,
      references: refs,
      note: r.note as string,
      createdAt: r.createdAt as string,
      updatedAt: r.updatedAt as string,
    },
  }
}
