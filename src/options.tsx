import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { getQuickLinks, getAIModels, type QuickLink, type AIModel, type AIModelCategory } from './utils/configLoader'
import { FontManager } from './components/FontManager'
import { PerformanceSettings, PerformanceMode } from './types'

/**2 * 图标获取工具函数
 */
const IconUtils = {
  /**
   * 从URL提取域名
   */
  extractDomain: (url: string): string => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return urlObj.hostname.replace(/^www\./, '')
    } catch {
      return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
    }
  },

  /**
   * 获取网站图标URL的多种方式
   */
  getFaviconUrl: (url: string): string => {
    const domain = IconUtils.extractDomain(url)
    
    // 优先使用Google Favicon服务
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  },

  /**
   * 异步检查图标是否可用
   */
  checkIconAvailability: async (iconUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = iconUrl
      
      // 3秒超时
      setTimeout(() => resolve(false), 3000)
    })
  }
}

/**
 * 配置数据类型定义
 */
interface LinkConfig {
  id: number
  title: string
  url: string
  icon?: string // 网站图标URL，可选字段
}

/**
 * 一般模式模型配置接口
 * 只包含基本信息和页面地址
 */
interface BasicModelConfig {
  id: string
  name: string
  type: 'language' | 'multimedia'
  url: string
  enabled: boolean
  selectedColor?: string
}

interface ConfigData {
  links: LinkConfig[][]
  basicModels: BasicModelConfig[]  // 一般模式模型配置
  theme: 'light' | 'dark'
  performanceSettings: PerformanceSettings  // 性能配置
}

/**
 * 从JSON文件加载基础模型配置
 */
const loadBasicModelsFromJSON = (): BasicModelConfig[] => {
  const aiModelCategories = getAIModels()
  const basicModels: BasicModelConfig[] = []
  
  aiModelCategories.forEach(category => {
    category.models.forEach(model => {
      basicModels.push({
        id: model.id,
        name: model.name,
        type: model.type,
        url: model.url,
        enabled: true,
        selectedColor: model.selectedColor
      })
    })
  })
  
  return basicModels
}

/**
 * 从JSON文件加载快捷链接配置
 */
const loadLinksFromJSON = (): LinkConfig[][] => {
  const quickLinksData = getQuickLinks()
  return quickLinksData.map(row => 
    row.map(link => ({
      id: link.id,
      title: link.title,
      url: link.url,
      icon: (link as any).icon ?? (link as any).favicon ?? (link as any).favIcon
    }))
  )
}

/**
 * 默认配置数据
 */
const defaultConfig: ConfigData = {
  links: loadLinksFromJSON(),
  basicModels: loadBasicModelsFromJSON(),
  theme: 'light',
  performanceSettings: {
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
}

/**
 * 配置选项页面组件
 */
function OptionsPage() {
  const [config, setConfig] = useState<ConfigData>(defaultConfig)
  const [activeTab, setActiveTab] = useState<'general' | 'links' | 'models' | 'fonts' | 'performance'>('general')
  const [modelFilter, setModelFilter] = useState<'all' | 'language' | 'multimedia'>('all')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [editingCell, setEditingCell] = useState<{type: 'link' | 'basicModel', id: string | number, field: string} | null>(null)

  /**
   * 初始化主题检测
   */
  useEffect(() => {
    const updateTheme = () => {
      const savedTheme = config.theme
      const shouldBeDark = savedTheme === 'dark'
      
      setIsDarkMode(shouldBeDark)
      
      if (shouldBeDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    updateTheme()
  }, [config.theme])

  /**
   * 智能合并JSON文件和Chrome存储的配置数据
   * @param jsonConfig JSON文件中的默认配置
   * @param storageConfig Chrome存储中的用户配置
   * @returns 合并后的配置
   */
  const mergeConfigs = (jsonConfig: ConfigData, storageConfig: Partial<ConfigData>): ConfigData => {
    // 如果存储中没有配置，直接使用JSON默认配置
    if (!storageConfig || Object.keys(storageConfig).length === 0) {
      return jsonConfig
    }

    // 智能合并链接数据：优先使用存储中的数据，但确保结构完整
    const mergedLinks = storageConfig.links && storageConfig.links.length > 0 
      ? storageConfig.links 
      : jsonConfig.links

    // 智能合并基础模型数据：合并JSON中的新模型和存储中的用户设置
    const mergedBasicModels = (() => {
      const jsonModels = jsonConfig.basicModels || []
      const storageModels = storageConfig.basicModels || []
      
      // 创建存储模型的映射表
      const storageModelMap = new Map(storageModels.map(model => [model.id, model]))
      
      // 合并：JSON中的模型为基础，应用存储中的用户设置
      return jsonModels.map(jsonModel => {
        const storageModel = storageModelMap.get(jsonModel.id)
        return storageModel ? { ...jsonModel, ...storageModel } : jsonModel
      })
    })()

    // 智能合并性能配置：深度合并以保持嵌套结构
    const mergedPerformanceSettings = (() => {
      const defaultSettings = jsonConfig.performanceSettings
      const storageSettings = storageConfig.performanceSettings
      
      if (!storageSettings) {
        return defaultSettings
      }
      
      return {
        mode: storageSettings.mode ?? defaultSettings.mode,
        energySavingMode: {
          ...defaultSettings.energySavingMode,
          ...storageSettings.energySavingMode
        },
        efficientMode: {
          ...defaultSettings.efficientMode,
          ...storageSettings.efficientMode
        }
      }
    })()

    return {
      ...jsonConfig,
      ...storageConfig,
      links: mergedLinks,
      basicModels: mergedBasicModels,
      performanceSettings: mergedPerformanceSettings
    }
  }

  /**
   * 从 Chrome 存储加载配置并智能合并
   */
  useEffect(() => {
    const loadConfig = async () => {
      try {
        let storageConfig: Partial<ConfigData> = {}
        
        if (chrome?.storage?.sync) {
          const result = await chrome.storage.sync.get(['mytab-config'])
          if (result['mytab-config']) {
            storageConfig = result['mytab-config']
          }
        } else {
          // 降级到 localStorage
          const savedConfig = localStorage.getItem('mytab-config')
          if (savedConfig) {
            storageConfig = JSON.parse(savedConfig)
          }
        }
        
        // 智能合并配置
        const mergedConfig = mergeConfigs(defaultConfig, storageConfig)
        setConfig(mergedConfig)
        
        // 如果合并后的配置与存储中的不同，更新存储
        const configChanged = JSON.stringify(mergedConfig) !== JSON.stringify(storageConfig)
        if (configChanged) {
          if (chrome?.storage?.sync) {
            await chrome.storage.sync.set({ 'mytab-config': mergedConfig })
          } else {
            localStorage.setItem('mytab-config', JSON.stringify(mergedConfig))
          }
          console.log('✅ 配置已同步更新')
        }
        
      } catch (error) {
        console.error('配置加载失败:', error)
        // 使用默认配置作为fallback
        setConfig(defaultConfig)
      }
    }
    
    loadConfig()
  }, [])

  /**
   * 保存配置到 Chrome 存储
   */
  const saveConfig = async (newConfig: ConfigData) => {
    setSaveStatus('saving')
    
    try {
      setConfig(newConfig)
      
      if (chrome?.storage?.sync) {
        await chrome.storage.sync.set({ 'mytab-config': newConfig })
      } else {
        // 降级到 localStorage
        localStorage.setItem('mytab-config', JSON.stringify(newConfig))
      }
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('配置保存失败:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  /**
   * 处理主题切换
   */
  const handleThemeChange = (theme: 'light' | 'dark') => {
    const newConfig = { ...config, theme }
    saveConfig(newConfig)
  }

  /**
   * 每行最多显示的链接数
   */
  const LINKS_PER_ROW = 5
  const MAX_LINKS = 20

  /**
   * 将一维链接数组按每行 LINKS_PER_ROW 个重新分组为二维数组
   */
  const redistributeLinks = (flatLinks: LinkConfig[]): LinkConfig[][] => {
    const rows: LinkConfig[][] = []
    for (let i = 0; i < flatLinks.length; i += LINKS_PER_ROW) {
      rows.push(flatLinks.slice(i, i + LINKS_PER_ROW))
    }
    return rows.length > 0 ? rows : [[]]
  }

  /**
   * 添加新链接
   */
  const addLink = () => {
    const flatLinks = config.links.flat()

    if (flatLinks.length >= MAX_LINKS) {
      alert(`最多只能添加${MAX_LINKS}个快捷链接`)
      return
    }

    const newLink: LinkConfig = {
      id: Date.now(),
      title: '新链接',
      url: 'https://example.com'
    }

    flatLinks.push(newLink)
    const newConfig = { ...config, links: redistributeLinks(flatLinks) }
    saveConfig(newConfig)
  }

  /**
   * 更新链接字段
   */
  const updateLinkField = (linkId: number, field: string, value: string) => {
    const newConfig = { ...config }
    
    for (let i = 0; i < newConfig.links.length; i++) {
      const linkIndex = newConfig.links[i].findIndex(l => l.id === linkId)
      if (linkIndex !== -1) {
        newConfig.links[i][linkIndex] = {
          ...newConfig.links[i][linkIndex],
          [field]: value
        }
        break
      }
    }
    
    saveConfig(newConfig)
  }

  /**
   * 删除链接
   */
  const deleteLink = (linkId: number) => {
    const flatLinks = config.links.flat().filter(l => l.id !== linkId)
    const newConfig = { ...config, links: redistributeLinks(flatLinks) }
    saveConfig(newConfig)
  }

  /**
   * 添加新的基础模型（一般模式）
   */
  const addBasicModel = () => {
    // 确定要添加的模型类型
    const targetType = modelFilter === 'all' ? 'language' : 
                      (modelFilter === 'language' ? 'language' : 'multimedia')
    
    // 检查该类型的模型数量是否已达到限制
    const modelsOfType = config.basicModels.filter(model => model.type === targetType)
    if (modelsOfType.length >= 6) {
      alert(`${getBasicTypeDisplayName(targetType)}类型的模型最多只能添加6个`)
      return
    }
    
    const newModel: BasicModelConfig = {
      id: `basic-model-${Date.now()}`,
      name: '新模型',
      type: targetType as 'language' | 'multimedia',
      url: 'https://example.com',
      enabled: false,
      selectedColor: '#4285f4'
    }
    
    const newConfig = { ...config }
    newConfig.basicModels.push(newModel)
    saveConfig(newConfig)
  }
  
  /**
   * 获取基础模型类型的显示名称
   */
  const getBasicTypeDisplayName = (type: string) => {
    const typeNames = {
      'language': '语言模型',
      'multimedia': '多媒体模型'
    }
    return typeNames[type as keyof typeof typeNames] || type
  }

  /**
   * 更新基础模型字段
   */
  const updateBasicModelField = (modelId: string, field: string, value: string | boolean) => {
    const newConfig = { ...config }
    const modelIndex = newConfig.basicModels.findIndex(m => m.id === modelId)
    
    if (modelIndex !== -1) {
      newConfig.basicModels[modelIndex] = {
        ...newConfig.basicModels[modelIndex],
        [field]: value
      }
      saveConfig(newConfig)
    }
  }

  /**
   * 删除基础模型
   */
  const deleteBasicModel = (modelId: string) => {
    const newConfig = { ...config }
    newConfig.basicModels = newConfig.basicModels.filter(m => m.id !== modelId)
    saveConfig(newConfig)
  }

  /**
   * 切换基础模型启用状态
   */
  const toggleBasicModel = (modelId: string) => {
    updateBasicModelField(modelId, 'enabled', !config.basicModels.find(m => m.id === modelId)?.enabled)
  }

  /**
   * 处理单元格编辑
   */
  const handleCellEdit = (type: 'link' | 'basicModel', id: string | number, field: string) => {
    setEditingCell({ type, id, field })
  }

  /**
   * 处理单元格失去焦点
   */
  const handleCellBlur = (value: string) => {
    if (editingCell) {
      if (editingCell.type === 'link') {
        updateLinkField(editingCell.id as number, editingCell.field, value)
      } else if (editingCell.type === 'basicModel') {
        updateBasicModelField(editingCell.id as string, editingCell.field, value)
      }
    }
    setEditingCell(null)
  }

  /**
   * 导出配置
   */
  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mytab-config.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  /**
   * 导入配置
   */
  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string)
          const newConfig = { ...defaultConfig, ...imported }
          saveConfig(newConfig)
        } catch (error) {
          alert('配置文件格式错误')
        }
      }
      reader.readAsText(file)
    }
  }

  /**
   * 重置配置
   */
  const resetConfig = () => {
    if (confirm('确定要重置所有配置吗？此操作不可撤销。')) {
      saveConfig(defaultConfig)
    }
  }

  /**
   * 同步JSON配置 - 从JSON文件重新加载最新配置
   */
  /**
   * 检查JSON文件是否有更新
   * @returns 是否检测到更新
   */
  const checkJSONUpdates = (): boolean => {
    try {
      const currentJSONLinks = loadLinksFromJSON()
      const currentJSONModels = loadBasicModelsFromJSON()
      
      // 比较当前配置中的链接和JSON文件中的链接
      const linksChanged = JSON.stringify(currentJSONLinks) !== JSON.stringify(config.links)
      const modelsChanged = JSON.stringify(currentJSONModels) !== JSON.stringify(config.basicModels)
      
      return linksChanged || modelsChanged
    } catch (error) {
      console.error('检查JSON更新失败:', error)
      return false
    }
  }

  /**
   * 从JSON同步配置到Chrome存储
   */
  const syncJSONConfig = () => {
    const hasUpdates = checkJSONUpdates()
    const confirmMessage = hasUpdates 
      ? '检测到JSON文件有更新，确定要同步最新配置吗？这将覆盖当前的快捷链接和基础模型配置。'
      : '确定要从JSON文件重新加载配置吗？这将覆盖当前的快捷链接和基础模型配置。'
      
    if (confirm(confirmMessage)) {
      try {
        // 重新加载JSON配置
        const freshJSONConfig = {
          links: loadLinksFromJSON(),
          basicModels: loadBasicModelsFromJSON()
        }
        
        // 智能合并：保留用户的个人设置，更新JSON数据
        const syncedConfig: ConfigData = {
          ...config,
          ...freshJSONConfig
        }
        
        setConfig(syncedConfig)
        saveConfig(syncedConfig)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
        
        console.log('✅ JSON配置同步完成')
      } catch (error) {
        console.error('同步失败:', error)
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    }
  }

  /**
   * 保存当前配置到JSON文件格式 - 导出当前链接配置为JSON格式
   */
  const saveToJSONFormat = () => {
    const jsonConfig = {
      quickLinks: config.links
    }
    const dataStr = JSON.stringify(jsonConfig, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'quickLinks.json'
    link.click()
    URL.revokeObjectURL(url)
    alert('快捷链接配置已导出为 quickLinks.json 文件，请手动替换 src/config/quickLinks.json 文件以保持同步。')
  }

  /**
   * 过滤基础模型
   */
  const filteredBasicModels = config.basicModels.filter(model => {
    if (modelFilter === 'all') return true
    if (modelFilter === 'language') return model.type === 'language'
    if (modelFilter === 'multimedia') return model.type === 'multimedia'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">MyTab 配置</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">管理您的新标签页设置</p>
            </div>
            
            {/* 保存状态指示器 */}
            <div className="flex items-center space-x-4">
              {saveStatus === 'saving' && (
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  已保存
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center text-red-600 dark:text-red-400">
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  保存失败
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* 侧边栏导航 */}
          <nav className="w-64 space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'general'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              通用设置
            </button>
            
            <button
              onClick={() => setActiveTab('links')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'links'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
              </svg>
              链接管理
            </button>
            
            <button
              onClick={() => setActiveTab('models')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'models'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
              模型管理
            </button>
            
            <button
              onClick={() => setActiveTab('fonts')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'fonts'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM16 13a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" />
              </svg>
              字体管理
            </button>
            
            <button
              onClick={() => setActiveTab('performance')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'performance'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              性能配置
            </button>
          </nav>

          {/* 主内容区域 */}
          <main className="flex-1">
            {activeTab === 'general' && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">通用设置</h2>
                
                {/* 主题设置 */}
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">主题模式</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'light', label: '☀️ 亮色模式', desc: '始终使用亮色主题' },
                      { value: 'dark', label: '🌙 暗色模式', desc: '始终使用暗色主题' }
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() => handleThemeChange(theme.value as any)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          config.theme === theme.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{theme.label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{theme.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 数据管理 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">数据管理</h3>
                  <div className="space-y-4">
                    <div className="flex space-x-4">
                      <button
                        onClick={exportConfig}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        导出配置
                      </button>
                      
                      <label className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer">
                        导入配置
                        <input
                          type="file"
                          accept=".json"
                          onChange={importConfig}
                          className="hidden"
                        />
                      </label>
                      
                      <button
                        onClick={syncJSONConfig}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        从JSON同步
                      </button>
                      
                      <button
                        onClick={saveToJSONFormat}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                      >
                        保存到JSON
                      </button>
                      
                      <button
                        onClick={resetConfig}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        重置配置
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      配置数据存储在 Chrome 同步存储中，会在您的设备间自动同步。<br/>
                      • "从JSON同步"：从配置文件重新加载最新的快捷链接和基础模型<br/>
                      • "保存到JSON"：将当前配置导出为JSON文件，可手动替换源文件保持同步
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'links' && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">链接管理</h2>
                  <button
                    onClick={addLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    + 添加链接
                  </button>
                </div>
                
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    点击单元格直接编辑，失去焦点自动保存。每行最多5个链接，最多支持{MAX_LINKS}个。
                  </p>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ 注意：在此处修改的链接只保存到浏览器存储中。如需与源代码保持同步，请在"数据管理"页面使用"保存到JSON"功能。
                    </p>
                  </div>
                </div>

                {/* 链接表格 */}
                <div className="space-y-8">
                  {config.links.map((row, rowIndex) => (
                    <div key={rowIndex}>
                      <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-4">
                        第 {rowIndex + 1} 行 ({row.length}/{LINKS_PER_ROW})
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-blue-50 dark:bg-blue-900/30 border-b-2 border-blue-200 dark:border-blue-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">图标</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">标题</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">URL</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">操作</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {row.map((link) => (
                              <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                {/* 图标列 */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                                      {link.icon ? (
                                        <img 
                                          src={link.icon} 
                                          alt={`${link.title} icon`}
                                          className="w-6 h-6 rounded"
                                          onError={(e) => {
                                             // 图标加载失败时显示默认图标
                                             const img = e.currentTarget as HTMLImageElement
                                             const fallback = img.nextElementSibling as HTMLElement
                                             img.style.display = 'none'
                                             if (fallback) fallback.style.display = 'block'
                                           }}
                                        />
                                      ) : null}
                                      <div 
                                        className={`w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold ${link.icon ? 'hidden' : 'block'}`}
                                      >
                                        {link.title.charAt(0).toUpperCase()}
                                      </div>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                      <button
                                        onClick={async () => {
                                          const iconUrl = IconUtils.getFaviconUrl(link.url)
                                          const newConfig = { ...config }
                                          const targetLink = newConfig.links.flat().find(l => l.id === link.id)
                                          if (targetLink) {
                                            targetLink.icon = iconUrl
                                            setConfig(newConfig)
                                            await saveConfig(newConfig)
                                          }
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        title="自动获取图标"
                                      >
                                        自动
                                      </button>
                                      {editingCell?.type === 'link' && editingCell.id === link.id && editingCell.field === 'icon' ? (
                                        <input
                                          type="url"
                                          defaultValue={link.icon || ''}
                                          placeholder="图标URL"
                                          onBlur={(e) => handleCellBlur(e.target.value)}
                                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                          className="w-20 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                          autoFocus
                                        />
                                      ) : (
                                        <button
                                          onClick={() => handleCellEdit('link', link.id, 'icon')}
                                          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                          title="编辑图标URL"
                                        >
                                          编辑
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                {/* 标题列 */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {editingCell?.type === 'link' && editingCell.id === link.id && editingCell.field === 'title' ? (
                                    <input
                                      type="text"
                                      defaultValue={link.title}
                                      onBlur={(e) => handleCellBlur(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                      className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                      autoFocus
                                    />
                                  ) : (
                                    <div
                                      onClick={() => handleCellEdit('link', link.id, 'title')}
                                      className="font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded"
                                    >
                                      {link.title}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {editingCell?.type === 'link' && editingCell.id === link.id && editingCell.field === 'url' ? (
                                    <input
                                      type="url"
                                      defaultValue={link.url}
                                      onBlur={(e) => handleCellBlur(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                      className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                      autoFocus
                                    />
                                  ) : (
                                    <div
                                      onClick={() => handleCellEdit('link', link.id, 'url')}
                                      className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded truncate max-w-xs"
                                    >
                                      {link.url}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <button
                                    onClick={() => deleteLink(link.id)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    删除
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">模型管理</h2>
                  
                  <div className="flex flex-col items-end">
                    <button
                      onClick={addBasicModel}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      + 添加模型
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {(() => {
                        const targetType = modelFilter === 'all' ? 'language' : 
                                          (modelFilter === 'language' ? 'language' : 'multimedia')
                        const modelsOfType = config.basicModels.filter(model => model.type === targetType)
                        const typeName = getBasicTypeDisplayName(targetType)
                        return `${typeName}: ${modelsOfType.length}/6`
                      })()}
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  一般模式下只需配置模型的页面地址，数据来源于JSON配置文件。
                </p>
                
                {/* 模型筛选 */}
                <div className="flex space-x-2 mb-6">
                  {(['all', 'language', 'multimedia'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setModelFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        modelFilter === filter
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {filter === 'all' ? '全部' : 
                       filter === 'language' ? '语言模型' : '多媒体模型'}
                    </button>
                  ))}
                </div>

                {/* 模型表格 */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-green-50 dark:bg-green-900/30 border-b-2 border-green-200 dark:border-green-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">名称</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">类型</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">页面地址</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">颜色</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredBasicModels.map((model) => (
                        <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingCell?.type === 'basicModel' && editingCell.id === model.id && editingCell.field === 'name' ? (
                              <input
                                type="text"
                                defaultValue={model.name}
                                onBlur={(e) => handleCellBlur(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                autoFocus
                              />
                            ) : (
                              <div
                                onClick={() => handleCellEdit('basicModel', model.id, 'name')}
                                className="font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded"
                              >
                                {model.name}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingCell?.type === 'basicModel' && editingCell.id === model.id && editingCell.field === 'type' ? (
                              <select
                                defaultValue={model.type}
                                onBlur={(e) => handleCellBlur(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                className="p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                autoFocus
                              >
                                <option value="language">语言模型</option>
                                <option value="multimedia">多媒体模型</option>
                              </select>
                            ) : (
                              <div
                                onClick={() => handleCellEdit('basicModel', model.id, 'type')}
                                className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded"
                              >
                                {getBasicTypeDisplayName(model.type)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingCell?.type === 'basicModel' && editingCell.id === model.id && editingCell.field === 'url' ? (
                              <input
                                type="url"
                                defaultValue={model.url || ''}
                                onBlur={(e) => handleCellBlur(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="输入页面地址"
                                autoFocus
                              />
                            ) : (
                              <div
                                onClick={() => handleCellEdit('basicModel', model.id, 'url')}
                                className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded truncate max-w-xs"
                              >
                                {model.url || '点击设置'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingCell?.type === 'basicModel' && editingCell.id === model.id && editingCell.field === 'selectedColor' ? (
                              <input
                                type="color"
                                defaultValue={model.selectedColor || '#3B82F6'}
                                onBlur={(e) => handleCellBlur(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                                autoFocus
                              />
                            ) : (
                              <div
                                onClick={() => handleCellEdit('basicModel', model.id, 'selectedColor')}
                                className="flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded"
                              >
                                <div
                                  className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 mr-2"
                                  style={{ backgroundColor: model.selectedColor || '#3B82F6' }}
                                ></div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {model.selectedColor || '#3B82F6'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleBasicModel(model.id)}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                model.enabled
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {model.enabled ? '已启用' : '已禁用'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => deleteBasicModel(model.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'fonts' && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">字体管理</h2>
                <FontManager />
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">性能配置</h2>
                <div className="space-y-6">
                  {/* 性能模式选择 */}
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">打开模式</h3>
                    <div className="space-y-3">
                      {/* 节能模式 */}
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          config.performanceSettings.mode === PerformanceMode.ENERGY_SAVING
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        onClick={() => {
                          const newSettings = {
                            ...config.performanceSettings,
                            mode: PerformanceMode.ENERGY_SAVING,
                            energySavingMode: {
                              ...config.performanceSettings.energySavingMode,
                              enabled: true
                            },
                            efficientMode: {
                              ...config.performanceSettings.efficientMode,
                              enabled: false
                            }
                          }
                          const newConfig = {...config, performanceSettings: newSettings}
                          saveConfig(newConfig)
                        }}
                      >
                        <div className="flex items-center mb-2">
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                            config.performanceSettings.mode === PerformanceMode.ENERGY_SAVING
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {config.performanceSettings.mode === PerformanceMode.ENERGY_SAVING && (
                              <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                            )}
                          </div>
                          <h4 className="font-medium text-gray-800 dark:text-gray-200">节能模式</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                          {config.performanceSettings.energySavingMode.description}
                        </p>
                      </div>

                      {/* 高效模式 */}
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          config.performanceSettings.mode === PerformanceMode.EFFICIENT
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        onClick={() => {
                          const newSettings = {
                            ...config.performanceSettings,
                            mode: PerformanceMode.EFFICIENT,
                            energySavingMode: {
                              ...config.performanceSettings.energySavingMode,
                              enabled: false
                            },
                            efficientMode: {
                              ...config.performanceSettings.efficientMode,
                              enabled: true
                            }
                          }
                          const newConfig = {...config, performanceSettings: newSettings}
                          saveConfig(newConfig)
                        }}
                      >
                        <div className="flex items-center mb-2">
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                            config.performanceSettings.mode === PerformanceMode.EFFICIENT
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {config.performanceSettings.mode === PerformanceMode.EFFICIENT && (
                              <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                            )}
                          </div>
                          <h4 className="font-medium text-gray-800 dark:text-gray-200">高效模式</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                          {config.performanceSettings.efficientMode.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 节能模式配置 */}
                  {config.performanceSettings.mode === PerformanceMode.ENERGY_SAVING && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
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
                            value={config.performanceSettings.energySavingMode.delayBetweenModels}
                            onChange={(e) => {
                              const newSettings = {
                                ...config.performanceSettings,
                                energySavingMode: {
                                  ...config.performanceSettings.energySavingMode,
                                  delayBetweenModels: parseInt(e.target.value)
                                }
                              }
                              const newConfig = {...config, performanceSettings: newSettings}
                              saveConfig(newConfig)
                            }}
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
                  {config.performanceSettings.mode === PerformanceMode.EFFICIENT && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
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
                            step="1"
                            value={config.performanceSettings.efficientMode.batchSize}
                            onChange={(e) => {
                              const newSettings = {
                                ...config.performanceSettings,
                                efficientMode: {
                                  ...config.performanceSettings.efficientMode,
                                  batchSize: parseInt(e.target.value)
                                }
                              }
                              const newConfig = {...config, performanceSettings: newSettings}
                              saveConfig(newConfig)
                            }}
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
                            value={config.performanceSettings.efficientMode.delayBetweenBatches}
                            onChange={(e) => {
                              const newSettings = {
                                ...config.performanceSettings,
                                efficientMode: {
                                  ...config.performanceSettings.efficientMode,
                                  delayBetweenBatches: parseInt(e.target.value)
                                }
                              }
                              const newConfig = {...config, performanceSettings: newSettings}
                              saveConfig(newConfig)
                            }}
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
                    {config.performanceSettings.mode === PerformanceMode.ENERGY_SAVING ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        选择8个模型时，将逐个打开，每个模型间隔 {config.performanceSettings.energySavingMode.delayBetweenModels}ms，
                        总耗时约 {(config.performanceSettings.energySavingMode.delayBetweenModels * 7 / 1000).toFixed(1)} 秒
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        选择8个模型时，每批打开 {config.performanceSettings.efficientMode.batchSize} 个，
                        批次间隔 {config.performanceSettings.efficientMode.delayBetweenBatches}ms，
                        共需 {Math.ceil(8 / config.performanceSettings.efficientMode.batchSize)} 批，
                        总耗时约 {((Math.ceil(8 / config.performanceSettings.efficientMode.batchSize) - 1) * config.performanceSettings.efficientMode.delayBetweenBatches / 1000).toFixed(1)} 秒
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>


    </div>
  )
}

/**
 * 初始化选项页面
 */
function init() {
  const rootContainer = document.querySelector('#__plasmo')
  if (!rootContainer) {
    throw new Error('Failed to find the root container')
  }

  const root = createRoot(rootContainer)
  root.render(<OptionsPage />)
}

init()
