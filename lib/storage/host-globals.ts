// lib/storage/host-globals.ts
//
// Registers the host page's React / Remotion / @remotion/player module
// instances on window.__rkHostModules so client-bundled compositions can
// look them up at eval time. Same React instance is critical — separate
// copies break hooks and the Player's frame timing.

'use client'

import * as React from 'react'
import * as Remotion from 'remotion'
import * as RemotionPlayer from '@remotion/player'

declare global {
  interface Window {
    __rkHostModules?: Record<string, unknown>
  }
}

if (typeof window !== 'undefined' && !window.__rkHostModules) {
  window.__rkHostModules = {
    react: React,
    React: React,
    remotion: Remotion,
    '@remotion/player': RemotionPlayer,
  }
}
