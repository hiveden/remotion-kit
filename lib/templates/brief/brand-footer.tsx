import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { KaraokeText } from "./karaoke-text";
import type { SubtitleLine } from "./types";
import {
  TEXT_HIGH,
  TEXT_LOW,
  TEXT_DISABLED,
  BRAND_PRIMARY,
  FONT_SANS,
} from "./tokens";
import { resolveActiveSubtitleLine, resolveSubtitleVariant } from './subtitle-variants';

interface BrandFooterProps {
  subtitles?: SubtitleLine[];
  subtitleStyle?: string;
}

export const BrandFooter: React.FC<BrandFooterProps> = ({ subtitles, subtitleStyle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps;
  const variant = resolveSubtitleVariant(subtitleStyle);
  const activeLine = resolveActiveSubtitleLine(subtitles, currentSec, variant);

  return (
    <>
      {/* 字幕容器 */}
      <div
        style={{
          marginTop: 36,
          paddingLeft: 32,
          paddingRight: 32,
          minHeight: 160,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        {activeLine && (
          <KaraokeText
            line={activeLine}
            currentSec={currentSec}
            readColor={TEXT_HIGH}
            unreadColor={TEXT_DISABLED}
            cursorColor={BRAND_PRIMARY}
            textStroke={variant.textStroke?.portrait}
            textShadow={variant.textShadow}
            hideCursor={variant.hideCursor}
            emphasizeCurrent={variant.emphasizeCurrent}
            stripPunctuation={variant.stripPunctuation}
            animationMode={variant.animationMode}
            style={{
              fontSize: variant.fontSize.portrait,
              fontWeight: variant.fontWeight,
              lineHeight: variant.lineHeight.portrait,
              textAlign: "center",
              display: "block",
              maxWidth: 810, // 75% 屏宽 (1080 × 0.75)，三篇实证规则一致
              letterSpacing: variant.letterSpacing.portrait,
              fontFamily: FONT_SANS,
              ...(variant.box?.portrait && {
                background: variant.box.portrait.background,
                padding: variant.box.portrait.padding,
                borderRadius: variant.box.portrait.borderRadius,
              }),
            }}
          />
        )}
      </div>

      {/* 品牌 Logo */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: BRAND_PRIMARY,
              fontFamily: "'Geist Mono', 'SF Mono', monospace",
            }}
          >
            &gt;_
          </span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: TEXT_LOW,
              fontFamily: FONT_SANS,
              letterSpacing: "0.15em",
            }}
          >
            工具人研究所
          </span>
        </div>
        <span
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: TEXT_DISABLED,
            fontFamily: "'Geist Mono', 'SF Mono', monospace",
            letterSpacing: "0.08em",
          }}
        >
          hiveden.dev
        </span>
      </div>
    </>
  );
};
