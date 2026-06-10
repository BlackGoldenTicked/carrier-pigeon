/**
 * 新标签页模式枚举
 */
export enum TabMode {
  MINIMAL = 'minimal',
  NORMAL = 'normal'
}

/**
 * 快捷链接接口
 */
export interface QuickLink {
  id: number
  title: string
  url: string
  icon?: string // 网站图标URL，可选字段
}

/**
 * AI 模型类型枚举
 */
export enum AIModelType {
  LANGUAGE = 'language',
  MULTIMEDIA = 'multimedia'
}

/**
 * AI 模型服务接口
 */
export interface AIModel {
  id: string
  name: string
  type: AIModelType
  url: string
  selectedColor: string
  isActive?: boolean
}

/**
 * AI 模型分类配置接口
 */
export interface AIModelCategory {
  type: AIModelType
  title: string
  description: string
  models: AIModel[]
}

/**
 * 用户设置接口
 */
export interface UserSettings {
  mode: TabMode
  theme: 'light' | 'dark'
  quickLinks: QuickLink[]
  aiModels: AIModel[]
  defaultModel?: string
  backgroundType: 'solid' | 'gradient' | 'image'
  backgroundValue: string
  showClock: boolean
  showWeather: boolean
  showSearch: boolean
  fontSettings: FontSettings
}

/**
 * 天气信息接口
 */
export interface WeatherInfo {
  location: string
  temperature: number
  condition: string
  icon: string
  humidity: number
  windSpeed: number
}

/**
 * 搜索引擎接口
 */
export interface SearchEngine {
  id: string
  name: string
  url: string
  icon: string
}

/**
 * 组件属性基础接口
 */
export interface BaseComponentProps {
  className?: string
  children?: any
}

/**
 * API 响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * 字体配置接口
 */
export interface FontConfig {
  id: string
  name: string
  displayName: string
  description: string
  cssUrl: string
  fontFamily: string
  fontWeight?: string
  previewText?: string
  isEnabled: boolean
  category: FontCategory
}

/**
 * 字体分类枚举
 */
export enum FontCategory {
  SERIF = 'serif',
  SANS_SERIF = 'sans-serif',
  MONOSPACE = 'monospace',
  HANDWRITING = 'handwriting',
  DISPLAY = 'display'
}

/**
 * 字体设置接口
 */
export interface FontSettings {
  enabledFontId?: string
  customFonts: FontConfig[]
  applyToAllPages: boolean
  fontSize: number
  lineHeight: number
}