// ThreePartLayout — content-priority three-section layout (Header + Content +
// Footer). Content stays at 920px on a 1080×2060 portrait canvas; surplus
// height splits 42:58 between header and footer.
//
// Canvas heights other than 2060 also work — header / footer just absorb the
// difference. The 1080-wide assumption is hard-coded for v0.1 (Douyin /
// Xiaohongshu / YouTube Shorts all accept 1080×1920–2060).

import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BG_BASE,
  BRAND_SUBTLE,
  METALLIC_HEADER_BG,
  METALLIC_FOOTER_BG,
  DIVIDER_GRADIENT,
} from "../brief/tokens";

const NOISE_TEXTURE = staticFile("textures/noise-512.png");

// 固定值
const CONTENT_HEIGHT = 920;

export interface LayoutRegionBackground {
  src: string;
  opacity?: number;
  overlay?: string;
  position?: string;
  /** 见 ShotWrapperRegionBackground.animate · ken-burns 微动画 */
  animate?: "kenBurns" | false;
}

interface Props {
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showDividers?: boolean;
  backgroundColor?: string;
  disableNoise?: boolean;
  headerBackground?: LayoutRegionBackground;
  footerBackground?: LayoutRegionBackground;
}

export const ThreePartLayout: React.FC<Props> = ({
  header,
  children,
  footer,
  showDividers = true,
  backgroundColor = BG_BASE,
  disableNoise = false,
  headerBackground,
  footerBackground,
}) => {
  const { height: canvasHeight } = useVideoConfig();

  // 根据画布高度动态计算 Header/Footer
  // 安全内容区固定 920px，剩余空间按 42:58 分配给 Header:Footer
  const remaining = canvasHeight - CONTENT_HEIGHT;
  const headerHeight = Math.round(remaining * 0.42);
  const footerHeight = canvasHeight - headerHeight - CONTENT_HEIGHT;
  const contentTop = headerHeight;
  const footerTop = headerHeight + CONTENT_HEIGHT;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* HEADER — 裁切缓冲区，标题贴底对齐 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1080,
          height: headerHeight,
          background: METALLIC_HEADER_BG,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          zIndex: 3,
        }}
      >
        {headerBackground && (
          <RegionBackgroundLayer background={headerBackground} />
        )}
        <div style={{ position: "relative", zIndex: 1 }}>
          {header}
        </div>
      </div>

      {/* CONTENT — 安全区内核心内容 */}
      <div
        style={{
          position: "absolute",
          top: contentTop,
          left: 0,
          width: 1080,
          height: CONTENT_HEIGHT,
          overflow: "hidden",
          zIndex: 3,
        }}
      >
        {children}
      </div>

      {/* 分隔线 */}
      {showDividers && (
        <>
          <div
            style={{
              position: "absolute",
              top: contentTop - 1,
              left: 60,
              right: 60,
              height: 1,
              background: DIVIDER_GRADIENT,
              boxShadow: `0 0 6px ${BRAND_SUBTLE}`,
              zIndex: 10,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: footerTop - 1,
              left: 60,
              right: 60,
              height: 1,
              background: DIVIDER_GRADIENT,
              boxShadow: `0 0 6px ${BRAND_SUBTLE}`,
              zIndex: 10,
            }}
          />
        </>
      )}

      {/* FOOTER — 字幕 + 品牌 */}
      <div
        style={{
          position: "absolute",
          top: footerTop,
          left: 0,
          width: 1080,
          height: footerHeight,
          background: METALLIC_FOOTER_BG,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
          zIndex: 3,
        }}
      >
        {footerBackground && (
          <RegionBackgroundLayer background={footerBackground} />
        )}
        <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
          {footer}
        </div>
      </div>

      {/* Noise 纹理 (V2 架构中可能由外层提供全局噪点) */}
      {!disableNoise && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1080,
            height: canvasHeight,
            backgroundImage: `url(${NOISE_TEXTURE})`,
            backgroundSize: "512px 512px",
            backgroundRepeat: "repeat",
            opacity: 0.04,
            mixBlendMode: "overlay",
            pointerEvents: "none",
            zIndex: 20,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

export const THREE_PART_CONTENT_HEIGHT = CONTENT_HEIGHT;

const RegionBackgroundLayer: React.FC<{ background: LayoutRegionBackground }> = ({
  background,
}) => {
  const frame = useCurrentFrame();
  // Ken-burns: scale 1.0..1.06..1.0 / 8s，drift ±18px 16s（与 scale 异步）
  const kenBurnsScale = 1.0 + 0.03 * (1 - Math.cos((frame / 240) * Math.PI * 2));
  const kenBurnsDx = Math.sin((frame / 480) * Math.PI * 2) * 18;
  const kenBurnsDy = Math.cos((frame / 480) * Math.PI * 2) * 12;
  const transform = background.animate === "kenBurns"
    ? `scale(${kenBurnsScale.toFixed(4)}) translate(${kenBurnsDx.toFixed(2)}px, ${kenBurnsDy.toFixed(2)}px)`
    : "none";

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundImage: `url(${background.src})`,
            backgroundSize: "cover",
            backgroundPosition: background.position ?? "center",
            backgroundRepeat: "no-repeat",
            opacity: background.opacity ?? 1,
            transform,
            transformOrigin: "center",
            willChange: background.animate ? "transform" : undefined,
          }}
        />
      </div>
      {background.overlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: background.overlay,
            pointerEvents: "none",
          }}
        />
      )}
    </>
  );
};
