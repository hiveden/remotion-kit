// lib/templates/brief/index.tsx
//
// Brief template entry. v0.1 ships portrait (1080×2060) only; the landscape
// twin and the cross-orientation dispatch from astral-video are preserved in
// astral-video for the v0.2 lift.

import React from 'react'
import { useVideoConfig } from 'remotion'
import { PortraitSegmentWrapper } from './portrait-wrapper'
import { DefaultCover, CoreCTAAnimation } from './components'
import type { BriefMeta, BriefSegment, SegmentBackgrounds, SegmentChildren } from './types'

export interface BriefTemplate {
  SegmentWrapper: React.FC<{
    meta: BriefMeta
    segment: BriefSegment
    children: SegmentChildren
    subtitleStyle?: string
    backgrounds?: SegmentBackgrounds
  }>
  Cover: React.FC<{ meta: BriefMeta }>
  CTA: React.FC<{ meta: BriefMeta }>
}

export const briefTemplate: BriefTemplate = {
  SegmentWrapper: ({ meta, segment, children, subtitleStyle, backgrounds }) => {
    const { width, height } = useVideoConfig()
    if (width > height) {
      // Landscape support is reserved for a later milestone. v0.1 falls back to
      // the portrait wrapper so a misconfigured composition still renders.
      return (
        <PortraitSegmentWrapper
          meta={meta}
          segment={segment}
          subtitleStyle={subtitleStyle}
          backgrounds={backgrounds}
        >
          {children}
        </PortraitSegmentWrapper>
      )
    }
    return (
      <PortraitSegmentWrapper
        meta={meta}
        segment={segment}
        subtitleStyle={subtitleStyle}
        backgrounds={backgrounds}
      >
        {children}
      </PortraitSegmentWrapper>
    )
  },
  Cover: DefaultCover,
  CTA: () => <CoreCTAAnimation />,
}

export { PortraitSegmentWrapper } from './portrait-wrapper'
export { useContentBox } from './use-content-box'
export { useFittedFontSize } from './use-fitted-font-size'
export { computeFittedFontSize } from './compute-fitted-font-size'
export type { BriefMeta, BriefSegment, BriefSegmentRole, BriefCover, SubtitleLine, SubtitleWord, ContentBox, SegmentBackgrounds, SegmentRegionBackground, SegmentChildren } from './types'
