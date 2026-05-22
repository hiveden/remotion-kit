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

export function Stage({ brand, brief }: Props) {
  const inputProps = React.useMemo(() => ({ brand, brief }), [brand, brief])

  return (
    <main
      className="flex h-[calc(100vh-56px)] flex-1 items-center justify-center bg-stage p-8"
      data-testid="demo-stage"
    >
      <div
        className="relative shadow-2xl"
        style={{ aspectRatio: '9 / 16', maxHeight: 'min(90%, 720px)' }}
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
    </main>
  )
}
