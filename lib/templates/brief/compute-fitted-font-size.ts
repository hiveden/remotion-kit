/**
 * computeFittedFontSize — 纯函数版字号自适应
 *
 * 与 useFittedFontSize hook 等价，但不依赖 useState / useEffect。
 * 直接同步调用 fitText（@remotion/layout-utils），适合在 render 期间使用。
 *
 * 优势：无首帧延迟（hook 版 useEffect 导致首帧用 maxFontSize）。
 * 前提：Remotion Chromium 渲染环境（fitText 需要 DOM 测量）。
 */
import { fitText } from '@remotion/layout-utils'
import type { UseFittedFontSizeOptions } from './use-fitted-font-size'

export function computeFittedFontSize(opts: UseFittedFontSizeOptions): number {
  const max = opts.maxFontSize ?? 60
  const min = opts.minFontSize ?? 24

  try {
    const result = fitText({
      text: opts.text,
      withinWidth: opts.withinWidth,
      fontFamily: opts.fontFamily ?? 'PingFang SC',
      fontWeight: String(opts.fontWeight ?? '600'),
      letterSpacing: opts.letterSpacing ?? '0',
      validateFontIsLoaded: true,
    })
    return Math.max(min, Math.min(max, result.fontSize))
  } catch {
    // 字体未加载完成或环境不支持时，保持 maxFontSize
    return max
  }
}
