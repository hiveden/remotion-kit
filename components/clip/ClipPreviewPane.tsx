// packages/video-gui/components/clip/ClipPreviewPane.tsx
//
// @remotion/player + dynamic import 加载 .workspace/clips/<id>/src/Composition.tsx。
// webpack alias `@clip-workspace` 指向 .workspace/clips，next dev 自动 watch
// + rebuild 该 chunk。和 References inline Player 同源 React 实例。
//
// 布局三段（垂直）：
//   1. top header — 路径标签 + reload 按钮
//   2. video area — center + max 60vh 高度 + aspect-ratio 自适应，留呼吸空间
//   3. info bar — brief 元数据 chip 群，human 一眼看完整上下文

'use client'

import * as React from 'react'
import { useMemo, useState } from 'react'
import { Player } from '@remotion/player'
import type { ClipBrief, AspectRatio } from '@/lib/editor/clip-instance'
import { BRANDS } from '@/lib/editor/brand-mock'

interface Props {
  brief: ClipBrief
  /** 调用方 increment 此 key 强制 lazy import 重新评估 + ErrorBoundary remount */
  reloadKey?: number
}

function aspectDims(ar: AspectRatio): { width: number; height: number } {
  if (ar === '9:16') return { width: 1080, height: 1920 }
  if (ar === '16:9') return { width: 1920, height: 1080 }
  return { width: 1080, height: 1080 }
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (e: Error) => void },
  { hasError: boolean; err: Error | null }
> {
  override state = { hasError: false, err: null as Error | null }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, err }
  }
  override componentDidCatch(err: Error) {
    this.props.onError(err)
  }
  override render() {
    if (this.state.hasError) {
      return (
        <pre
          className="absolute inset-0 overflow-auto p-3 font-mono text-xs text-red-300"
          data-testid="clip-preview-error"
          data-state="error"
        >
          {this.state.err?.stack ?? this.state.err?.message ?? 'render error'}
        </pre>
      )
    }
    return this.props.children
  }
}

export function ClipPreviewPane({ brief, reloadKey = 0 }: Props) {
  const [errorKey, setErrorKey] = useState(0)
  const { width, height } = aspectDims(brief.aspectRatio)
  const fps = 30
  const durationInFrames = Math.max(30, Math.round(brief.targetDuration * fps))

  const lazyComponent = useMemo(
    () => () =>
      import(
        /* webpackInclude: /Composition\.tsx$/ */
        `@clip-workspace/${brief.id}/src/Composition`
      ),
    [brief.id, reloadKey],
  )

  const inputProps = useMemo(() => ({ brief }), [brief])

  const brand = useMemo(
    () => (brief.brandRef ? BRANDS.find((b) => b.id === brief.brandRef) : null),
    [brief.brandRef],
  )

  return (
    <div
      className="flex h-full w-full flex-col bg-black text-white"
      data-testid="clip-preview-root"
    >
      {/* Top — path label + reload */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs">
        <span className="font-mono text-white/70">
          Preview · {brief.aspectRatio} · {durationInFrames}f / {brief.targetDuration}s
        </span>
        <button
          onClick={() => setErrorKey((k) => k + 1)}
          className="rounded border border-white/20 px-2 py-0.5 text-[10px] hover:bg-white/10"
          title="重载 Composition"
          data-testid="clip-preview-reload"
        >
          ↻ 重载
        </button>
      </div>

      {/* Video area — center + aspect 严格保持
          双轴 absolute max（1080w × 720h）防止大屏上无限放大；min() 兜底容器收紧。
          flex 父容器加 min-h-0 才让 flex-1 实际 clamp 高度。 */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-neutral-950 p-6">
        <div
          className="relative bg-black shadow-2xl"
          style={{
            aspectRatio: `${width} / ${height}`,
            // min(100%, ...) 让小屏自动收紧、大屏卡在绝对上限：
            //   16:9 → 最大 1080×608；9:16 → 最大 405×720；1:1 → 720×720
            maxWidth: 'min(100%, 1080px)',
            maxHeight: 'min(100%, 720px)',
            width: brief.aspectRatio === '9:16' ? 'auto' : '100%',
            height: brief.aspectRatio === '9:16' ? '100%' : 'auto',
          }}
        >
          <ErrorBoundary key={`${errorKey}-${reloadKey}`} onError={() => {}}>
            <div className="h-full w-full" data-testid="clip-preview-player">
              <Player
                lazyComponent={lazyComponent}
                inputProps={inputProps}
                durationInFrames={durationInFrames}
                fps={fps}
                compositionWidth={width}
                compositionHeight={height}
                style={{ width: '100%', height: '100%' }}
                controls
                autoPlay
                loop
                showVolumeControls
                clickToPlay
                spaceKeyToPlayOrPause
                doubleClickToFullscreen
                acknowledgeRemotionLicense
              />
            </div>
          </ErrorBoundary>
        </div>
      </div>

      {/* Info bar — brief 元数据 chip 群 */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-white/10 bg-neutral-950/60 px-4 py-3 text-xs md:grid-cols-3 lg:grid-cols-4">
        <InfoItem label="Brand">
          {brand ? (
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: brand.colors.primary }}
              />
              <span className="truncate">{brand.name}</span>
            </span>
          ) : (
            <span className="text-white/40">(none)</span>
          )}
        </InfoItem>
        <InfoItem label="Resolution">
          {width}×{height}{' '}
          <span className="text-white/40">({brief.resolution})</span>
        </InfoItem>
        <InfoItem label="Platform">{brief.publishPlatform}</InfoItem>
        <InfoItem label="Caption">{brief.captionStyle}</InfoItem>
        <InfoItem label="Duration">
          {brief.targetDuration}s @ {fps}fps · {durationInFrames}f
        </InfoItem>
        <InfoItem label="References">
          {brief.references.length === 0 ? (
            <span className="text-white/40">0 个</span>
          ) : (
            <span>{brief.references.length} 个</span>
          )}
        </InfoItem>
        <InfoItem label="Status">
          <span
            className={
              brief.status === 'archived' ? 'text-amber-400' : 'text-emerald-400'
            }
          >
            {brief.status}
          </span>
        </InfoItem>
        <InfoItem label="Composition">
          <span className="font-mono text-[11px] text-white/70">
            src/Composition.tsx
          </span>
        </InfoItem>
      </div>
    </div>
  )
}

function InfoItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </span>
      <span className="truncate">{children}</span>
    </div>
  )
}
