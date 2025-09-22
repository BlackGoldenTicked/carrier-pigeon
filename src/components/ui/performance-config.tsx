import React, { useState, useEffect } from 'react'
import { PerformanceMode, PerformanceSettings } from '../../types'
import { getPerformanceConfig } from '../../utils/configLoader'

/**
 * 性能配置组件属性接口
 */
interface PerformanceConfigProps {
  isOpen: boolean
  onClose: () => void
  onConfigUpdate?: (settings: PerformanceSettings) => void
}

/**
 * 性能配置组件
 * 提供节能模式和高效模式的配置界面
 */
export function PerformanceConfig({ isOpen, onClose, onConfigUpdate }: PerformanceConfigProps) {
  const [settings, setSettings] = useState<PerformanceSettings>({
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
  })

  /**
   * 加载性能配置数据
   */
  useEffect(() => {
    if (isOpen) {
      try {
        const config = getPerformanceConfig()
        if (config?.performanceSettings) {
          setSettings({
            mode: config.performanceSettings.mode === 'energy_saving' 
              ? PerformanceMode.ENERGY_SAVING 
              : PerformanceMode.EFFICIENT,
            energySavingMode: config.performanceSettings.energySavingMode,
            efficientMode: config.performanceSettings.efficientMode
          })
        }
      } catch (error) {
        console.error('加载性能配置失败:', error)
      }
    }
  }, [isOpen])

  /**
   * 处理模式切换
   */
  const handleModeChange = (mode: PerformanceMode) => {
    const newSettings = {
      ...settings,
      mode,
      energySavingMode: {
        ...settings.energySavingMode,
        enabled: mode === PerformanceMode.ENERGY_SAVING
      },
      efficientMode: {
        ...settings.efficientMode,
        enabled: mode === PerformanceMode.EFFICIENT
      }
    }
    setSettings(newSettings)
  }

  /**
   * 处理节能模式配置更新
   */
  const handleEnergySavingConfigChange = (field: string, value: number) => {
    const newSettings = {
      ...settings,
      energySavingMode: {
        ...settings.energySavingMode,
        [field]: value
      }
    }
    setSettings(newSettings)
  }

  /**
   * 处理高效模式配置更新
   */
  const handleEfficientConfigChange = (field: string, value: number) => {
    const newSettings = {
      ...settings,
      efficientMode: {
        ...settings.efficientMode,
        [field]: value
      }
    }
    setSettings(newSettings)
  }

  /**
   * 保存配置
   */
  const handleSave = () => {
    try {
      // 保存到localStorage
      localStorage.setItem('performanceSettings', JSON.stringify(settings))
      
      // 通知父组件配置更新
      if (onConfigUpdate) {
        onConfigUpdate(settings)
      }
      
      // 显示保存成功提示
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300'
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span>性能配置已保存</span>
        </div>
      `
      document.body.appendChild(notification)
      
      // 3秒后移除通知
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.opacity = '0'
          setTimeout(() => {
            document.body.removeChild(notification)
          }, 300)
        }
      }, 3000)
      
      onClose()
    } catch (error) {
      console.error('保存性能配置失败:', error)
      alert('保存失败，请重试')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">性能配置</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* 模式选择 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">选择性能模式</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 节能模式 */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  settings.mode === PerformanceMode.ENERGY_SAVING
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
                onClick={() => handleModeChange(PerformanceMode.ENERGY_SAVING)}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    settings.mode === PerformanceMode.ENERGY_SAVING
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {settings.mode === PerformanceMode.ENERGY_SAVING && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">节能模式</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                  {settings.energySavingMode.description}
                </p>
              </div>

              {/* 高效模式 */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  settings.mode === PerformanceMode.EFFICIENT
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
                onClick={() => handleModeChange(PerformanceMode.EFFICIENT)}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    settings.mode === PerformanceMode.EFFICIENT
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {settings.mode === PerformanceMode.EFFICIENT && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">高效模式</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                  {settings.efficientMode.description}
                </p>
              </div>
            </div>
          </div>

          {/* 节能模式配置 */}
          {settings.mode === PerformanceMode.ENERGY_SAVING && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">节能模式设置</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    模型间等待时间 (毫秒)
                  </label>
                  <input
                    type="number"
                    min="500"
                    max="5000"
                    step="100"
                    value={settings.energySavingMode.delayBetweenModels}
                    onChange={(e) => handleEnergySavingConfigChange('delayBetweenModels', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    建议范围：500-5000毫秒，数值越大系统负载越低
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 高效模式配置 */}
          {settings.mode === PerformanceMode.EFFICIENT && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">高效模式设置</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    每批并行打开数量
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={settings.efficientMode.batchSize}
                    onChange={(e) => handleEfficientConfigChange('batchSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    建议范围：1-8个，数值越大打开速度越快但系统负载越高
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    批次间等待时间 (毫秒)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="10000"
                    step="500"
                    value={settings.efficientMode.delayBetweenBatches}
                    onChange={(e) => handleEfficientConfigChange('delayBetweenBatches', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    建议范围：1000-10000毫秒，给浏览器足够时间处理每批请求
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 示例说明 */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">配置示例</h4>
            {settings.mode === PerformanceMode.ENERGY_SAVING ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                选择8个模型时，将逐个打开，每个模型间隔 {settings.energySavingMode.delayBetweenModels}ms，
                总耗时约 {(settings.energySavingMode.delayBetweenModels * 7 / 1000).toFixed(1)} 秒
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                选择8个模型时，每批打开 {settings.efficientMode.batchSize} 个，
                批次间隔 {settings.efficientMode.delayBetweenBatches}ms，
                共需 {Math.ceil(8 / settings.efficientMode.batchSize)} 批，
                总耗时约 {((Math.ceil(8 / settings.efficientMode.batchSize) - 1) * settings.efficientMode.delayBetweenBatches / 1000).toFixed(1)} 秒
              </p>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  )
}