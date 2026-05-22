import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SubtitleLine } from "./types";

// Strip trailing punctuation so karaoke fills don't leave a lone "。".
function cleanSubtitleText(input: string): string {
  return input.replace(/[，。！？、…—,.!?;:\s]+$/u, "")
}

export interface KaraokeTextProps {
  /** 传入当前要渲染的一句话的数据 */
  line: SubtitleLine;
  /**
   * 当前时间（秒），必须是相对于这行字幕所属环境的**局部时间**。
   * 如果外部不传，则默认取当前的 frame / fps。
   */
  currentSec?: number;
  /** 已读文字颜色 */
  readColor?: string;
  /** 未读文字颜色 */
  unreadColor?: string;
  /** 光标颜色 */
  cursorColor?: string;
  /** 其他可覆盖的通用文字样式 */
  style?: React.CSSProperties;
  /** CSS -webkit-text-stroke，如 "2px #000" */
  textStroke?: string;
  /** CSS text-shadow，如 "0 2px 4px rgba(0,0,0,0.5)" */
  textShadow?: string;
  /**
   * 隐藏字间游标。默认 false（兼容老风格）。
   * 调研结论：光标是 Typewriter 风格标志，不是 Karaoke 标志，主流 talking-head 字幕不画光标。
   */
  hideCursor?: boolean;
  /**
   * 当前正在读的字做强调（scale 1.08 + 加重色）。默认 false。
   * 主流 2026 talking-head 用法：单纯换色不够，配合当前字微放大 + 重音色。
   */
  emphasizeCurrent?: boolean;
  /**
   * 删除中文标点（。？！，、；：），符合中文短视频字幕主流规范。
   * 默认 false（保留原文）。
   */
  stripPunctuation?: boolean;
  /**
   * 字幕动画模式（默认 karaoke 兼容老调用方）：
   *   - 'karaoke'        逐字推进（已读/未读双色），适合带货/卡点赛道
   *   - 'sentence-fade'  整句白字 + 进出 fade，适合科普/知识赛道（学术证据：
   *                      渐进刺激造成认知冗余，对学习是负迁移）
   * sentence-fade 时所有 karaoke 配套（hideCursor/emphasizeCurrent）失效。
   */
  animationMode?: 'karaoke' | 'sentence-fade';
}

/**
 * 把 textStroke "Wpx #color" 展开为 8 向 text-shadow，可叠加额外阴影。
 * 中文方块字对 -webkit-text-stroke 兼容差，用多向 shadow 模拟。
 */
function composeStrokeShadow(stroke?: string, extraShadow?: string): string | undefined {
  const parts: string[] = [];
  if (stroke) {
    const m = stroke.match(/^(\d+)\s*px\s+(.+)$/i);
    if (m) {
      const w = `${m[1] ?? ''}px`;
      const c = (m[2] ?? '').trim();
      // 8 方向（4 对角 + 4 主轴）
      parts.push(
        `-${w} -${w} 0 ${c}`,
        `${w} -${w} 0 ${c}`,
        `-${w} ${w} 0 ${c}`,
        `${w} ${w} 0 ${c}`,
        `0 -${w} 0 ${c}`,
        `0 ${w} 0 ${c}`,
        `-${w} 0 0 ${c}`,
        `${w} 0 0 ${c}`,
      );
    }
  }
  if (extraShadow) parts.push(extraShadow);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * 纯粹的字幕动画渲染引擎。
 * 无默认布局定位。只负责拆分和变色。
 */
export const KaraokeText: React.FC<KaraokeTextProps> = ({
  line,
  currentSec,
  readColor = "#FAFAFA",
  unreadColor = "#52525B",
  cursorColor = "#A855F7",
  style,
  textStroke,
  textShadow,
  hideCursor = false,
  emphasizeCurrent = false,
  stripPunctuation = false,
  animationMode = 'karaoke',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 如果没有外部传入 currentSec，则自己计算（假设在 Sequence 内就是准确的）
  const t = currentSec !== undefined ? currentSec : frame / fps;

  const text = stripPunctuation ? cleanSubtitleText(line.text) : line.text;

  // 中文方块字用 -webkit-text-stroke 在 Chromium headless 下经常渲染空心/锯齿，
  // 改用 text-shadow 8 向叠加模拟描边——这是剪映/CapCut 等中文短视频引擎的标准做法。
  const composedShadow = composeStrokeShadow(textStroke, textShadow);
  const strokeShadowStyle: React.CSSProperties = composedShadow
    ? { textShadow: composedShadow }
    : {};

  // ──────────── sentence-fade 模式（科普/知识赛道）────────────
  // 整句白字一次性显示 + 进出 fade。砍掉 karaoke 的所有花哨，把"何时显示"
  // 还给行级时间戳（line.start/end），不假装字符级精度。
  if (animationMode === 'sentence-fade') {
    const FADE_FRAMES = 8; // 30fps ≈ 267ms
    const lineStartFrame = line.start * fps;
    const lineEndFrame = line.end * fps;

    // 防御上游脏数据：start >= end 或极短句会导致 [a,b,b,c] 撞值，
    // Remotion interpolate 要求 inputRange 严格单调递增。这里逐段夹紧。
    const EPS = 0.001;
    const safeEnd = Math.max(lineEndFrame, lineStartFrame + EPS * 3);
    const rawFadeInEnd = lineStartFrame + FADE_FRAMES;
    const rawFadeOutStart = safeEnd - FADE_FRAMES;
    // 强制 fadeInEnd < fadeOutStart < safeEnd，且都 > lineStartFrame
    const fadeInEnd = Math.min(rawFadeInEnd, safeEnd - EPS * 2);
    const fadeOutStart = Math.max(fadeInEnd + EPS, rawFadeOutStart);
    const finalEnd = Math.max(fadeOutStart + EPS, safeEnd);
    const inputRange = [lineStartFrame, fadeInEnd, fadeOutStart, finalEnd];

    if (process.env.NODE_ENV !== 'production') {
      for (let i = 1; i < inputRange.length; i++) {
        if ((inputRange[i] ?? 0) <= (inputRange[i - 1] ?? 0)) {
          // 理论上夹紧后不会到这里；走到这里说明上游数据极端异常
          // eslint-disable-next-line no-console
          console.warn(
            '[KaraokeText] sentence-fade inputRange 未严格单调（已夹紧但仍冲突）',
            { line, inputRange },
          );
          break;
        }
      }
    }

    const opacity = interpolate(frame, inputRange, [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return (
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          opacity,
          ...style,
          ...strokeShadowStyle,
        }}
      >
        <span style={{ color: readColor }}>{text}</span>
      </div>
    );
  }

  // 1. 如果还没开始读，显示未读状态，光标隐藏
  if (t < line.start) {
    return (
      <div style={{ position: "relative", display: "inline-block", ...style, ...strokeShadowStyle }}>
        <span style={{ color: unreadColor }}>{text}</span>
      </div>
    );
  }

  // 2. 如果已经读完了，显示全读状态，光标隐藏
  if (t >= line.end) {
    return (
      <div style={{ position: "relative", display: "inline-block", ...style, ...strokeShadowStyle }}>
        <span style={{ color: readColor }}>{text}</span>
      </div>
    );
  }

  // 3. 正在读：使用线性插值计算进度 (伪卡拉OK效果核心)
  const progress = interpolate(t, [line.start, line.end], [0, 1], {
    extrapolateRight: "clamp",
  });

  const revealCount = Math.floor(progress * text.length);

  // 拆三段：已读（不含当前字）+ 当前字 + 未读
  // 当前字 = 正在被推进的那个字符。用于 emphasizeCurrent。
  // emphasizeCurrent=false 时退化成两段（已读 + 未读），与升级前等价。
  const readBeforeCurrent = emphasizeCurrent
    ? text.slice(0, Math.max(0, revealCount - 1))
    : text.slice(0, revealCount);
  const currentChar = emphasizeCurrent ? text.charAt(Math.max(0, revealCount - 1)) : "";
  const unrevealedText = text.slice(revealCount);

  // 光标闪烁
  const cursorOpacity = Math.sin(t * Math.PI * 4) > 0 ? 1 : 0.4;
  const cursorWidth = "2px";
  const cursorHeight = "0.9em";

  return (
    <div style={{ position: "relative", display: "inline-block", ...style, ...strokeShadowStyle }}>
      {/* 已读（不含当前字） */}
      <span style={{ color: readColor }}>{readBeforeCurrent}</span>

      {/* 当前字（仅 emphasizeCurrent=true 时单独 wrap）
          中文方块字对放大敏感，幅度从 1.08 → 1.03（≈大字号下 2-3px 视觉差）
          颜色变化承担主要"突出"职责，scale 仅做次级强化 */}
      {emphasizeCurrent && currentChar && (
        <span
          style={{
            color: cursorColor,
            display: "inline-block",
            transform: "scale(1.03)",
            transformOrigin: "center bottom",
          }}
        >
          {currentChar}
        </span>
      )}

      {/* 闪烁光标（仅 hideCursor=false 时画） */}
      {!hideCursor && (
        <span
          style={{
            display: "inline-block",
            width: cursorWidth,
            height: cursorHeight,
            backgroundColor: cursorColor,
            opacity: cursorOpacity,
            verticalAlign: "middle",
            margin: "0 2px",
            position: "relative",
            top: "-0.05em",
          }}
        />
      )}

      {/* 未读 */}
      <span style={{ color: unreadColor }}>{unrevealedText}</span>
    </div>
  );
};
