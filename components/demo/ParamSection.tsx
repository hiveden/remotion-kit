'use client'

import React from 'react'
import { BRANDS } from '@/lib/editor/brand-mock'
import type {
  DemoBrandState,
  DemoBrief,
  FontPreset,
  LogoPlacement,
  ParamScope,
  SubtitleStyleId,
} from '@/lib/demo/types'
import { ColorField } from './ColorField'
import { SegmentedControl } from './SegmentedControl'
import { MetricsEditor } from './MetricsEditor'
import { ChevronDown } from './icons'

interface Props {
  scope: ParamScope
  brand: DemoBrandState
  brief: DemoBrief
  onBrandChange: (next: DemoBrandState) => void
  onBriefChange: (next: DemoBrief) => void
  defaultOpen?: boolean
}

const SCOPE_LABEL: Record<ParamScope, string> = {
  brand: 'Brand · 品牌',
  cover: 'Cover · 封面',
  body: 'Body · 内容',
  cta: 'CTA · 收尾',
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

const inputClass =
  'w-full rounded border border-border-strong bg-input px-2 py-1.5 text-[12px] text-text-hi transition-colors focus:border-primary focus:outline-none'

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-text-lo">
        <span>{label}</span>
        {hint && <span className="font-mono normal-case tracking-normal">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

export function ParamSection({
  scope,
  brand,
  brief,
  onBrandChange,
  onBriefChange,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <section
      className="border-b border-border-soft last:border-b-0"
      data-testid={`param-section-${scope}`}
      data-state={open ? 'expanded' : 'collapsed'}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full cursor-pointer items-center gap-2 px-4 text-left text-[11px] font-medium uppercase tracking-wider text-text-md transition-colors hover:bg-input hover:text-text-hi"
        aria-expanded={open}
        data-testid={`param-section-${scope}-summary`}
      >
        <span aria-hidden className="h-3 w-1 rounded-sm bg-primary" />
        {SCOPE_LABEL[scope]}
        <ChevronDown
          className={
            'ml-auto h-3 w-3 transition-transform duration-150 ' +
            (open ? 'rotate-0' : '-rotate-90')
          }
          aria-hidden
        />
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-3 pt-1">
          {scope === 'brand' && (
            <BrandFields brand={brand} onChange={onBrandChange} />
          )}
          {scope === 'cover' && (
            <CoverFields brief={brief} onChange={onBriefChange} />
          )}
          {scope === 'body' && <BodyFields brief={brief} onChange={onBriefChange} />}
          {scope === 'cta' && <CtaFields brief={brief} onChange={onBriefChange} />}
        </div>
      )}
    </section>
  )
}

function BrandFields({
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
    <>
      <FieldRow label="Preset">
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
      </FieldRow>
      <FieldRow label="品牌名">
        <input
          type="text"
          value={brand.name}
          onChange={(e) => onChange({ ...brand, name: e.target.value })}
          className={inputClass}
          data-testid="brand-name"
        />
      </FieldRow>
      <FieldRow label="主色">
        <ColorField
          value={brand.colors.primary}
          onChange={(primary) => onChange({ ...brand, colors: { ...brand.colors, primary } })}
          testid="brand-primary"
        />
      </FieldRow>
      <FieldRow label="副色">
        <ColorField
          value={brand.colors.secondary ?? '#3B82F6'}
          onChange={(secondary) => onChange({ ...brand, colors: { ...brand.colors, secondary } })}
          testid="brand-secondary"
        />
      </FieldRow>
      <FieldRow label="Logo 文字">
        <input
          type="text"
          value={brand.logo.text ?? ''}
          onChange={(e) =>
            onChange({ ...brand, logo: { ...brand.logo, type: 'text', text: e.target.value } })
          }
          className={inputClass}
          data-testid="brand-logo-text"
        />
      </FieldRow>
      <FieldRow label="字体 preset">
        <SegmentedControl
          options={FONT_PRESETS}
          value={brand.fontPreset}
          onChange={(fontPreset) => onChange({ ...brand, fontPreset })}
          testid="brand-font-preset"
        />
      </FieldRow>
    </>
  )
}

function CoverFields({
  brief,
  onChange,
}: {
  brief: DemoBrief
  onChange: (next: DemoBrief) => void
}) {
  function patch(p: Partial<DemoBrief['cover']>) {
    onChange({ ...brief, cover: { ...brief.cover, ...p } })
  }
  return (
    <>
      <FieldRow label="标题">
        <textarea
          rows={2}
          value={brief.cover.title}
          onChange={(e) => patch({ title: e.target.value })}
          className={inputClass + ' resize-none font-medium'}
          data-testid="cover-title"
        />
      </FieldRow>
      <FieldRow label="副标题">
        <input
          type="text"
          value={brief.cover.subtitle}
          onChange={(e) => patch({ subtitle: e.target.value })}
          className={inputClass}
          data-testid="cover-subtitle"
        />
      </FieldRow>
      <FieldRow label="Tag">
        <input
          type="text"
          value={brief.cover.tag}
          onChange={(e) => patch({ tag: e.target.value })}
          className={inputClass + ' w-32 font-mono uppercase'}
          data-testid="cover-tag"
        />
      </FieldRow>
      <FieldRow label="数据点" hint={`${brief.cover.metrics.length}/3`}>
        <MetricsEditor
          metrics={brief.cover.metrics}
          onChange={(metrics) => patch({ metrics })}
        />
      </FieldRow>
    </>
  )
}

function BodyFields({
  brief,
  onChange,
}: {
  brief: DemoBrief
  onChange: (next: DemoBrief) => void
}) {
  function patch(p: Partial<DemoBrief['body']>) {
    onChange({ ...brief, body: { ...brief.body, ...p } })
  }
  return (
    <>
      <FieldRow label="段标题">
        <input
          type="text"
          value={brief.body.title}
          onChange={(e) => patch({ title: e.target.value })}
          className={inputClass}
          data-testid="body-title"
        />
      </FieldRow>
      <FieldRow label="字幕样式">
        <SegmentedControl
          options={SUBTITLE_STYLES}
          value={brief.body.subtitleStyle}
          onChange={(subtitleStyle) => patch({ subtitleStyle })}
          testid="body-subtitle-style"
        />
      </FieldRow>
    </>
  )
}

function CtaFields({
  brief,
  onChange,
}: {
  brief: DemoBrief
  onChange: (next: DemoBrief) => void
}) {
  function patch(p: Partial<DemoBrief['cta']>) {
    onChange({ ...brief, cta: { ...brief.cta, ...p } })
  }
  return (
    <>
      <FieldRow label="文案">
        <input
          type="text"
          value={brief.cta.text}
          onChange={(e) => patch({ text: e.target.value })}
          className={inputClass}
          data-testid="cta-text"
        />
      </FieldRow>
      <FieldRow label="Logo 位置">
        <SegmentedControl
          options={LOGO_PLACEMENTS}
          value={brief.cta.logoPlacement}
          onChange={(logoPlacement) => patch({ logoPlacement })}
          testid="cta-logo-placement"
        />
      </FieldRow>
    </>
  )
}
