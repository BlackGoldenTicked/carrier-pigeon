import { PerformanceMode, PerformanceSettings } from '../types'

/**
 * 基础模型配置接口
 */
interface BasicModelConfig {
  id: string
  name: string
  type: 'language' | 'multimedia'
  url: string
  enabled: boolean
  selectedColor?: string
}

/**
 * 性能优化器类
 * 提供节能模式和高效模式的模型打开逻辑
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer
  private settings: PerformanceSettings | null = null

  /**
   * 获取单例实例
   */
  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer()
    }
    return PerformanceOptimizer.instance
  }

  /**
   * 加载性能配置
   */
  private loadSettings(): PerformanceSettings {
    if (this.settings) {
      return this.settings
    }

    try {
      // 优先从localStorage加载用户配置
      const savedSettings = localStorage.getItem('performanceSettings')
      if (savedSettings) {
        this.settings = JSON.parse(savedSettings)
        return this.settings!
      }
    } catch (error) {
      console.warn('加载用户性能配置失败，使用默认配置:', error)
    }

    // 使用默认配置
    this.settings = {
      mode: PerformanceMode.EFFICIENT,
      energySavingMode: {
        enabled: false,
        delayBetweenModels: 1000,
        description: '逐个打开模型，降低系统负载'
      },
      efficientMode: {
        enabled: true,
        batchSize: 3,
        delayBetweenBatches: 2000,
        description: '并行打开多个模型，提高效率'
      }
    }

    return this.settings
  }

  /**
   * 更新性能配置
   */
  public updateSettings(newSettings: PerformanceSettings): void {
    this.settings = newSettings
    try {
      localStorage.setItem('performanceSettings', JSON.stringify(newSettings))
    } catch (error) {
      console.error('保存性能配置失败:', error)
    }
  }

  /**
   * 获取当前性能配置
   */
  public getSettings(): PerformanceSettings {
    return this.loadSettings()
  }

  /**
   * 节能模式：逐个打开模型
   * @param models 要打开的模型列表
   * @param openModelFn 打开单个模型的函数
   * @param text 要传递的文本
   * @param onProgress 进度回调函数
   */
  public async openModelsInEnergySavingMode(
    models: BasicModelConfig[],
    openModelFn: (model: BasicModelConfig, text?: string) => Promise<void>,
    text?: string,
    onProgress?: (current: number, total: number, modelName: string) => void
  ): Promise<void> {
    const settings = this.loadSettings()
    const delay = settings.energySavingMode.delayBetweenModels

    console.log(`🔋 节能模式：开始逐个打开 ${models.length} 个模型，间隔 ${delay}ms`)

    for (let i = 0; i < models.length; i++) {
      const model = models[i]
      
      try {
        // 通知进度
        if (onProgress) {
          onProgress(i + 1, models.length, model.name)
        }

        console.log(`🔋 节能模式：正在打开第 ${i + 1}/${models.length} 个模型: ${model.name}`)
        
        // 打开模型
        await openModelFn(model, text)
        
        // 如果不是最后一个模型，则等待指定时间
        if (i < models.length - 1) {
          console.log(`🔋 节能模式：等待 ${delay}ms 后打开下一个模型`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        console.error(`🔋 节能模式：打开模型 ${model.name} 失败:`, error)
        // 继续处理下一个模型，不中断整个流程
      }
    }

    console.log(`🔋 节能模式：已完成所有 ${models.length} 个模型的打开`)
  }

  /**
   * 高效模式：批量并行打开模型
   * @param models 要打开的模型列表
   * @param openModelFn 打开单个模型的函数
   * @param text 要传递的文本
   * @param onProgress 进度回调函数
   */
  public async openModelsInEfficientMode(
    models: BasicModelConfig[],
    openModelFn: (model: BasicModelConfig, text?: string) => Promise<void>,
    text?: string,
    onProgress?: (current: number, total: number, batchInfo: string) => void
  ): Promise<void> {
    const settings = this.loadSettings()
    const batchSize = settings.efficientMode.batchSize
    const delay = settings.efficientMode.delayBetweenBatches

    console.log(`⚡ 高效模式：开始批量打开 ${models.length} 个模型，每批 ${batchSize} 个，间隔 ${delay}ms`)

    // 将模型分批
    const batches: BasicModelConfig[][] = []
    for (let i = 0; i < models.length; i += batchSize) {
      batches.push(models.slice(i, i + batchSize))
    }

    console.log(`⚡ 高效模式：共分为 ${batches.length} 批`)

    let processedCount = 0

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const batchInfo = `第 ${batchIndex + 1}/${batches.length} 批 (${batch.length} 个模型)`
      
      console.log(`⚡ 高效模式：开始处理${batchInfo}`)

      try {
        // 并行打开当前批次的所有模型
        const promises = batch.map(async (model, index) => {
          try {
            console.log(`⚡ 高效模式：${batchInfo} - 正在打开 ${model.name}`)
            await openModelFn(model, text)
            console.log(`⚡ 高效模式：${batchInfo} - ${model.name} 打开成功`)
          } catch (error) {
            console.error(`⚡ 高效模式：${batchInfo} - ${model.name} 打开失败:`, error)
            // 不抛出错误，让其他模型继续处理
          }
        })

        // 等待当前批次所有模型处理完成
        await Promise.allSettled(promises)
        
        processedCount += batch.length

        // 通知进度
        if (onProgress) {
          onProgress(processedCount, models.length, batchInfo)
        }

        console.log(`⚡ 高效模式：${batchInfo} 处理完成`)

        // 如果不是最后一批，则等待指定时间
        if (batchIndex < batches.length - 1) {
          console.log(`⚡ 高效模式：等待 ${delay}ms 后处理下一批`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        console.error(`⚡ 高效模式：${batchInfo} 处理失败:`, error)
        // 继续处理下一批
      }
    }

    console.log(`⚡ 高效模式：已完成所有 ${models.length} 个模型的打开`)
  }

  /**
   * 根据当前配置自动选择合适的模式打开模型
   * @param models 要打开的模型列表
   * @param openModelFn 打开单个模型的函数
   * @param text 要传递的文本
   * @param onProgress 进度回调函数
   */
  public async openModelsWithOptimalMode(
    models: BasicModelConfig[],
    openModelFn: (model: BasicModelConfig, text?: string) => Promise<void>,
    text?: string,
    onProgress?: (current: number, total: number, info: string) => void
  ): Promise<void> {
    const settings = this.loadSettings()

    if (models.length === 0) {
      console.warn('没有模型需要打开')
      return
    }

    if (models.length === 1) {
      // 只有一个模型时直接打开，不需要性能优化
      console.log('只有一个模型，直接打开')
      if (onProgress) {
        onProgress(1, 1, models[0].name)
      }
      await openModelFn(models[0], text)
      return
    }

    // 根据配置选择模式
    if (settings.mode === PerformanceMode.ENERGY_SAVING) {
      await this.openModelsInEnergySavingMode(models, openModelFn, text, onProgress)
    } else {
      await this.openModelsInEfficientMode(models, openModelFn, text, onProgress)
    }
  }

  /**
   * 获取预估的总耗时（秒）
   * @param modelCount 模型数量
   * @returns 预估耗时（秒）
   */
  public getEstimatedTime(modelCount: number): number {
    if (modelCount <= 1) return 0

    const settings = this.loadSettings()

    if (settings.mode === PerformanceMode.ENERGY_SAVING) {
      // 节能模式：(模型数量 - 1) * 间隔时间
      return (modelCount - 1) * settings.energySavingMode.delayBetweenModels / 1000
    } else {
      // 高效模式：(批次数 - 1) * 批次间隔时间
      const batchCount = Math.ceil(modelCount / settings.efficientMode.batchSize)
      return (batchCount - 1) * settings.efficientMode.delayBetweenBatches / 1000
    }
  }

  /**
   * 获取模式描述信息
   * @param modelCount 模型数量
   * @returns 模式描述
   */
  public getModeDescription(modelCount: number): string {
    if (modelCount <= 1) return '直接打开'

    const settings = this.loadSettings()
    const estimatedTime = this.getEstimatedTime(modelCount)

    if (settings.mode === PerformanceMode.ENERGY_SAVING) {
      return `节能模式：逐个打开，预计耗时 ${estimatedTime.toFixed(1)} 秒`
    } else {
      const batchCount = Math.ceil(modelCount / settings.efficientMode.batchSize)
      return `高效模式：${batchCount} 批并行打开，预计耗时 ${estimatedTime.toFixed(1)} 秒`
    }
  }
}

// 导出单例实例
export const performanceOptimizer = PerformanceOptimizer.getInstance()

// 导出便捷函数
export const openModelsWithOptimalMode = (
  models: BasicModelConfig[],
  openModelFn: (model: BasicModelConfig, text?: string) => Promise<void>,
  text?: string,
  onProgress?: (current: number, total: number, info: string) => void
) => performanceOptimizer.openModelsWithOptimalMode(models, openModelFn, text, onProgress)

export const getEstimatedTime = (modelCount: number) => performanceOptimizer.getEstimatedTime(modelCount)

export const getModeDescription = (modelCount: number) => performanceOptimizer.getModeDescription(modelCount)

export const updatePerformanceSettings = (settings: PerformanceSettings) => performanceOptimizer.updateSettings(settings)

export const getPerformanceSettings = () => performanceOptimizer.getSettings()