// lib/templates/brief/portrait-layout.ts
//
// Portrait 1080×2060 canvas + region constants for the brief template.
//
// CONTENT is fixed at 920 (the safe area, aligned to y:480-1400). Remaining
// 1140 is split 42:58 between Header:Footer → 479 / 661. These are the
// shipping numbers for the brief template; if the canvas size ever changes,
// adjust CANVAS_H and the rest derives.

/** Portrait canvas width. */
export const CANVAS_W = 1080
/** Portrait canvas height. */
export const CANVAS_H = 2060

/** 内容安全区高度 — 业务画布高度，固定 920（CLAUDE.md y:480-1400） */
export const CONTENT_HEIGHT = 920;

/**
 * Header / Footer 高度按"剩余 42:58 分配"——与 ThreePartLayoutV2 历史行为完全一致。
 * 1080×2060 下：HEADER=479, FOOTER=661。
 */
const REMAINING = CANVAS_H - CONTENT_HEIGHT; // 1140
export const HEADER_HEIGHT = Math.round(REMAINING * 0.42); // 479
export const FOOTER_HEIGHT = CANVAS_H - HEADER_HEIGHT - CONTENT_HEIGHT; // 661

/** Content 区在 Composition 内的 top（= HEADER_HEIGHT） */
export const CONTENT_TOP = HEADER_HEIGHT;
/** Footer 区 top */
export const FOOTER_TOP = HEADER_HEIGHT + CONTENT_HEIGHT;

/** 分隔线左右安全距 */
export const DIVIDER_INSET_X = 60;
