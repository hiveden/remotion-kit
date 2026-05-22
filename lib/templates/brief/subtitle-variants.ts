// Subtitle variants. portrait / landscape values let the wrapper apply the
// right size + line-height without if/else.

import type { SubtitleLine } from './types'

// Variant id is a free string so callers can extend with their own presets.
// Built-ins shipped here: 'classic' (karaoke), 'bold' (sentence fade),
// 'lecture' (short-phrase aggregation).
export type SubtitleStyleId = string

/** 字幕底板（科普赛道常用：紧贴字的半透明黑块） */
export interface SubtitleBox {
  background: string;
  padding: string;
  borderRadius?: number;
}

export interface SubtitleVariant {
  fontSize: { portrait: number; landscape: number };
  fontWeight: number;
  letterSpacing: { portrait: string; landscape: string };
  lineHeight: { portrait: number; landscape: number };
  /** CSS -webkit-text-stroke，竖横屏差异化 */
  textStroke?: { portrait: string; landscape: string };
  /** CSS text-shadow */
  textShadow?: string;
  /** 隐藏字间游标 */
  hideCursor?: boolean;
  /** 当前字放大 + 重音色 */
  emphasizeCurrent?: boolean;
  /** 删除中文标点 */
  stripPunctuation?: boolean;
  /** 底板（双胞胎，可独立 undefined。横屏可仅靠现有渐变蒙版） */
  box?: { portrait?: SubtitleBox; landscape?: SubtitleBox };
  /** 字幕动画模式（KaraokeText animationMode） */
  animationMode?: 'karaoke' | 'sentence-fade';
  /** 相邻短字幕聚合策略，适合知识类视频避免 1-2 秒频闪 */
  grouping?: {
    mode: 'semantic-block';
    minDurationSec: number;
    maxDurationSec: number;
    minChars: number;
    maxChars: number;
    maxGapSec: number;
  };
}

/** classic 数值逐一对照当前 hardcode（见 ARCHITECTURE.md §6 对账表） */
export const SUBTITLE_VARIANTS: Record<SubtitleStyleId, SubtitleVariant> = {
  classic: {
    fontSize:      { portrait: 48, landscape: 40 },
    fontWeight:    500,
    letterSpacing: { portrait: '0.06em', landscape: '0.04em' },
    lineHeight:    { portrait: 1.5, landscape: 1.4 },
    textStroke:    undefined,
    textShadow:    undefined,
    hideCursor:    false, // 保留紫色光标
    emphasizeCurrent: false,
    stripPunctuation: false, // 保留原文标点
    animationMode: 'karaoke',
  },
  // bold = 中文科普赛道字幕（罗翔/B 站知识区路线）：
  //   字号略大但视觉重量克制——靠半透明黑底板提供对比度，不靠描边/重音/scale 抢戏
  // 数值依据：三篇实证文章（woshipm + Taption + CapCut）合并：
  //   - 中文每行 15-20 字（taption） / ≤21 字（woshipm）
  //   - 字幕宽度 75% 屏幕（taption）
  //   - 字号 = maxWidth / 18 字（中位）反推
  bold: {
    fontSize:      { portrait: 56, landscape: 60 },
    fontWeight:    600,         // 700 → 600，配合底板已足够
    letterSpacing: { portrait: '0.06em', landscape: '0.04em' },
    lineHeight:    { portrait: 1.5, landscape: 1.4 },
    textStroke:    undefined,   // 删描边（带货赛道语言，不属知识赛道）
    textShadow:    undefined,   // 底板已提供对比度，无需阴影
    hideCursor:    true,        // 不画字间光标
    emphasizeCurrent: false,    // 删紫色当前字 + scale（避免抢戏）
    stripPunctuation: true,     // 删中文标点
    box: {
      portrait: {
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '10px 24px',
        borderRadius: 8,
      },
      // 横屏已有 SUBTITLE_GRADIENT 渐变蒙版，不再叠底板
      landscape: undefined,
    },
    // 砍 karaoke 换整句 fade（学术：渐进刺激→认知冗余、知识赛道头部账号几乎全用整句）
    animationMode: 'sentence-fade',
  },
  // lecture = 知识类横屏/教程字幕：不按 TTS 小切片闪烁，而是聚成语义块。
  // 重点是给观众一个完整知识断句，不做逐字高亮，不删标点。
  lecture: {
    fontSize:      { portrait: 52, landscape: 54 },
    fontWeight:    600,
    letterSpacing: { portrait: '0.03em', landscape: '0.02em' },
    lineHeight:    { portrait: 1.45, landscape: 1.32 },
    textStroke:    undefined,
    textShadow:    undefined,
    hideCursor:    true,
    emphasizeCurrent: false,
    stripPunctuation: false,
    box: {
      portrait: {
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '10px 24px',
        borderRadius: 8,
      },
      landscape: undefined,
    },
    animationMode: 'sentence-fade',
    grouping: {
      mode: 'semantic-block',
      minDurationSec: 2.5,
      maxDurationSec: 5.8,
      minChars: 18,
      maxChars: 42,
      maxGapSec: 0.45,
    },
  },
};

export function resolveSubtitleVariant(id?: string): SubtitleVariant {
  const key = (id ?? 'lecture') as SubtitleStyleId;
  const variant = SUBTITLE_VARIANTS[key] ?? SUBTITLE_VARIANTS.lecture;
  // SUBTITLE_VARIANTS.lecture is always defined; narrow for strict TS.
  return variant as SubtitleVariant;
}

function hardSentenceEnd(text: string): boolean {
  return /[。？！；;!?]$/.test(text.trim());
}

function compactLength(text: string): number {
  return text.replace(/\s+/g, '').length;
}

function joinSubtitleText(lines: SubtitleLine[]): string {
  return lines.map((line) => line.text.trim()).join('');
}

function makeGroupedLine(lines: SubtitleLine[]): SubtitleLine {
  const first = lines[0]!;
  const last = lines[lines.length - 1]!;
  return {
    id: lines.map((line) => line.id).join('+'),
    text: joinSubtitleText(lines),
    start: first.start,
    end: last.end,
  };
}

function groupSubtitleLines(
  subtitles: SubtitleLine[],
  grouping: NonNullable<SubtitleVariant['grouping']>,
): SubtitleLine[] {
  const groups: SubtitleLine[] = [];
  let current: SubtitleLine[] = [];

  const flush = () => {
    if (current.length === 0) return;
    groups.push(makeGroupedLine(current));
    current = [];
  };

  for (const line of subtitles) {
    if (current.length === 0) {
      current.push(line);
      continue;
    }

    const first = current[0]!;
    const last = current[current.length - 1]!;
    const currentText = joinSubtitleText(current);
    const currentDuration = last.end - first.start;
    const currentChars = compactLength(currentText);
    const gap = line.start - last.end;
    const candidateText = `${currentText}${line.text.trim()}`;
    const candidateDuration = line.end - first.start;
    const candidateChars = compactLength(candidateText);
    const hasEnoughBody = currentDuration >= grouping.minDurationSec || currentChars >= grouping.minChars;
    const canAppend =
      gap <= grouping.maxGapSec &&
      candidateDuration <= grouping.maxDurationSec &&
      candidateChars <= grouping.maxChars;

    if (hasEnoughBody && (hardSentenceEnd(last.text) || !canAppend)) {
      flush();
      current.push(line);
      continue;
    }

    if (!canAppend) {
      flush();
      current.push(line);
      continue;
    }

    current.push(line);
  }

  flush();
  return groups;
}

export function resolveActiveSubtitleLine(
  subtitles: SubtitleLine[] | undefined,
  currentSec: number,
  variant: SubtitleVariant,
): SubtitleLine | null {
  if (!subtitles) return null;
  const lines = variant.grouping ? groupSubtitleLines(subtitles, variant.grouping) : subtitles;
  for (const line of lines) {
    if (currentSec >= line.start && currentSec < line.end) return line;
  }
  return null;
}
