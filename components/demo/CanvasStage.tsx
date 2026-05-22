'use client'

import React from 'react'
import { Player } from '@remotion/player'
import DemoComposition from '@/lib/demo/composition'
import type { DemoBrandState, DemoBrief } from '@/lib/demo/types'
import { DEMO_FPS, DEMO_DURATION_FRAMES, DEMO_CANVAS } from '@/lib/demo/defaults'
import { RandomThemeButton } from './RandomThemeButton'
import { BottomTimeline } from './BottomTimeline'

interface Props {
  brand: DemoBrandState
  brief: DemoBrief
  onBrandChange: (next: DemoBrandState) => void
}

export function CanvasStage({ brand, brief, onBrandChange }: Props) {
  const inputProps = React.useMemo(() => ({ brand, brief }), [brand, brief])
  return (
    <main
      className="flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-canvas-surround p-6 transition-colors duration-200"
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
      >
        <Player
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
      </div>

      <RandomThemeButton brand={brand} onChange={onBrandChange} />

      <BottomTimeline />
    </main>
  )
}
