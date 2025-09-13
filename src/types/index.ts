/**
 * 新标签页模式枚举
 */
export enum TabMode {
  MINIMAL = 'minimal',
  NORMAL = 'normal',
  PRO = 'pro'
}

/**
 * 快捷链接接口
 */
export interface QuickLink {
  id: number
  title: string
  url: string
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
  provider?: string
  apiKey?: string
  baseUrl?: string
  model?: string
  maxTokens?: number
  temperature?: number
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
 * 对话消息接口
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  modelId?: string
}

/**
 * 对话会话接口
 */
export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  modelId: string
  createdAt: Date
  updatedAt: Date
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
 * API 响应基础接口
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}