'use client'

// Brief 字段表单，debounce 800ms note / onBlur 持久化其它。
// References 不在这个组件里（用 ClipReferencesInline）。
//
// SSOT: docs/refactor-plan/explorations/2026-05-18-clip-task-brief/DESIGN.md §4

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ASPECT_RATIOS,
  CAPTION_STYLES,
  PUBLISH_PLATFORMS,
  RESOLUTIONS,
  type ClipBrief,
} from '@/lib/editor/clip-instance'
import { BRANDS } from '@/lib/editor/brand-mock'

type FormPatch = Partial<
  Pick<
    ClipBrief,
    | 'brandRef'
    | 'aspectRatio'
    | 'resolution'
    | 'publishPlatform'
    | 'captionStyle'
    | 'targetDuration'
    | 'note'
  >
>

interface Props {
  brief: ClipBrief
  onChange: (patch: FormPatch) => void
}

export function ClipBriefForm({ brief, onChange }: Props) {
  const [note, setNote] = useState(brief.note)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setNote(brief.note)
  }, [brief.note])

  const flushNote = useCallback(
    (value: string) => {
      onChange({ note: value })
    },
    [onChange],
  )

  const onNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setNote(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => flushNote(v), 800)
  }

  const brandMissing = brief.brandRef !== null && !BRANDS.find((b) => b.id === brief.brandRef)

  return (
    <div className="flex flex-col gap-4 p-4">
      <Field label="Brand">
        <select
          value={brief.brandRef ?? ''}
          onChange={(e) => onChange({ brandRef: e.target.value || null })}
          className="w-full rounded border bg-background p-2 text-sm"
        >
          <option value="">(none)</option>
          {BRANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {brandMissing && (
          <p className="mt-1 text-xs text-yellow-600">⚠ brand {brief.brandRef} missing</p>
        )}
      </Field>

      <Field label="Aspect ratio">
        <EnumSelect
          value={brief.aspectRatio}
          options={ASPECT_RATIOS}
          onChange={(v) => onChange({ aspectRatio: v })}
        />
      </Field>

      <Field label="Resolution">
        <EnumSelect
          value={brief.resolution}
          options={RESOLUTIONS}
          onChange={(v) => onChange({ resolution: v })}
        />
      </Field>

      <Field label="Publish platform">
        <EnumSelect
          value={brief.publishPlatform}
          options={PUBLISH_PLATFORMS}
          onChange={(v) => onChange({ publishPlatform: v })}
        />
      </Field>

      <Field label="Caption style">
        <EnumSelect
          value={brief.captionStyle}
          options={CAPTION_STYLES}
          onChange={(v) => onChange({ captionStyle: v })}
        />
      </Field>

      <Field label="Target duration (s)">
        <input
          type="number"
          step={1}
          min={1}
          value={brief.targetDuration}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n) && n > 0) onChange({ targetDuration: n })
          }}
          className="w-full rounded border bg-background p-2 text-sm"
        />
      </Field>

      <Field label="Note (markdown)">
        <textarea
          value={note}
          onChange={onNoteChange}
          onBlur={() => flushNote(note)}
          rows={8}
          className="w-full rounded border bg-background p-2 text-sm font-mono"
          placeholder="给 cc 看的任务描述：想做什么、参考哪个 ref、节奏、要点……"
        />
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

interface EnumSelectProps<T extends string> {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}

function EnumSelect<T extends string>({ value, options, onChange }: EnumSelectProps<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded border bg-background p-2 text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
