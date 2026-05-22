/**
 * tech-brief / useFittedFontSize
 *
 * Sprint 2 PR #6 — 响应式字号 hook（基于 @remotion/layout-utils.fitText）
 *
 * 设计依据：ADR-003 §Decision + .planning/research/.../04-orientation-responsive.md §2
 *   竖屏 1080 与横屏 1920 宽差 ×1.78、高度几乎相等。固定字号阶梯在两种朝向下
 *   要么竖屏字号偏小、要么横屏标题溢出 —— `fitText` 让同一段文字在不同容器宽度
 *   自动缩到合适字号。
 *
 * 用法：
 *   const fontSize = useFittedFontSize({
 *     text: segment.topic,
 *     withinWidth: 1700,        // 容器内可用宽度（横屏内容区为 1700，竖屏 1000）
 *     maxFontSize: 36,          // 上限：短标题保持原硬编码字号，避免单字过大
 *     minFontSize: 20,          // 下限：长标题不至于缩到看不清
 *     fontFamily: 'PingFang SC',
 *     fontWeight: '600',
 *   });
 *   return <div style={{ fontSize }}>{segment.topic}</div>;
 *
 * 注意：
 *   - `fitText` 是 browser-only API，必须放 useEffect 异步调用，不能在 render
 *     同步执行（Remotion 渲染器是 Headless Chromium，所以视频渲染时 OK）。
 *   - useEffect 异步特性意味着首帧字号是 maxFontSize，第二帧才落到 fit 字号。
 *     视频渲染时这个差异在 1 帧之内（≈33ms），SSIM 阈值内可忽略。
 *   - `validateFontIsLoaded: true` 会用 fallback 字体重测一次比对，字体未加载完
 *     时直接抛错，避免拿到错误尺寸。
 */
import { useEffect, useState } from 'react';
import { fitText } from '@remotion/layout-utils';

export interface UseFittedFontSizeOptions {
  /** 待测文本（变化时会重算） */
  text: string;
  /** 容器宽度（px） */
  withinWidth: number;
  /** 字号上限（px）。短文本保持此字号不放大。默认 60。 */
  maxFontSize?: number;
  /** 字号下限（px）。极长文本不至于缩到看不清。默认 24。 */
  minFontSize?: number;
  /** 字体族。默认 'PingFang SC'（与 FONT_SANS 主字体对齐）。 */
  fontFamily?: string;
  /** 字重。默认 '600'。 */
  fontWeight?: string | number;
  /** 字距。默认 '0'。 */
  letterSpacing?: string;
}

/**
 * @deprecated Use `VisualProps.fitted` injected via ShotWrapper render prop,
 * or import `computeFittedFontSize` for a synchronous non-hook alternative.
 * Kept for legacy episodes during codemod migration (A2).
 */
export function useFittedFontSize(opts: UseFittedFontSizeOptions): number {
  const initial = opts.maxFontSize ?? 60;
  const [fontSize, setFontSize] = useState<number>(initial);

  useEffect(() => {
    // fitText 同步函数，但只能在浏览器环境跑
    let cancelled = false;
    try {
      const result = fitText({
        text: opts.text,
        withinWidth: opts.withinWidth,
        fontFamily: opts.fontFamily ?? 'PingFang SC',
        fontWeight: String(opts.fontWeight ?? '600'),
        letterSpacing: opts.letterSpacing ?? '0',
        validateFontIsLoaded: true,
      });
      if (cancelled) return;
      const max = opts.maxFontSize ?? 999;
      const min = opts.minFontSize ?? 24;
      const clamped = Math.max(min, Math.min(max, result.fontSize));
      setFontSize(clamped);
    } catch (err) {
      // 字体未加载完成或环境不支持时，保持 maxFontSize
      // 不抛错以免阻断渲染流水线
      // eslint-disable-next-line no-console
      console.warn('[useFittedFontSize] fitText failed, falling back to max:', err);
    }
    return () => {
      cancelled = true;
    };
  }, [
    opts.text,
    opts.withinWidth,
    opts.fontFamily,
    opts.fontWeight,
    opts.letterSpacing,
    opts.maxFontSize,
    opts.minFontSize,
  ]);

  return fontSize;
}
