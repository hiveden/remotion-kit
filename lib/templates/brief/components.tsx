import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import {
  BRAND_PRIMARY,
  TEXT_HIGH,
  TEXT_MEDIUM,
  TEXT_LOW,
  FONT_SANS,
  FONT_MONO,
  FONT_GEIST,
  FS_BRAND_LABEL,
  FS_HEADER_META,
  FS_CHAPTER_TITLE,
  FS_CHAPTER_TITLE_MIN,
  FS_HOOK_TOPIC,
  FS_HOOK_TOPIC_MIN,
} from "./tokens";
import { useFittedFontSize } from "./use-fitted-font-size";
import { CoverFrame } from "../shared/cover-frame";
import type { BriefMeta } from "./types";

/**
 * 科技资讯风格：开场大标题/角标 (HeaderHook)
 * 完整还原 Brief02 的设计：
 * 1. 顶部紫色等宽小字标签 (如 "BRIEF · 2026.04")
 * 2. 灰色无衬线大标题 (如 "Ollama MLX")
 */
export const HeaderHook: React.FC<{
  brandLabel: string;
  dateLabel: string;
  topic: string;
}> = ({ brandLabel, dateLabel, topic }) => {
  // Long topic strings are fitted to width to avoid overflow on portrait.
  // Container = 1080 (no padding) − 80 safe inset = 1000.
  const topicFontSize = useFittedFontSize({
    text: topic || "",
    withinWidth: 1000,
    maxFontSize: FS_HOOK_TOPIC,
    minFontSize: FS_HOOK_TOPIC_MIN,
    fontFamily: "PingFang SC",
    fontWeight: "700",
    letterSpacing: "0.06em",
  });

  return (
    <div style={{ textAlign: "center", paddingBottom: 40 }}>
      <div style={{
        fontSize: 28,
        fontWeight: 600,
        color: BRAND_PRIMARY,
        fontFamily: FONT_MONO,
        letterSpacing: "0.1em",
      }}>
        {brandLabel} · {dateLabel}
      </div>
      {topic && (
        <div style={{
          fontSize: topicFontSize,
          fontWeight: 700,
          color: TEXT_MEDIUM,
          fontFamily: FONT_SANS,
          marginTop: 12,
          letterSpacing: "0.06em",
        }}>
          {topic}
        </div>
      )}
    </div>
  );
};

/**
 * 科技资讯风格：内容段落三段式状态栏 (HeaderContent)
 * 完整还原 Brief02 的设计：
 * 1. 三段式顶栏 (品牌名 | 日期 | 核心议题)
 * 2. 带有紫色竖线前缀的、大号近白色的章节副标题，且带 12 帧的淡入动画
 */
export const HeaderContent: React.FC<{
  brandLabel: string;
  dateLabel: string;
  topic: string;
  chapterTitle?: string;
}> = ({ brandLabel, dateLabel, topic, chapterTitle }) => {
  const frame = useCurrentFrame();

  // Sprint 2 PR #6: chapterTitle 用 fitText，避免长章节标题溢出
  // 容器：1080 - 60(padL) - 60(padR) - 20(竖线缩进) - 3(border) ≈ 937，取 920 留余量
  const chapterFontSize = useFittedFontSize({
    text: chapterTitle || "",
    withinWidth: 920,
    maxFontSize: FS_CHAPTER_TITLE,
    minFontSize: FS_CHAPTER_TITLE_MIN,
    fontFamily: "PingFang SC",
    fontWeight: "700",
    letterSpacing: "0.04em",
  });

  return (
    <div style={{ paddingBottom: 32, paddingLeft: 60, paddingRight: 60 }}>
      {/* Line 1: 三段式状态栏 — meta 类固定 UI，保持硬编码 24px */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <span style={{ fontSize: FS_BRAND_LABEL, fontWeight: 600, color: BRAND_PRIMARY, fontFamily: FONT_MONO, letterSpacing: "0.1em" }}>
          {brandLabel}
        </span>
        <span style={{ fontSize: FS_HEADER_META, fontWeight: 500, color: TEXT_LOW, fontFamily: FONT_MONO }}>
          {dateLabel}
        </span>
        <span style={{ fontSize: FS_HEADER_META, fontWeight: 500, color: TEXT_LOW, fontFamily: FONT_SANS, marginLeft: "auto" }}>
          {topic}
        </span>
      </div>

      {/* Line 2: 章节标题 (紫色竖线 + 大号近白字体 + 12帧淡入动画) */}
      {chapterTitle && (
        <div style={{
          marginTop: 16,
          paddingLeft: 20,
          borderLeft: `3px solid ${BRAND_PRIMARY}`,
          opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>
          <span style={{
            fontSize: chapterFontSize,
            fontWeight: 700,
            color: TEXT_HIGH, // #FAFAFA (近白色)
            fontFamily: FONT_SANS,
            letterSpacing: "0.04em",
          }}>
            {chapterTitle}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Default Cover — single entrypoint for all variants. The optional
 * `secondaryAccent` on `meta.cover` lets a variant tint specific elements
 * without forking the cover layout. (purity-allow: variant design note)
 */
export const DefaultCover: React.FC<{ meta: BriefMeta }> = ({ meta }) => (
  <CoverFrame
    label={meta.brandLabel}
    date={meta.dateLabel}
    title={meta.cover.title}
    subtitle={meta.cover.subtitle || ""}
    metrics={meta.cover.metrics || []}
    tag={meta.cover.tag || "资讯"}
    secondaryAccent={meta.cover.secondaryAccent}
    durationInFrames={1}
  />
);

/**
 * 科技资讯风格：核心 CTA 动画组件
 */
export const CoreCTAAnimation: React.FC = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%" }}>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <span style={{ 
          color: BRAND_PRIMARY, 
          fontSize: 80, 
          fontWeight: "bold", 
          fontFamily: FONT_MONO 
        }}>
          &gt;_
        </span>
        <span style={{ 
          color: TEXT_HIGH, 
          fontSize: 60, 
          fontWeight: "bold",
          fontFamily: FONT_GEIST 
        }}>
          工具人研究所
        </span>
      </div>
      <div style={{ 
        color: TEXT_LOW, 
        fontSize: 32, 
        marginTop: 30,
        fontFamily: FONT_SANS,
        letterSpacing: "0.05em",
      }}>
        工程实践 · 选型决策 · 技术洞察
      </div>
    </div>
  );
};
