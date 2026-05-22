'use client'

import React from 'react'
import type { DemoBrief, ContentTab, SubtitleStyleId, LogoPlacement } from '@/lib/demo/types'
import { Field } from './Field'
import { SegmentedControl } from './SegmentedControl'
import { MetricsEditor } from './MetricsEditor'

interface Props {
  brief: DemoBrief
  onChange: (next: DemoBrief) => void
}

const TABS: ReadonlyArray<{ value: ContentTab; label: string }> = [
  { value: 'cover', label: 'Cover' },
  { value: 'body', label: 'Body' },
  { value: 'cta', label: 'CTA' },
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

export function ContentGroup({ brief, onChange }: Props) {
  const [tab, setTab] = React.useState<ContentTab>('cover')

  return (
    <section className="flex-1 px-5 py-4" data-testid="content-group">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider">
        <span className="h-4 w-1 rounded-sm bg-primary" />
        内容
      </h2>

      <div className="mb-3 flex border-b border-border" data-testid="content-tabs">
        {TABS.map((t) => {
          const active = tab === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={
                'relative px-3 py-1.5 text-sm transition motion-reduce:transition-none ' +
                (active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')
              }
              data-testid={`content-tab-${t.value}`}
              data-state={active ? 'active' : 'inactive'}
            >
              {t.label}
              {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
            </button>
          )
        })}
      </div>

      <div data-testid={`content-tab-pane-${tab}`}>
        {tab === 'cover' && (
          <div>
            <Field label="标题">
              <textarea
                rows={2}
                value={brief.cover.title}
                onChange={(e) =>
                  onChange({ ...brief, cover: { ...brief.cover, title: e.target.value } })
                }
                className="w-full resize-none rounded border border-input bg-card px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="cover-title"
              />
            </Field>
            <Field label="副标题">
              <input
                type="text"
                value={brief.cover.subtitle}
                onChange={(e) =>
                  onChange({ ...brief, cover: { ...brief.cover, subtitle: e.target.value } })
                }
                className="w-full rounded border border-input bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="cover-subtitle"
              />
            </Field>
            <Field label="Tag">
              <input
                type="text"
                value={brief.cover.tag}
                onChange={(e) =>
                  onChange({ ...brief, cover: { ...brief.cover, tag: e.target.value } })
                }
                className="w-32 rounded border border-input bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="cover-tag"
              />
            </Field>
            <div className="grid grid-cols-[80px_1fr] gap-3 py-1.5">
              <span className="text-xs text-muted-foreground">数据点</span>
              <MetricsEditor
                metrics={brief.cover.metrics}
                onChange={(metrics) => onChange({ ...brief, cover: { ...brief.cover, metrics } })}
              />
            </div>
          </div>
        )}

        {tab === 'body' && (
          <div>
            <Field label="段标题">
              <input
                type="text"
                value={brief.body.title}
                onChange={(e) =>
                  onChange({ ...brief, body: { ...brief.body, title: e.target.value } })
                }
                className="w-full rounded border border-input bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="body-title"
              />
            </Field>
            <Field label="字幕">
              <SegmentedControl
                options={SUBTITLE_STYLES}
                value={brief.body.subtitleStyle}
                onChange={(subtitleStyle) =>
                  onChange({ ...brief, body: { ...brief.body, subtitleStyle } })
                }
                testid="body-subtitle-style"
              />
            </Field>
          </div>
        )}

        {tab === 'cta' && (
          <div>
            <Field label="文案">
              <input
                type="text"
                value={brief.cta.text}
                onChange={(e) =>
                  onChange({ ...brief, cta: { ...brief.cta, text: e.target.value } })
                }
                className="w-full rounded border border-input bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="cta-text"
              />
            </Field>
            <Field label="Logo 位置">
              <SegmentedControl
                options={LOGO_PLACEMENTS}
                value={brief.cta.logoPlacement}
                onChange={(logoPlacement) =>
                  onChange({ ...brief, cta: { ...brief.cta, logoPlacement } })
                }
                testid="cta-logo-placement"
              />
            </Field>
          </div>
        )}
      </div>
    </section>
  )
}
