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
}

/**
 * AI模型数据类型定义
 */
export interface AIModel {
  id: string
  name: string
  color: string
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
 */
export class ConfigLoader {
  private static instance: ConfigLoader
  private quickLinksData: QuickLink[][] | null = null
  private aiModelsData: AIModel[] | null = null
  private modeConfigData: Record<string, ModeConfig> | null = null
  private tabModeData: Record<string, string> | null = null

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
   * 获取快捷链接配置
   * @returns 快捷链接数据数组
   */
  public getQuickLinks(): QuickLink[][] {
    if (!this.quickLinksData) {
      this.quickLinksData = quickLinksConfig.quickLinks
    }
    return this.quickLinksData
  }

  /**
   * 获取AI模型配置
   * @returns AI模型数据数组
   */
  public getAIModels(): AIModel[] {
    if (!this.aiModelsData) {
      this.aiModelsData = aiModelsConfig.aiModels
    }
    return this.aiModelsData
  }

  /**
   * 获取模式配置
   * @returns 模式配置对象
   */
  public getModeConfig(): Record<string, ModeConfig> {
    if (!this.modeConfigData) {
      this.modeConfigData = modeConfigData.modeConfig
    }
    return this.modeConfigData
  }

  /**
   * 获取Tab模式枚举
   * @returns Tab模式枚举对象
   */
  public getTabMode(): Record<string, string> {
    if (!this.tabModeData) {
      this.tabModeData = modeConfigData.TabMode
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