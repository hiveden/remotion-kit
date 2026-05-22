// lib/templates/brief/portrait-wrapper.tsx
//
// Portrait (1080×2060) wrapper for a single brief segment. Lays out
// HEADER (hook / body / cta header) + CONTENT (business visuals) + FOOTER
// (brand label + subtitle), drawn by ThreePartLayout.

import React from 'react'
import { useVideoConfig } from 'remotion'
import { ThreePartLayout } from '../shared/three-part-layout'
import { BrandFooter } from './brand-footer'
import { HeaderHook, HeaderContent } from './components'
import { useContentBox } from './use-content-box'
import { computeFittedFontSize } from './compute-fitted-font-size'
import type { BriefMeta, BriefSegment, SegmentBackgrounds, SegmentChildren } from './types'

interface Props {
  meta: BriefMeta
  segment: BriefSegment
  children: SegmentChildren
  subtitleStyle?: string
  backgrounds?: SegmentBackgrounds
}

export const PortraitSegmentWrapper: React.FC<Props> = ({
  meta,
  segment,
  children,
  subtitleStyle,
  backgrounds,
}) => {
  const box = useContentBox()
  const { fps } = useVideoConfig()
  const resolved =
    typeof children === 'function'
      ? children({ box, fitted: computeFittedFontSize, fps })
      : children

  let headerComponent: React.ReactNode = null

  if (segment.role === 'hook') {
    headerComponent = (
      <HeaderHook
        brandLabel={meta.brandLabel}
        dateLabel={meta.dateLabel}
        topic={meta.topic}
      />
    )
  } else if (segment.role === 'body' || segment.role === 'cta') {
    headerComponent = (
      <HeaderContent
        brandLabel={meta.brandLabel}
        dateLabel={meta.dateLabel}
        topic={meta.topic}
        chapterTitle={segment.topic}
      />
    )
  }

  return (
    <ThreePartLayout
      header={headerComponent}
      footer={<BrandFooter subtitles={segment.subtitles} subtitleStyle={subtitleStyle} />}
      headerBackground={backgrounds?.portraitHeader}
      footerBackground={backgrounds?.portraitFooter}
      disableNoise={true}
    >
      {resolved}
    </ThreePartLayout>
  )
}
