'use client'

import React from 'react'
import { Player } from '@remotion/player'
import DemoComposition from '@/lib/demo/composition'
import type { DemoBrandState, DemoBrief } from '@/lib/demo/types'
import { DEMO_FPS, DEMO_DURATION_FRAMES, DEMO_CANVAS } from '@/lib/demo/defaults'
import { useStorageProvider } from '@/lib/storage/use-storage-provider'
import { RandomThemeButton } from './RandomThemeButton'

interface Props {
  brand: DemoBrandState
  brief: DemoBrief
  onRoll: (next: { brand: DemoBrandState; brief: DemoBrief }) => void
  /**
   * "static" → render <DemoComposition> directly (state-driven preview).
   * "lazy:<clipId>" → load LLM-generated Composition from
   * `.workspace/clips/<clipId>/src/Composition.tsx` via webpack alias.
   */
  source: { kind: 'static' } | { kind: 'lazy'; clipId: string }
  /** Bumped by parent to force the Player to re-import on lazy source. */
  reloadKey: number
}

class CompositionErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean; err: Error | null }
> {
  override state = { hasError: false, err: null as Error | null }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, err }
  }
  override render() {
    if (this.state.hasError) {
      return (
        <div
          className="absolute inset-0 grid place-items-center bg-canvas p-4 text-center font-mono text-[11px] text-text-lo"
          data-testid="composition-error-fallback"
        >
          <div>
            <div className="text-destructive">⚠ 加载 Composition 失败</div>
            <div className="mt-2 max-h-24 overflow-auto text-text-lo">
              {this.state.err?.message ?? 'unknown error'}
            </div>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, err: null })
                this.props.onReset()
              }}
              className="mt-3 rounded border border-border-strong bg-input px-3 py-1 text-text-hi hover:bg-elevated"
            >
              ↻ 重试
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function CanvasStage({ brand, brief, onRoll, source, reloadKey }: Props) {
  const inputProps = React.useMemo(() => ({ brand, brief }), [brand, brief])
  const provider = useStorageProvider()

  const lazyComponent = React.useMemo(() => {
    if (source.kind === 'static') return undefined
    if (!provider) return undefined
    return provider.composition(source.clipId)
  }, [source, provider])

  // `key` bump on reloadKey forces React to remount the <Player>, which clears
  // the module cache and re-evaluates lazyComponent. The boundary AND the
  // Player both need the key so React's reconciler can't reuse a stale Player
  // instance across the static→lazy switch.
  const playerKey = `${source.kind}:${source.kind === 'lazy' ? source.clipId : 'static'}:${reloadKey}`

  return (
    <main
      className="flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden bg-canvas-surround p-6 transition-colors duration-200"
      data-testid="demo-stage"
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-md"
        style={{
          aspectRatio: '9 / 16',
          height: 'min(100%, 540px)',
          maxHeight: 540,
          background: 'var(--rk-canvas)',
          boxShadow: 'var(--rk-shadow-stage)',
        }}
        data-testid="demo-player"
        data-source={source.kind}
      >
        <CompositionErrorBoundary
          key={playerKey}
          onReset={() => {
            /* Reset to whatever the parent says — typically static fallback */
          }}
        >
          {source.kind === 'static' ? (
            <Player
              key={playerKey}
              component={DemoComposition}
              inputProps={inputProps}
              durationInFrames={DEMO_DURATION_FRAMES}
              fps={DEMO_FPS}
              compositionWidth={DEMO_CANVAS.width}
              compositionHeight={DEMO_CANVAS.height}
              style={{ width: '100%', height: '100%' }}
              controls
              autoPlay
              loop
              showVolumeControls={false}
              clickToPlay
              spaceKeyToPlayOrPause
              acknowledgeRemotionLicense
            />
          ) : (
            <Player
              key={playerKey}
              lazyComponent={lazyComponent!}
              inputProps={inputProps}
              durationInFrames={DEMO_DURATION_FRAMES}
              fps={DEMO_FPS}
              compositionWidth={DEMO_CANVAS.width}
              compositionHeight={DEMO_CANVAS.height}
              style={{ width: '100%', height: '100%' }}
              controls
              autoPlay
              loop
              showVolumeControls={false}
              clickToPlay
              spaceKeyToPlayOrPause
              acknowledgeRemotionLicense
            />
          )}
        </CompositionErrorBoundary>
      </div>

      <RandomThemeButton brand={brand} brief={brief} onChange={onRoll} />
    </main>
  )
}
