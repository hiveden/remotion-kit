// lib/templates/shared/cover-frame.tsx
//
// Generic cover frame component. Renders fully at frame 0 to double as a
// thumbnail. Auto-adapts portrait (1080×2060) and landscape (1920×1080).
//
// Portrait safe area: x:60-900, y:420-1300
// Landscape safe area: x:320-1600, y:180-900
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const ACCENT = "#A855F7";
const TEXT_PRIMARY = "#FAFAFA";
const TEXT_SECONDARY = "#A1A1AA";
const TEXT_TERTIARY = "#71717A";
const TEXT_GHOST = "#52525B";
const BG = "#09090B";
const MONO = "'Geist Mono', 'SF Mono', monospace";
const SANS = "'PingFang SC', 'Noto Sans SC', 'Inter', sans-serif";

export interface CoverFrameProps {
  /** 期刊编号，如 "REPORT · 2026.03" 或 "EP.08" */
  label: string;
  /** 日期或补充信息，如 "2026.03.16-21 采集" */
  date?: string;
  /** 主标题 */
  title: string;
  /** 副标题/描述 */
  subtitle?: string;
  /** 数据指标（最多 3 个） */
  metrics?: { value: string; label: string; color?: string }[];
  /** 底部标签，如 "PROMPT CACHING" 或 "AI 应用开发岗" */
  tag?: string;
  /** 封面持续帧数 */
  durationInFrames: number;
  /**
   * 系列副色：子系列差异化点缀。设了之后会在两处出现：
   *   1. 顶部紫线下方 4px 处一段 240px 蓝色短线
   *   2. 左上 label 前面一个 14×14 蓝色方块
   * 不传则行为不变（向后兼容 brief02-04 / run01）。
   */
  secondaryAccent?: string;
}

export const CoverFrame: React.FC<CoverFrameProps> = ({
  label,
  date,
  title,
  subtitle,
  metrics,
  tag,
  durationInFrames,
  secondaryAccent,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isLandscape = width > height;

  // 最后 15 帧淡出（仅在持续时间 > 15 帧时生效）
  const fadeOut = durationInFrames > 15
    ? interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

  // 根据画布方向选择安全区和字号（DESIGN.md 封面模板规范）
  const safe = isLandscape
    ? { top: 180, left: 320, w: 1280, h: 720 }  // B站横屏
    : { top: 420, left: 60, w: 840, h: 880 };    // 竖屏

  const sz = isLandscape
    ? { label: 28, date: 24, title: 96, desc: 36, metricVal: 64, metricLabel: 24, brand: 28, brandName: 24, tag: 20 }
    : { label: 36, date: 32, title: 96, desc: 40, metricVal: 64, metricLabel: 32, brand: 32, brandName: 28, tag: 28 };

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* 顶部紫线 */}
      <div style={{ position: "absolute", top: 0, left: 0, width, height: 2, background: ACCENT, opacity: 0.6 }} />

      {/* 系列副色：顶部紫线下方一段短线（左对齐安全区） */}
      {secondaryAccent && (
        <div
          style={{
            position: "absolute",
            top: 6,
            left: safe.left,
            width: 240,
            height: 2,
            background: secondaryAccent,
            opacity: 0.85,
          }}
        />
      )}

      {/* 安全区内容 */}
      <div
        style={{
          position: "absolute",
          top: safe.top,
          left: safe.left,
          width: safe.w,
          height: safe.h,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          opacity: fadeOut,
        }}
      >
        {/* 上部：期刊编号 + 日期 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            {secondaryAccent && (
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 14,
                  background: secondaryAccent,
                }}
              />
            )}
            <span style={{ fontSize: sz.label, fontWeight: 500, color: ACCENT, fontFamily: MONO, letterSpacing: 2 }}>
              {label}
            </span>
          </span>
          {date && (
            <span style={{ fontSize: sz.date, fontWeight: 400, color: TEXT_TERTIARY, fontFamily: MONO, letterSpacing: 1 }}>
              {date}
            </span>
          )}
        </div>

        {/* 中部：标题 + 分隔线 + 副标题 */}
        <div style={{ display: "flex", flexDirection: "column", gap: isLandscape ? 20 : 24 }}>
          <div style={{ fontSize: sz.title, fontWeight: 800, color: TEXT_PRIMARY, lineHeight: 1.15, fontFamily: SANS }}>
            {title}
          </div>
          <div style={{ width: 64, height: 2, background: ACCENT }} />
          {subtitle && (
            <div style={{ fontSize: sz.desc, fontWeight: 400, color: TEXT_SECONDARY, lineHeight: 1.5 }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* 数据指标区 — 横屏横排，竖屏纵排 */}
        {metrics && metrics.length > 0 && (
          <div style={{ display: "flex", flexDirection: isLandscape ? "row" : "column", gap: isLandscape ? 48 : 20 }}>
            {metrics.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: isLandscape ? 8 : 12 }}>
                <span style={{ fontSize: sz.metricVal, fontWeight: 800, color: m.color || ACCENT, fontFamily: MONO }}>
                  {m.value}
                </span>
                <span style={{ fontSize: sz.metricLabel, fontWeight: 500, color: TEXT_TERTIARY }}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 底部：品牌 + 标签 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: sz.brand, fontWeight: 700, color: ACCENT, fontFamily: MONO }}>&gt;_</span>
            <span style={{ fontSize: sz.brandName, fontWeight: 500, color: TEXT_TERTIARY, letterSpacing: 2 }}>工具人研究所</span>
          </div>
          {tag && (
            <span style={{ fontSize: sz.tag, fontWeight: 500, color: TEXT_GHOST, fontFamily: MONO, letterSpacing: 3 }}>
              {tag}
            </span>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
