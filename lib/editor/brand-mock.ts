// packages/video-gui/lib/editor/brand-mock.ts
//
// Brand schema mock data。Project 层共享配置，运行时填充 Clip Template / Editor Template
// 的 brand.xxx 占位符。详见 docs/refactor-plan/2026-05-17-pattern-cliptemplate-layering.md。

export interface Brand {
  id: string
  name: string                            // "工具人研究所"
  logo: {
    type: 'text' | 'image'
    text?: string                         // 文字 logo，如 ">_ 工具人研究所"
    imagePath?: string                    // 图片 logo 路径
  }
  colors: {
    primary: string                       // 替代 BRAND_PRIMARY
    secondary?: string                    // 替代 secondaryAccent
    background?: string
  }
  fonts?: {
    heading?: string                      // 默认 'Geist'
    body?: string                         // 默认 'PingFang SC'
    mono?: string                         // 默认 'Geist Mono'
  }
  defaultTag?: string                     // 'BRIEF'
}

// ─── 默认 brand fixture（baseline） ──────────────────────

export const DEFAULT_BRAND: Brand = {
  id: 'default',
  name: '工具人研究所',
  logo: {
    type: 'text',
    text: '工具人研究所',
  },
  colors: {
    primary: '#A855F7',
    secondary: '#3B82F6',
  },
  fonts: {
    heading: 'Geist',
    body: 'PingFang SC',
    mono: 'Geist Mono',
  },
  defaultTag: 'BRIEF',
}

// ─── 多 brand 供切换演示 ─────────────────────────────────

export const BRANDS: Brand[] = [
  DEFAULT_BRAND,
  {
    id: 'ml-track',
    name: 'ML 系列',
    logo: { type: 'text', text: 'ML 系列' },
    colors: {
      primary: '#3B82F6',                 // 蓝色为主
      secondary: '#10B981',
    },
    fonts: {
      heading: 'Geist',
      body: 'PingFang SC',
      mono: 'Geist Mono',
    },
    defaultTag: 'ML',
  },
  {
    id: 'tutorial',
    name: '教程系列',
    logo: { type: 'text', text: '教程频道' },
    colors: {
      primary: '#F59E0B',                 // 橙色
      secondary: '#EF4444',
    },
    defaultTag: 'TUTORIAL',
  },
]
