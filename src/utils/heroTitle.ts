/**
 * 首页大标题（Hero Title）配置
 *
 * - 文案 / 字体 / 字号存 localStorage（newtab 与 options 同源共享，首屏可同步读取，无闪烁）
 * - 通过注入一个置于 style.css 之后的 <style> 覆盖 .font-display 的 !important 规则
 * - 文案按 Unicode 码点计数，天然支持 Emoji（一个 Emoji 记 1 个字符）
 */

import { localFontLoaders } from './localFonts'

export interface HeroTitleConfig {
  /** 标题文案，支持 Emoji */
  text: string
  /** 标题字体预设 id */
  fontId: string
  /** 桌面端字号上限（px），窄屏通过 clamp 自适应缩小 */
  fontSize: number
}

export interface HeroTitleFont {
  id: string
  label: string
  /** CSS font-family 值 */
  fontFamily: string
  /** 需要时注入的 Google Fonts 链接 */
  cssUrl?: string
}

/** 默认文案 */
export const DEFAULT_HERO_TITLE = 'Beyond the tab, ideas take flight.'
/** 文案最大长度（按码点）—— Hero 为大号展示标题，配合 max-w-5xl 容器，过长会溢出换行 */
export const MAX_HERO_TITLE_LENGTH = 60
/** 字号范围（px） */
export const HERO_TITLE_SIZE_MIN = 40
export const HERO_TITLE_SIZE_MAX = 120

const STORAGE_KEY = 'mytab-hero-title'
const STYLE_ID = 'hero-title-style'
const DEFAULT_FONT_ID = 'instrument-serif'
const DEFAULT_SIZE = 96

/** 可选的标题字体预设（衬线 / 无衬线 / 等宽 / 像素 / 中文） */
export const HERO_TITLE_FONTS: HeroTitleFont[] = [
  {
    id: 'instrument-serif',
    label: 'Instrument Serif',
    fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif"
  },
  {
    id: 'system-sans',
    label: '系统无衬线',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
  },
  {
    id: 'noto-serif-sc',
    label: '思源宋体',
    fontFamily: "'Noto Serif SC', serif",
    cssUrl: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap'
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    fontFamily: "'JetBrains Mono', monospace",
    cssUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap'
  },
  {
    id: 'muzai-pixel',
    label: '木仔像素体',
    fontFamily: "'MuzaiPixel', monospace"
  }
]

/** 取字体预设，未知 id 回退到默认 */
export function getHeroTitleFont(fontId: string): HeroTitleFont {
  return HERO_TITLE_FONTS.find((f) => f.id === fontId) ?? HERO_TITLE_FONTS[0]
}

/** 按码点统计长度（Emoji 记 1） */
export function heroTitleLength(text: string): number {
  return Array.from(text).length
}

/** 按码点截断到最大长度，避免把 Emoji 截半 */
export function clampHeroTitleText(text: string): string {
  return Array.from(text).slice(0, MAX_HERO_TITLE_LENGTH).join('')
}

/** 约束字号到合法范围 */
export function clampHeroTitleSize(size: number): number {
  if (!Number.isFinite(size)) {
    return DEFAULT_SIZE
  }
  return Math.min(HERO_TITLE_SIZE_MAX, Math.max(HERO_TITLE_SIZE_MIN, Math.round(size)))
}

/** 读取标题配置（同步），非法字段回退默认 */
export function getHeroTitleConfig(): HeroTitleConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HeroTitleConfig>
      return {
        text: typeof parsed.text === 'string' ? clampHeroTitleText(parsed.text) : DEFAULT_HERO_TITLE,
        fontId: typeof parsed.fontId === 'string' ? parsed.fontId : DEFAULT_FONT_ID,
        fontSize: clampHeroTitleSize(Number(parsed.fontSize))
      }
    }
  } catch {
    /* 忽略解析错误 */
  }
  return { text: DEFAULT_HERO_TITLE, fontId: DEFAULT_FONT_ID, fontSize: DEFAULT_SIZE }
}

/** 保存标题配置（同步） */
export function saveHeroTitleConfig(config: HeroTitleConfig): void {
  const safe: HeroTitleConfig = {
    text: clampHeroTitleText(config.text),
    fontId: getHeroTitleFont(config.fontId).id,
    fontSize: clampHeroTitleSize(config.fontSize)
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
  } catch {
    /* 忽略存储错误 */
  }
}

/** 按需加载字体资源（Google 链接 / 本地内置 @font-face） */
function ensureFontResource(font: HeroTitleFont): void {
  if (typeof document === 'undefined') {
    return
  }
  if (font.cssUrl) {
    const id = `hero-font-${font.id}`
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = font.cssUrl
      document.head.appendChild(link)
    }
  }
  const loader = localFontLoaders[font.id]
  if (loader) {
    const id = `local-font-${font.id}` // 与 fontInjector 共用同一 id，避免重复注入
    if (!document.getElementById(id)) {
      loader()
        .then((css) => {
          if (document.getElementById(id)) {
            return
          }
          const style = document.createElement('style')
          style.id = id
          style.textContent = css
          document.head.appendChild(style)
        })
        .catch(() => undefined)
    }
  }
}

/**
 * 应用标题字体与字号
 * - 字体规则同时覆盖首页(.hero-root)与设置预览(.app-shell)
 * - 字号仅作用于首页，避免影响设置页预览布局
 * - <style> 追加到 head 末尾（晚于 style.css），以同等特异性 + 顺序压过 .font-display 的 !important
 */
export function applyHeroTitleStyle(config: HeroTitleConfig): void {
  if (typeof document === 'undefined') {
    return
  }
  const font = getHeroTitleFont(config.fontId)
  ensureFontResource(font)
  const size = clampHeroTitleSize(config.fontSize)

  const css = `
    .hero-root .hero-title, .hero-root .hero-title *,
    .app-shell .hero-title, .app-shell .hero-title * {
      font-family: ${font.fontFamily} !important;
    }
    .hero-root .hero-title {
      font-size: clamp(2rem, 8vw, ${size}px) !important;
    }
  `

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = css
}
