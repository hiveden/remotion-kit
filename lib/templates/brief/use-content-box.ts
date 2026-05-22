/**
 * tech-brief / useContentBox
 *
 * Sprint 2 PR #5 — 业务画布尺寸抽象 hook。
 *
 * 设计承诺（ADR-003 §Decision 关键约束 1）：
 *   业务画布从"1080×920 硬编码"改为"useContentBox() 注入的 {width, height}"——
 *   业务**不知道**横还是竖，只知道画布有多大。
 *
 * 路由策略（width > height 区分朝向）：
 *   - portrait  (1080×2060): width=1080 height=920  origin=(0,480) — CONTENT 段，字幕在独立 FOOTER 不叠加
 *   - landscape (1920×1080): width=1920 height=1080 origin=(0,0)   — 全屏"风格 A"，字幕**叠加底部 120px**
 *
 * ⚠️ 横屏字幕"叠加"特性：
 *   业务画布 height=1080 全屏，但底部 120px 被字幕渐变带覆盖。
 *   放 Conclusion / CTA / 底部 footer 类元素时用 **safeHeight**（= height - subtitleBandHeight）
 *   避免和字幕文字重叠。竖屏 safeHeight === height（字幕不叠）。
 *
 * 业务零横竖屏 if/else：两种朝向都用 safeHeight 定"主区底部"。
 */
import { useVideoConfig } from 'remotion';

/** 横屏字幕叠加带高度（和 landscape/layout.ts SUBTITLE_BAND_HEIGHT 对齐） */
const LANDSCAPE_SUBTITLE_BAND = 120;
/** 横屏顶部装饰带高度（品牌条 + 紫线 + 缓冲，和 landscape/layout.ts TOP_BAND_HEIGHT 对齐） */
const LANDSCAPE_TOP_BAND = 100;

export interface ContentBox {
  /** 业务画布可用宽（px） */
  width: number;
  /** 业务画布可用高（px）——全高含可能的叠加装饰 */
  height: number;
  /**
   * 业务"安全主区"高（px）——**已同时扣除顶部装饰 + 底部字幕叠加带**。
   * - portrait: === height（上下皆无叠加装饰）
   * - landscape: === height - topBandHeight - subtitleBandHeight
   *
   * 业务元素 **用 safeTop 做起点 + safeHeight 做主区高**，横竖屏同一套代码。
   */
  safeHeight: number;
  /**
   * 业务"安全主区"顶部 y（相对画布，px）——业务放 `top:` 元素应 ≥ safeTop，否则被顶部装饰盖。
   * - portrait: 0
   * - landscape: topBandHeight (100)
   */
  safeTop: number;
  /**
   * 顶部装饰带高度（px）——品牌条 + 仪式细线。信息性字段。
   * - portrait: 0
   * - landscape: 100
   */
  topBandHeight: number;
  /**
   * 底部字幕叠加带高度（px）——信息性字段。
   * - portrait: 0（字幕在独立 FOOTER）
   * - landscape: 120（底部渐变带）
   */
  subtitleBandHeight: number;
  /** 业务画布在 Composition 内的左上角（px） */
  origin: { x: number; y: number };
}

const PORTRAIT_BOX: ContentBox = {
  width: 1080,
  height: 920,
  safeHeight: 920,
  safeTop: 0,
  topBandHeight: 0,
  subtitleBandHeight: 0,
  origin: { x: 0, y: 480 },
};

const LANDSCAPE_BOX: ContentBox = {
  width: 1920,
  height: 1080,
  safeHeight: 1080 - LANDSCAPE_TOP_BAND - LANDSCAPE_SUBTITLE_BAND,
  safeTop: LANDSCAPE_TOP_BAND,
  topBandHeight: LANDSCAPE_TOP_BAND,
  subtitleBandHeight: LANDSCAPE_SUBTITLE_BAND,
  origin: { x: 0, y: 0 },
};

/**
 * @deprecated Use `VisualProps.box` injected via ShotWrapper render prop.
 * Kept for legacy episodes during codemod migration (A2).
 */
export function useContentBox(): ContentBox {
  const { width, height } = useVideoConfig();
  return width > height ? LANDSCAPE_BOX : PORTRAIT_BOX;
}
