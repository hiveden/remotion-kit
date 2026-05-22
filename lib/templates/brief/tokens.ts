/**
 * tech-brief / tokens.ts
 *
 * 与方向无关的设计 token：颜色、字体、纹理参数、通用尺寸。
 * portrait/ 与 landscape/ 双胞胎共享这一份 source of truth。
 *
 * Sprint 2 PR #5 抽取自 layout-constants.ts。
 *
 * 设计语言：Research Brief（DESIGN.md）
 * - 深色底 #09090B + 紫色强调 #A855F7 + 灰度层级
 * - 字体三栈：Geist (标题) / Geist Mono (数字、代码、品牌) / PingFang SC (中文正文)
 *
 * 使用规约（参见 ADR-004 §pattern-library）：
 *   patterns/、visuals/、portrait/、landscape/ 都必须从这里取颜色/字体，
 *   严禁硬编码 #A855F7 / 'Geist Mono' 等。
 */

// ============================================================
// 背景色
// ============================================================

/** 全局底色（DESIGN.md: bg #09090B） */
export const BG_BASE = "#09090B";

/** Header 背景（微妙层次，不用渐变光晕） */
export const METALLIC_HEADER_BG = `linear-gradient(180deg, #131316 0%, #0f0f12 50%, #09090B 100%)`;

/** Footer 背景（与 Header 对称） */
export const METALLIC_FOOTER_BG = `linear-gradient(180deg, #09090B 0%, #0f0f12 50%, #131316 100%)`;

/** Header 顶部微光泽（极克制） */
export const METALLIC_SHEEN = `radial-gradient(ellipse 60% 25% at 50% 12%, rgba(255,255,255,0.02) 0%, transparent 70%)`;

// ============================================================
// 品牌色（DESIGN.md: accent #A855F7）
// ============================================================

/** 主品牌色 — 紫色 */
export const BRAND_PRIMARY = "#A855F7";

/** 品牌色低透明度 — 用于辉光 */
export const BRAND_GLOW = "rgba(168, 85, 247, 0.25)";

/** 品牌色极低透明度 */
export const BRAND_SUBTLE = "rgba(168, 85, 247, 0.06)";

/** 分隔线 — 品牌色微辉光 */
export const DIVIDER_GRADIENT = `linear-gradient(90deg, transparent 10%, rgba(168,85,247,0.12) 35%, rgba(168,85,247,0.20) 50%, rgba(168,85,247,0.12) 65%, transparent 90%)`;

// ============================================================
// 文字色彩层级（DESIGN.md token）
// ============================================================

/** text-primary — 标题、核心数据 */
export const TEXT_HIGH = "#FAFAFA";

/** text-secondary — 副标题、描述 */
export const TEXT_MEDIUM = "#A1A1AA";

/** text-tertiary — 标签、品牌名、日期 */
export const TEXT_LOW = "#71717A";

/** text-ghost — 仅用于非文字元素（分隔线、箭头）/ 字幕未读 */
export const TEXT_DISABLED = "#52525B";

// ============================================================
// 字体栈
// ============================================================

export const FONT_SANS = "'PingFang SC', 'Noto Sans SC', 'Inter', sans-serif";
export const FONT_MONO = "'Geist Mono', 'SF Mono', monospace";
export const FONT_GEIST = "'Geist', 'Inter', sans-serif";

// ============================================================
// Noise 纹理参数（portrait/landscape 共用）
// ============================================================

/** 纹理 PNG 路径（相对 public/，由 staticFile() 加载） */
export const NOISE_TEXTURE_FILE = "textures/noise-512.png";

/** 纹理瓦片尺寸 */
export const NOISE_TILE_SIZE = 512;

/** 纹理叠加透明度 */
export const NOISE_OPACITY = 0.04;

/** 纹理混合模式 */
export const NOISE_BLEND_MODE = "overlay" as const;

// ============================================================
// 字号阶梯（语义化命名，避免业务硬编码）
//
// 动态文本（chapter title / segment topic 等）使用 `useFittedFontSize()` 在
// 容器宽度内自动缩放，FS_* 常量退化为：
//   - 短文本的"基线 / 上限"（fit 不会超过这个值）
//   - 固定 UI 文本（logo、>_、域名）的真值
// 故名字号字面值保持与之前一致，确保短标题视觉零变化。
// ============================================================

/** 顶栏品牌/系列标签字号（固定 UI） */
export const FS_BRAND_LABEL = 24;
/** 页眉日期/topic 字号（固定 UI，三段式状态栏） */
export const FS_HEADER_META = 24;
/** 页眉章节大标题字号上限（动态：useFittedFontSize 上限，长标题自动缩小） */
export const FS_CHAPTER_TITLE = 36;
/** Hook 段封面 topic 字号上限（动态：useFittedFontSize 上限） */
export const FS_HOOK_TOPIC = 40;
/** 字幕字号（横竖屏目前一致：48） */
export const FS_SUBTITLE = 48;
/** 横屏字幕字号（参考 .landscape-design-reference 风格 A：40） */
export const FS_SUBTITLE_LANDSCAPE = 40;
/** 横屏顶栏右侧章节副标题字号上限（动态：useFittedFontSize 上限） */
export const FS_LANDSCAPE_TOP_TITLE = 22;
/** Footer Logo（中文部分） */
export const FS_FOOTER_LOGO = 28;
/** Footer Logo (>_) */
export const FS_FOOTER_LOGO_PROMPT = 22;
/** Footer 域名 */
export const FS_FOOTER_DOMAIN = 20;

/** 章节标题字号下限（动态字号缩到此值就停） */
export const FS_CHAPTER_TITLE_MIN = 24;
/** Hook topic 字号下限 */
export const FS_HOOK_TOPIC_MIN = 28;
/** 横屏顶栏副标题字号下限 */
export const FS_LANDSCAPE_TOP_TITLE_MIN = 16;

// ============================================================
// 通用 padding / 边距
// ============================================================

/** 页眉左右安全边距（竖屏） */
export const HEADER_PADDING_X = 60;
/** 页眉底部 padding */
export const HEADER_PADDING_BOTTOM = 32;
/** Footer 字幕左右 padding */
export const FOOTER_SUBTITLE_PADDING_X = 32;

// ============================================================
// 缓动 / 动画曲线
// ============================================================

/** 章节标题淡入帧数（HeaderContent 使用） */
export const CHAPTER_TITLE_FADE_FRAMES = 12;

// ============================================================
// KNN 系列语义色板（ml 系列专属，与 shot05 录屏视觉延续）
// 不通用——其他系列不要 import 这些 token
// ============================================================

/** 喜欢 / 正例（绿点） */
export const KNN_POSITIVE = "#22C55E";
/** 不喜欢 / 负例（红点） */
export const KNN_NEGATIVE = "#EF4444";
/** 待预测 / 查询点（蓝菱形） */
export const KNN_QUERY = "#3B82F6";
/** 最近邻强调虚线（黄） */
export const KNN_NEAREST = "#FBBF24";
/** 其它 / 灰虚线（复用 TEXT_DISABLED） */
export const KNN_OTHER = "#52525B";

// ============================================================
// Linear Regression 系列语义色板（ml-linreg 专属）
// ============================================================

/** 训练样本 / 已知点 */
export const LINREG_SAMPLE = "#38BDF8";
/** 拟合直线 / 模型平面 */
export const LINREG_LINE = "#F43F5E";
/** 预测点 / 新样本 */
export const LINREG_QUERY = "#FBBF24";
/** 残差平方 / loss */
export const LINREG_RESIDUAL = "#EF4444";
/** 权重 / 参数 */
export const LINREG_WEIGHT = "#22C55E";
