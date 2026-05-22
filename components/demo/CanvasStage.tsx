'use client'

import React from 'react'
import { Player } from '@remotion/player'
import DemoComposition from '@/lib/demo/composition'
import type { DemoBrandState, DemoBrief } from '@/lib/demo/types'
import { DEMO_FPS, DEMO_DURATION_FRAMES, DEMO_CANVAS } from '@/lib/demo/defaults'

interface Props {
  brand: DemoBrandState
  brief: DemoBrief
}

export function CanvasStage({ brand, brief }: Props) {
  const inputProps = React.useMemo(() => ({ brand, brief }), [brand, brief])
  return (
    <section
      className="relative grid h-full w-full place-items-center overflow-hidden bg-canvas-surround transition-colors duration-200"
      style={{ boxShadow: 'inset 0 0 0 1px var(--rk-border-soft)' }}
      data-testid="demo-stage"
    >
      <span
        aria-hidden
        className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-[color:rgba(168,85,247,0.4)] bg-[color:rgba(168,85,247,0.15)] px-2.5 py-1 font-mono text-[10px] text-primary"
      >
        ▢ inspector 跟随左侧 rail 选择
      </span>
      <div
        className="relative overflow-hidden rounded-lg"
        style={{
          aspectRatio: '9 / 16',
          height: 'min(85%, 600px)',
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
    </section>
  )
}
