'use client'

import React from 'react'
import { BRANDS } from '@/lib/editor/brand-mock'
import type {
  DemoBrandState,
  DemoBrief,
  FontPreset,
  InspectorScope,
  LogoPlacement,
  SubtitleStyleId,
} from '@/lib/demo/types'
import { ColorField } from './ColorField'
import { SegmentedControl } from './SegmentedControl'
import { MetricsEditor } from './MetricsEditor'

interface Props {
  scope: InspectorScope
  brand: DemoBrandState
  brief: DemoBrief
  onBrandChange: (next: DemoBrandState) => void
  onBriefChange: (next: DemoBrief) => void
}

const FONT_PRESETS: ReadonlyArray<{ value: FontPreset; label: string }> = [
  { value: 'compact', label: '紧凑' },
  { value: 'comfortable', label: '舒展' },
  { value: 'spacious', label: '宽松' },
]

const SUBTITLE_STYLES: ReadonlyArray<{ value: SubtitleStyleId; label: string }> = [
  { value: 'classic', label: '经典' },
  { value: 'bold', label: '加粗' },
  { value: 'lecture', label: '讲解' },
]

const LOGO_PLACEMENTS: ReadonlyArray<{ value: LogoPlacement; label: string }> = [
  { value: 'left', label: '左' },
  { value: 'center', label: '中' },
  { value: 'right', label: '右' },
]

const SCOPE_META: Record<InspectorScope, { icon: string; title: string; path: string }> = {
  brand: { icon: 'B', title: 'Brand 品牌套件', path: 'remotion-kit › brand' },
  cover: { icon: 'C', title: 'Cover 封面段', path: 'brief › cover' },
  body: { icon: 'M', title: 'Body 内容段', path: 'brief › body' },
  cta: { icon: '→', title: 'CTA 收尾段', path: 'brief › cta' },
}

interface FieldProps {
  label: string
  hint?: string
  children: React.ReactNode
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="border-b border-border px-4 py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-text-lo">
        <span>{label}</span>
        {hint && <span className="font-mono normal-case tracking-normal">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded border border-border-strong bg-input px-2 py-1.5 text-xs text-text-hi transition-colors focus:border-primary focus:outline-none'

export function Inspector({ scope, brand, brief, onBrandChange, onBriefChange }: Props) {
  const meta = SCOPE_META[scope]
  return (
    <aside
      className="flex h-full flex-col overflow-y-auto border-l border-border bg-panel transition-colors duration-200"
      data-testid="demo-inspector"
      data-scope={scope}
    >
      <header className="border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2 text-xs text-text-hi">
          <span className="grid h-5 w-5 place-items-center rounded bg-primary font-mono text-[10px] text-white">
            {meta.icon}
          </span>
          {meta.title}
        </div>
        <div className="mt-1 font-mono text-[10px] text-text-lo">{meta.path}</div>
      </header>

      {scope === 'brand' && (
        <BrandPane brand={brand} onChange={onBrandChange} />
      )}
      {scope === 'cover' && (
        <CoverPane brief={brief} onChange={onBriefChange} />
      )}
      {scope === 'body' && (
        <BodyPane brief={brief} onChange={onBriefChange} />
      )}
      {scope === 'cta' && (
        <CtaPane brief={brief} onChange={onBriefChange} />
      )}
    </aside>
  )
}

function BrandPane({
  brand,
  onChange,
}: {
  brand: DemoBrandState
  onChange: (b: DemoBrandState) => void
}) {
  function applyPreset(id: string) {
    const preset = BRANDS.find((b) => b.id === id)
    if (!preset) return
    onChange({ ...preset, fontPreset: brand.fontPreset })
  }
  return (
    <div>
      <Field label="Preset">
        <select
          value={brand.id}
          onChange={(e) => applyPreset(e.target.value)}
          className={inputClass}
          data-testid="brand-preset"
        >
          {BRANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="品牌名">
        <input
          type="text"
          value={brand.name}
          onChange={(e) => onChange({ ...brand, name: e.target.value })}
          className={inputClass}
          data-testid="brand-name"
        />
      </Field>
      <Field label="主色">
        <ColorField
          value={brand.colors.primary}
          onChange={(primary) => onChange({ ...brand, colors: { ...brand.colors, primary } })}
          testid="brand-primary"
        />
      </Field>
      <Field label="副色">
        <ColorField
          value={brand.colors.secondary ?? '#3B82F6'}
          onChange={(secondary) => onChange({ ...brand, colors: { ...brand.colors, secondary } })}
          testid="brand-secondary"
        />
      </Field>
      <Field label="Logo 文字">
        <input
          type="text"
          value={brand.logo.text ?? ''}
          onChange={(e) =>
            onChange({ ...brand, logo: { ...brand.logo, type: 'text', text: e.target.value } })
          }
          className={inputClass}
          data-testid="brand-logo-text"
        />
      </Field>
      <Field label="字体 preset">
        <SegmentedControl
          options={FONT_PRESETS}
          value={brand.fontPreset}
          onChange={(fontPreset) => onChange({ ...brand, fontPreset })}
          testid="brand-font-preset"
        />
      </Field>
    </div>
  )
}

function CoverPane({
  brief,
  onChange,
}: {
  brief: DemoBrief
  onChange: (next: DemoBrief) => void
}) {
  function patchCover(patch: Partial<DemoBrief['cover']>) {
    onChange({ ...brief, cover: { ...brief.cover, ...patch } })
  }
  return (
    <div>
      <Field label="标题">
        <textarea
          rows={2}
          value={brief.cover.title}
          onChange={(e) => patchCover({ title: e.target.value })}
          className={inputClass + ' resize-none font-medium'}
          data-testid="cover-title"
        />
      </Field>
      <Field label="副标题">
        <input
          type="text"
          value={brief.cover.subtitle}
          onChange={(e) => patchCover({ subtitle: e.target.value })}
          className={inputClass}
          data-testid="cover-subtitle"
        />
      </Field>
      <Field label="Tag">
        <input
          type="text"
          value={brief.cover.tag}
          onChange={(e) => patchCover({ tag: e.target.value })}
          className={inputClass + ' w-32 font-mono uppercase'}
          data-testid="cover-tag"
        />
      </Field>
      <Field label="数据点" hint={`${brief.cover.metrics.length}/3`}>
        <MetricsEditor
          metrics={brief.cover.metrics}
          onChange={(metrics) => patchCover({ metrics })}
        />
      </Field>
    </div>
  )
}

function BodyPane({
  brief,
  onChange,
}: {
  brief: DemoBrief
  onChange: (next: DemoBrief) => void
}) {
  function patchBody(patch: Partial<DemoBrief['body']>) {
    onChange({ ...brief, body: { ...brief.body, ...patch } })
  }
  return (
    <div>
      <Field label="段标题">
        <input
          type="text"
          value={brief.body.title}
          onChange={(e) => patchBody({ title: e.target.value })}
          className={inputClass}
          data-testid="body-title"
        />
      </Field>
      <Field label="字幕样式">
        <SegmentedControl
          options={SUBTITLE_STYLES}
          value={brief.body.subtitleStyle}
          onChange={(subtitleStyle) => patchBody({ subtitleStyle })}
          testid="body-subtitle-style"
        />
      </Field>
    </div>
  )
}

function CtaPane({
  brief,
  onChange,
}: {
  brief: DemoBrief
  onChange: (next: DemoBrief) => void
}) {
  function patchCta(patch: Partial<DemoBrief['cta']>) {
    onChange({ ...brief, cta: { ...brief.cta, ...patch } })
  }
  return (
    <div>
      <Field label="文案">
        <input
          type="text"
          value={brief.cta.text}
          onChange={(e) => patchCta({ text: e.target.value })}
          className={inputClass}
          data-testid="cta-text"
        />
      </Field>
      <Field label="Logo 位置">
        <SegmentedControl
          options={LOGO_PLACEMENTS}
          value={brief.cta.logoPlacement}
          onChange={(logoPlacement) => patchCta({ logoPlacement })}
          testid="cta-logo-placement"
        />
      </Field>
    </div>
  )
}

