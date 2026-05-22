// packages/video-gui/components/project/TakeHistoryStrip.tsx
//
// Take 历史横向条：v1·v2·v3 chip，hover tooltip 显完整 metadata，
// click 切 active take。在 ProduceTab Inspector + ClipInstanceEditor 共用。

'use client'

import * as React from 'react'

interface Take {
  version: string
  generatedAt: string
  model: string
  provider: string
  codeLength: number
  errorCode: string | null
  scenePromptPreview: string
}

interface Props {
  clipId: string
  /** 切 take 成功后 callback：用于父组件触发 reloadKey++ 让 Player 拉新代码 */
  onSwitched?: () => void
  /** 当 generate 成功时 parent 触发 refresh */
  refreshKey?: number
}

export function TakeHistoryStrip({ clipId, onSwitched, refreshKey = 0 }: Props) {
  const [data, setData] = React.useState<{ activeVersion: string | null; takes: Take[] }>({
    activeVersion: null,
    takes: [],
  })
  const [loading, setLoading] = React.useState(false)
  const [switching, setSwitching] = React.useState<string | null>(null)

  const fetchTakes = React.useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/clips/${clipId}/takes`, { cache: 'no-store' })
      if (r.ok) {
        const d = (await r.json()) as { activeVersion: string | null; takes: Take[] }
        setData(d)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [clipId])

  React.useEffect(() => {
    void fetchTakes()
  }, [fetchTakes, refreshKey])

  async function onSwitch(version: string) {
    if (version === data.activeVersion) return
    setSwitching(version)
    try {
      const r = await fetch(`/api/clips/${clipId}/active-take`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version }),
      })
      if (r.ok) {
        await fetchTakes()
        onSwitched?.()
      }
    } catch {
      // ignore
    } finally {
      setSwitching(null)
    }
  }

  if (loading && data.takes.length === 0) {
    return (
      <div
        className="text-[10px] text-muted-foreground"
        data-testid="clip-takes-strip"
        data-state="loading"
      >
        loading takes…
      </div>
    )
  }
  if (data.takes.length === 0) {
    return null // 无历史不渲染
  }

  return (
    <div
      className="flex flex-col gap-1"
      data-testid="clip-takes-strip"
      data-state="success"
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Take 历史 ({data.takes.length})
      </div>
      <div className="flex flex-wrap gap-1">
        {data.takes.map((t) => {
          const isActive = t.version === data.activeVersion
          const isError = t.errorCode != null
          const isSwitching = switching === t.version
          const status = isError ? '⚠' : '✓'
          return (
            <button
              key={t.version}
              type="button"
              data-testid={`clip-takes-chip-${t.version}`}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => void onSwitch(t.version)}
              disabled={isSwitching || isActive}
              title={[
                `${t.version} ${status} ${new Date(t.generatedAt).toLocaleString()}`,
                `${t.provider} · ${t.model}`,
                `${t.codeLength} chars${t.errorCode ? ' · ' + t.errorCode : ''}`,
                t.scenePromptPreview ? `prompt: ${t.scenePromptPreview}` : '',
              ]
                .filter(Boolean)
                .join('\n')}
              className={[
                'rounded border px-2 py-1 text-[10px] font-mono transition',
                isActive
                  ? 'border-blue-500 bg-blue-500/15 text-blue-200 cursor-default'
                  : isError
                  ? 'border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20'
                  : 'border-white/15 hover:bg-white/5',
                isSwitching ? 'opacity-50' : '',
              ].join(' ')}
            >
              {status} {t.version}
              {isActive ? ' *' : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}
