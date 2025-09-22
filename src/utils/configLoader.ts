import quickLinksConfig from '../config/quickLinks.json'
import aiModelsConfig from '../config/aiModels.json'
import modeConfigData from '../config/modeConfig.json'

/**
 * 快捷链接数据类型定义
 */
export interface QuickLink {
  id: number
  title: string
  url: string
  icon?: string // 网站图标URL，可选字段
}

/**
 * AI模型类型枚举
 */
export enum AIModelType {
  LANGUAGE = 'language',
  MULTIMEDIA = 'multimedia'
}

/**
 * AI模型数据类型定义
 */
export interface AIModel {
  id: string
  name: string
  type: AIModelType
  url: string
  selectedColor: string
}

/**
 * AI模型分类配置接口
 */
export interface AIModelCategory {
  type: AIModelType
  title: string
  description: string
  models: AIModel[]
}

/**
 * 模式配置数据类型定义
 */
export interface ModeConfig {
  title: string
  description: string
  icon: string
}

/**
 * 配置加载器类
 * 统一管理所有JSON配置文件的加载和访问
 * 优化版：添加缓存机制、懒加载和性能监控
 */
export class ConfigLoader {
  private static instance: ConfigLoader
  private quickLinksData: QuickLink[][] | null = null
  private aiModelsData: AIModelCategory[] | null = null
  private modeConfigData: Record<string, ModeConfig> | null = null
  private tabModeData: Record<string, string> | null = null
  
  // 缓存时间戳，用于缓存失效检查
  private cacheTimestamps = new Map<string, number>()
  private readonly CACHE_TTL = 300000 // 5分钟缓存时间
  
  // 性能监控
  private loadTimes = new Map<string, number>()

  /**
   * 获取单例实例
   */
  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader()
    }
    return ConfigLoader.instance
  }

  /**
   * 检查缓存是否有效
   * @param key 缓存键
   * @returns 是否有效
   */
  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key)
    return timestamp ? (Date.now() - timestamp < this.CACHE_TTL) : false
  }

  /**
   * 设置缓存时间戳
   * @param key 缓存键
   */
  private setCacheTimestamp(key: string): void {
    this.cacheTimestamps.set(key, Date.now())
  }

  /**
   * 记录加载时间
   * @param key 配置键
   * @param startTime 开始时间
   */
  private recordLoadTime(key: string, startTime: number): void {
    const loadTime = Date.now() - startTime
    this.loadTimes.set(key, loadTime)
    if (loadTime > 100) { // 超过100ms记录警告
      console.warn(`配置加载较慢: ${key} 耗时 ${loadTime}ms`)
    }
  }

  /**
   * 获取快捷链接配置（优化版）
   * @returns 快捷链接数据数组
   */
  public getQuickLinks(): QuickLink[][] {
    const cacheKey = 'quickLinks'
    
    if (!this.quickLinksData || !this.isCacheValid(cacheKey)) {
      const startTime = Date.now()
      this.quickLinksData = quickLinksConfig.quickLinks
      this.setCacheTimestamp(cacheKey)
      this.recordLoadTime(cacheKey, startTime)
    }
    
    return this.quickLinksData
  }

  /**
   * 获取AI模型配置（优化版）
   * @returns AI模型分类数据数组
   */
  public getAIModels(): AIModelCategory[] {
    const cacheKey = 'aiModels'
    
    if (!this.aiModelsData || !this.isCacheValid(cacheKey)) {
      const startTime = Date.now()
      this.aiModelsData = (aiModelsConfig as any).aiModelCategories || []
      this.setCacheTimestamp(cacheKey)
      this.recordLoadTime(cacheKey, startTime)
    }
    
    return this.aiModelsData || []
  }

  /**
   * 获取模式配置（优化版）
   * @returns 模式配置对象
   */
  public getModeConfig(): Record<string, ModeConfig> {
    const cacheKey = 'modeConfig'
    
    if (!this.modeConfigData || !this.isCacheValid(cacheKey)) {
      const startTime = Date.now()
      this.modeConfigData = modeConfigData.modeConfig
      this.setCacheTimestamp(cacheKey)
      this.recordLoadTime(cacheKey, startTime)
    }
    
    return this.modeConfigData
  }

  /**
   * 获取Tab模式枚举（优化版）
   * @returns Tab模式枚举对象
   */
  public getTabMode(): Record<string, string> {
    const cacheKey = 'tabMode'
    
    if (!this.tabModeData || !this.isCacheValid(cacheKey)) {
      const startTime = Date.now()
      this.tabModeData = modeConfigData.TabMode
      this.setCacheTimestamp(cacheKey)
      this.recordLoadTime(cacheKey, startTime)
    }
    
    return this.tabModeData
  }

  /**
   * 重新加载所有配置
   * 用于配置文件更新后的热重载
   */
  public reloadConfigs(): void {
    this.quickLinksData = null
    this.aiModelsData = null
    this.modeConfigData = null
    this.tabModeData = null
  }

  /**
   * 验证配置数据完整性
   * @returns 验证结果
   */
  public validateConfigs(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    try {
      const quickLinks = this.getQuickLinks()
      if (!Array.isArray(quickLinks) || quickLinks.length === 0) {
        errors.push('快捷链接配置无效或为空')
      }

      const aiModels = this.getAIModels()
      if (!Array.isArray(aiModels) || aiModels.length === 0) {
        errors.push('AI模型配置无效或为空')
      }

      const modeConfig = this.getModeConfig()
      if (!modeConfig || Object.keys(modeConfig).length === 0) {
        errors.push('模式配置无效或为空')
      }

      const tabMode = this.getTabMode()
      if (!tabMode || Object.keys(tabMode).length === 0) {
        errors.push('Tab模式配置无效或为空')
      }
    } catch (error) {
      errors.push(`配置加载失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * 导出配置加载器实例
 */
export const configLoader = ConfigLoader.getInstance()

/**
 * 便捷的配置获取函数
 */
export const getQuickLinks = () => configLoader.getQuickLinks()
export const getAIModels = () => configLoader.getAIModels()
export const getModeConfig = () => configLoader.getModeConfig()
export const getTabMode = () => configLoader.getTabMode()