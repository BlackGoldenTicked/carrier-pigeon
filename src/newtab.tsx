import React, { useState, useEffect } from 'react'
import './style.css'

import { Button as MovingBorderButton, AdvancedMovingBorder } from './components/ui/moving-border'
import { AnimatedBorder, AnimatedBorderContainer } from './components/ui/animated-border'
import { ModeSelector } from './components/ui/mode-selector'
import { getQuickLinks, getAIModels, getModeConfig, getTabMode, getPerformanceConfig } from './utils/configLoader'
import { AIModelCategory, PerformanceMode } from './types'
import { useFontSettings } from './hooks/useFontSettings'
import { fontInjector } from './utils/fontInjector'
import { PerformanceOptimizer } from './utils/performanceOptimizer'
import ProMode from './components/modes/ProMode'


/**
 * 初始化系统主题检测
 */
function initTheme() {
  const updateTheme = () => {
    // 检测系统主题偏好
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const isDarkSystem = mediaQuery.matches
    
    // 检测当前时间（作为备用方案）
    const hour = new Date().getHours()
    const isDarkTime = hour < 7 || hour > 19
    
    // 决定最终主题（优先级：系统偏好 > 时间 > 默认亮色）
    let finalDark = isDarkSystem
    
    // 如果系统检测失败，使用时间作为备用
    if (!isDarkSystem && isDarkTime) {
      finalDark = true
    }
    
    if (finalDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  }
  
  updateTheme()
  
  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', updateTheme)
  
  // 每分钟检查一次（用于时间备用方案）
  setInterval(updateTheme, 60000)
}

// 初始化主题
initTheme()

/**
 * 配置数据类型定义
 */
interface LinkConfig {
  id: number
  title: string
  url: string
  icon?: string // 网站图标URL，可选字段
}

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
  basicModels: BasicModelConfig[]
  theme: 'light' | 'dark'
}

/**
 * 从JSON配置文件加载默认数据
 */
const TabMode = getTabMode()
const defaultQuickLinks = getQuickLinks()
const defaultAIModelCategories = getAIModels()
const modeConfig = getModeConfig()

// 扁平化所有AI模型用于兼容性
const allAIModels = defaultAIModelCategories.flatMap(category => category.models)

/**
 * 一般模式组件
 */
function NormalMode() {
  const [selectedLinks, setSelectedLinks] = useState(new Set())
  const [selectedModels, setSelectedModels] = useState(new Set()) // 不默认选择任何模型
  const [inputText, setInputText] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState(null)
  const [config, setConfig] = useState<ConfigData>({
    links: defaultQuickLinks,
    basicModels: [],
    theme: 'light'
  })

  /**
   * 智能合并配置数据
   * @param storedConfig 存储中的配置
   * @param jsonConfig JSON文件中的配置
   * @returns 合并后的配置
   */
  const mergeConfigs = (storedConfig: ConfigData | null, jsonConfig: ConfigData): ConfigData => {
    if (!storedConfig) {
      return jsonConfig
    }

    // 智能合并链接：保留用户自定义的链接，补充JSON中新增的链接
    const mergedLinks = [...jsonConfig.links]
    
    // 智能合并基础模型：保留用户的启用状态和颜色设置
    const mergedBasicModels = jsonConfig.basicModels.map(jsonModel => {
      const storedModel = storedConfig.basicModels.find(m => m.id === jsonModel.id)
      return storedModel ? {
        ...jsonModel,
        enabled: storedModel.enabled,
        selectedColor: storedModel.selectedColor
      } : jsonModel
    })

    return {
      ...storedConfig,
      links: mergedLinks,
      basicModels: mergedBasicModels
    }
  }

  /**
   * 从storage加载配置并智能合并JSON数据
   */
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // 检查localStorage中是否有更新的quickLinks数据
        let quickLinksData = defaultQuickLinks
        const localQuickLinks = localStorage.getItem('mytab-quicklinks')
        if (localQuickLinks) {
          try {
            quickLinksData = JSON.parse(localQuickLinks)
            console.log('📋 从localStorage加载quickLinks数据')
          } catch (error) {
            console.error('解析localStorage中的quickLinks数据失败:', error)
          }
        }
        
        // 准备JSON默认配置
        const jsonDefaultConfig: ConfigData = {
          links: quickLinksData, // 使用localStorage中的数据或默认数据
          basicModels: defaultAIModelCategories.flatMap(category => 
            category.models.map(model => ({
              id: model.id,
              name: model.name,
              type: model.type as 'language' | 'multimedia',
              url: model.url,
              enabled: true,
              selectedColor: model.selectedColor
            }))
          ),
          theme: 'light' as const
        }

        // 从storage加载配置
        const result = await chrome.storage.sync.get(['mytab-config'])
        const storedConfig = result['mytab-config'] || null
        
        // 智能合并配置
        const mergedConfig = mergeConfigs(storedConfig, jsonDefaultConfig)
        
        setConfig(mergedConfig)
        
        // 如果配置有变化，同步到storage
        if (!storedConfig || JSON.stringify(storedConfig) !== JSON.stringify(mergedConfig)) {
          await chrome.storage.sync.set({ 'mytab-config': mergedConfig })
          console.log('✅ 新标签页配置已同步到存储')
        }
        
      } catch (error) {
        console.error('Failed to load config:', error)
        // 使用默认配置作为fallback
        const fallbackConfig: ConfigData = {
          links: defaultQuickLinks,
          basicModels: defaultAIModelCategories.flatMap(category => 
            category.models.map(model => ({
              id: model.id,
              name: model.name,
              type: model.type as 'language' | 'multimedia',
              url: model.url,
              enabled: true,
              selectedColor: model.selectedColor
            }))
          ),
          theme: 'light' as const
        }
        setConfig(fallbackConfig)
      }
    }

    loadConfig()

    // 监听localStorage变化，实时更新quickLinks
    const handleLocalStorageChange = (e: StorageEvent) => {
      if (e.key === 'mytab-quicklinks' && e.newValue) {
        try {
          const newQuickLinks = JSON.parse(e.newValue)
          setConfig(prevConfig => ({
            ...prevConfig,
            links: newQuickLinks
          }))
          console.log('📋 检测到quickLinks更新，已同步')
        } catch (error) {
          console.error('解析更新的quickLinks数据失败:', error)
        }
      }
    }

    // 监听chrome.storage变化，实现实时同步
    const handleChromeStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      // 只监听sync存储区域的变化
      if (areaName === 'sync' && changes['mytab-config'] && changes['mytab-config'].newValue) {
        setConfig(changes['mytab-config'].newValue)
      }
    }

    // 添加监听器
    window.addEventListener('storage', handleLocalStorageChange)
    chrome.storage.onChanged.addListener(handleChromeStorageChange)

    // 清理监听器
    return () => {
      window.removeEventListener('storage', handleLocalStorageChange)
      chrome.storage.onChanged.removeListener(handleChromeStorageChange)
    }
  }, [])


  /**
   * 处理链接点击
   */
  const handleLinkClick = (link: any, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + 点击添加到选择
      const newSelected = new Set(selectedLinks)
      if (newSelected.has(link.id)) {
        newSelected.delete(link.id)
      } else {
        newSelected.add(link.id)
      }
      setSelectedLinks(newSelected)
    } else if (selectedLinks.size > 0) {
       // 如果有选中的链接，打开所有选中的
       const allSelected = [...Array.from(selectedLinks), link.id]
       openMultipleLinks(allSelected)
       setSelectedLinks(new Set())
    } else {
      // 普通点击直接打开
      window.open(link.url, '_blank')
    }
  }

  /**
   * 打开多个链接
   */
  const openMultipleLinks = (linkIds: number[]) => {
    const allLinks = [...config.links[0], ...config.links[1]]
    linkIds.forEach((id: number) => {
      const link = allLinks.find(l => l.id === id)
      if (link) {
        window.open(link.url, '_blank')
      }
    })
  }

  /**
   * 处理模型选择
   * 支持多选、单选或不选
   */
  const toggleModel = (modelId: string) => {
    const newSelected = new Set(selectedModels)
    if (newSelected.has(modelId)) {
      // 如果已选中，则取消选择（允许取消所有选择）
      newSelected.delete(modelId)
    } else {
      // 如果未选中，则添加选择
      newSelected.add(modelId)
    }
    setSelectedModels(newSelected)
  }

  /**
   * 处理输入变化
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let value = e.target.value
    if (value.length > 6000) {
      value = value.substring(0, 6000)
    }
    setInputText(value)
  }

  /**
   * 处理键盘事件 - 支持 Cmd/Ctrl + Enter 快捷键发送
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 检测 Cmd(Mac) 或 Ctrl(Windows/Linux) + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault() // 阻止默认的换行行为
      
      // 检查发送条件（与发送按钮相同的逻辑）
      if (inputText.trim() && selectedModels.size > 0) {
        handleSend()
      }
    }
  }

  /**
   * 处理发送 - 自动化流程（支持性能优化）
   */
  const handleSend = async () => {
    // 验证输入文本
    if (!inputText.trim()) {
      alert('请输入要发送的内容')
      return
    }

    // 验证模型选择
    const selectedModelIds = Array.from(selectedModels)
    if (selectedModelIds.length === 0) {
      alert('请至少选择一个AI模型')
      return
    }

    console.log('🔍 [DEBUG] handleSend - 输入的文本:', inputText)
    console.log('🔍 [DEBUG] handleSend - 文本长度:', inputText.length)
    console.log('🔍 [DEBUG] handleSend - 选中的模型:', selectedModelIds)

    // 获取选中模型的详细信息
    const selectedModelDetails = config.basicModels.filter(model => 
      selectedModelIds.includes(model.id) && model.enabled
    )

    if (selectedModelDetails.length === 0) {
      alert('没有可用的模型，请检查模型配置')
      return
    }

    try {
      // 复制文本到剪贴板
      await navigator.clipboard.writeText(inputText)
      console.log('🔍 [DEBUG] handleSend - 已复制到剪贴板的文本:', inputText)
      
      // 获取性能优化器实例
      const optimizer = PerformanceOptimizer.getInstance()
      
      // 获取当前性能配置
      const performanceSettings = optimizer.getSettings()
      const currentMode = performanceSettings.mode
      const estimatedTime = optimizer.getEstimatedTime(selectedModelDetails.length)
      
      // 显示操作提示
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300'
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span>💬 ${currentMode === 'energy_saving' ? '节能模式' : '高效模式'}：正在打开 ${selectedModelDetails.length} 个AI页面，预计耗时 ${estimatedTime}s...</span>
        </div>
      `
      document.body.appendChild(notification)
      
      // 使用性能优化器打开模型页面
      await optimizer.openModelsWithOptimalMode(selectedModelDetails, openModelPage, inputText)

      // 3秒后移除通知
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.opacity = '0'
          setTimeout(() => {
            document.body.removeChild(notification)
          }, 300)
        }
      }, 3000)

      // 清空输入框
      setInputText('')
      // 保留模型选择，方便用户重复使用
      
      console.log(`${currentMode === 'energy_saving' ? '节能模式' : '高效模式'}：已为 ${selectedModelDetails.length} 个AI模型打开页面并自动填充发送`)
    } catch (error) {
      console.error('自动化流程执行失败:', error)
      alert('操作失败，请检查浏览器权限设置')
    }
  }

  /**
   * 为指定模型打开页面并自动填充发送
   * 一般模式：打开AI页面后自动填充文本并发送
   */
  const openModelPage = async (model: BasicModelConfig, text?: string) => {
    try {
      console.log(`🔍 [DEBUG] openModelPage - 正在打开 ${model.name} 页面:`, model.url)
      console.log(`🔍 [DEBUG] openModelPage - 接收到的文本参数:`, text)
      console.log(`🔍 [DEBUG] openModelPage - 文本是否存在:`, !!text)
      console.log(`🔍 [DEBUG] openModelPage - 文本是否非空:`, text && text.trim())
      
      // 如果有文本内容，针对不同模型进行特殊处理
       if (text && text.trim()) {
         // 支持自动填充的模型列表
          const supportedModels: Record<string, { url: string[]; action: string }> = {
            'gpt-4': { url: ['chatgpt.com', 'chat.openai.com'], action: 'autoFillAndSend' },
            'claude-3': { url: ['claude.ai'], action: 'fillAndSend' },
            'kimi': { url: ['kimi.moonshot.cn'], action: 'fillAndSend' },
            'gemini': { url: ['gemini.google.com'], action: 'fillAndSend' },
            'yuanbao': { url: ['yuanbao.tencent.com'], action: 'fillAndSend' },
            'tongyi': {
      url: ['tongyi.aliyun.com', 'qianwen.aliyun.com'],
      action: 'fillAndSend'
    },
            'doubao': { url: ['doubao.com'], action: 'fillAndSend' },
            'wenxin': { url: ['yiyan.baidu.com', 'wenxin.baidu.com'], action: 'fillAndSend' },
            'deepseek': { url: ['chat.deepseek.com'], action: 'fillAndSend' }
          }
          
          // 检查是否为支持的模型 - 优先使用精确ID匹配
          let modelConfig: { url: string[]; action: string } | undefined = supportedModels[model.id]
          
          // 如果没有精确匹配，则检查URL模式匹配（更严格的匹配）
          if (!modelConfig) {
            modelConfig = Object.values(supportedModels).find(config => 
              config.url.some(urlPattern => {
                // 使用更严格的URL匹配：检查域名部分
                const modelDomain = model.url.replace(/^https?:\/\//, '').split('/')[0]
                return modelDomain.includes(urlPattern) || urlPattern.includes(modelDomain)
              })
            )
          }
         
         if (modelConfig) {
           // 支持的模型使用background script打开标签页并发送消息
           try {
             const messageToSend = {
               action: 'openTabAndSendMessage',
               url: model.url,
               message: {
                 action: modelConfig.action,
                 text: text
               }
             }
             console.log(`🔍 [DEBUG] openModelPage - 准备发送消息到background:`, messageToSend)
             
             const response = await new Promise((resolve) => {
               chrome.runtime.sendMessage(messageToSend, resolve)
             })
             console.log(`🔍 [DEBUG] openModelPage - ${model.name}自动填充和发送响应:`, response)
           } catch (error) {
             console.error(`${model.name}自动填充和发送失败:`, error)
             // 降级处理：直接打开页面并复制文本
             window.open(model.url, '_blank')
             await navigator.clipboard.writeText(text)
           }
         } else {
           // 不支持的模型先打开页面，然后复制文本到剪贴板
           window.open(model.url, '_blank')
           await navigator.clipboard.writeText(text)
           console.log(`已复制文本到剪贴板，请在 ${model.name} 页面手动粘贴`)
         }
      } else {
        // 没有文本内容，直接打开页面
        window.open(model.url, '_blank')
        console.log(`已打开 ${model.name} 页面`)
      }
    } catch (error) {
      console.error(`打开 ${model.name} 页面失败:`, error)
      // 降级处理：直接打开页面
      window.open(model.url, '_blank')
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-6 py-12">
        {/* 使用说明 */}
        {/* <div className="mb-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>使用说明：</strong>点击发送后会自动复制文本到剪贴板并打开选中的AI模型页面。支持的模型（Gemini、ChatGPT、Claude等）会自动填充文本并发送，其他模型请手动粘贴。
            </span>
          </div>
        </div> */}
        
        {/* 快捷链接区域 */}
        <div className="mb-16">
          {/* <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">快捷访问</h2> */}
          
          {/* 选择提示 */}
          {selectedLinks.size > 0 && (
            <div className="mb-4 text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                已选择 {selectedLinks.size} 个链接
                <button 
                   onClick={() => {
                     openMultipleLinks(Array.from(selectedLinks) as number[])
                     setSelectedLinks(new Set())
                   }}
                  className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  全部打开
                </button>
                <button 
                  onClick={() => setSelectedLinks(new Set())}
                  className="ml-1 px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  清除
                </button>
              </span>
            </div>
          )}

          {/* 快捷链接 */}
           <div className="space-y-4">
             {config.links.map((row: LinkConfig[], rowIndex: number) => (
               <AnimatedBorderContainer
                 key={rowIndex}
                 className="flex justify-center space-x-6 max-w-6xl mx-auto"
                 autoPlay={true}
                 interval={3000}
               >
                 {row.map((link: LinkConfig) => (
                   <div key={link.id} className="relative">
                     <AdvancedMovingBorder
                       borderRadius="0.75rem"
                       containerClassName="min-w-40 max-w-52 h-11"
                       className={`text-sm font-medium transition-all duration-300 ${
                         selectedLinks.has(link.id)
                           ? 'bg-blue-500 text-white shadow-lg'
                           : 'bg-white dark:bg-slate-900 text-black dark:text-white'
                       }`}
                       duration={8000}
                       onClick={(e) => handleLinkClick(link, e)}
                     >
                       <div className="flex items-center justify-center space-x-2">
                         {link.icon && (
                           <img 
                             src={link.icon} 
                             alt={`${link.title} icon`}
                             className="w-4 h-4 flex-shrink-0"
                             onError={(e) => {
                               // 如果图标加载失败，隐藏图标
                               e.currentTarget.style.display = 'none';
                             }}
                           />
                         )}
                         <span className="truncate">{link.title}</span>
                       </div>
                     </AdvancedMovingBorder>
                     
                     {/* 选中指示器 */}
                     {selectedLinks.has(link.id) && (
                       <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center z-20">
                         <span className="text-xs font-bold text-gray-800">✓</span>
                       </div>
                     )}
                   </div>
                 ))}
               </AnimatedBorderContainer>
             ))}
           </div>

          {/* 使用提示 */}
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            💡 按住 Ctrl/Cmd 点击可多选链接，松开后点击任意链接批量打开
          </div>
        </div>

        {/* AI 搜索框区域 */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* 彩虹边框容器 */}
            <div className="relative p-1 rounded-3xl bg-gradient-to-r from-pink-500 via-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 animate-gradient-x">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6">
                {/* 模型选择区域 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col space-y-3 flex-1">
                    {/* 语言模型 */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">
                        语言模型:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {config.basicModels.filter(model => model.type === 'language' && model.enabled).map((model: BasicModelConfig) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              toggleModel(model.id)
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                              selectedModels.has(model.id)
                                ? 'text-white shadow-md'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                            style={{
                              backgroundColor: selectedModels.has(model.id) ? model.selectedColor : undefined
                            }}
                            title={`${model.name} - 点击选择模型`}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* 多模态模型 */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">
                      多模态:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {config.basicModels.filter(model => model.type === 'multimedia' && model.enabled).map((model: BasicModelConfig) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              toggleModel(model.id)
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                              selectedModels.has(model.id)
                                ? 'text-white shadow-md'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                            style={{
                              backgroundColor: selectedModels.has(model.id) ? model.selectedColor : undefined
                            }}
                            title={`${model.name} - 点击选择模型`}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                  
                  {/* 模型选择状态和字数统计 */}
                  <div className="flex flex-col items-end space-y-2">
                    {/* 模型选择状态 */}
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      selectedModels.size === 0 
                        ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300' 
                        : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                    }`}>
                      {selectedModels.size === 0 ? '未选择模型' : `已选择 ${selectedModels.size} 个模型`}
                    </div>
                    
                    {/* 字数统计 */}
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {inputText.length}/6000
                    </div>
                  </div>
                </div>

                {/* 输入框 */}
                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="向 AI 提问任何问题..."
                    className="w-full h-32 p-4 pr-16 border-0 resize-none rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                  
                  {/* 发送按钮 */}
                  <div className="absolute bottom-4 right-4">
                    {/* 发送按钮 */}
                    <button 
                      onClick={handleSend}
                      disabled={!inputText.trim() || selectedModels.size === 0}
                      className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                      title={selectedModels.size === 0 ? "请先选择至少一个模型" : !inputText.trim() ? "请输入内容" : "发送消息 (⌘+Enter 或 Ctrl+Enter)"}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


       </div>
     </div>
   )
 }

/**
 * 弹出菜单组件
 */
function PopupMenu({ isOpen, onClose, currentMode, onModeChange }: {
  isOpen: boolean
  onClose: () => void
  currentMode: string
  onModeChange: (mode: string) => void
}) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  


  /**
   * 初始化主题状态
   */
  useEffect(() => {
    const updateTheme = async () => {
      try {
        let savedTheme = 'light'
        
        // 尝试从 Chrome 存储读取主题设置
        if (chrome?.storage?.sync) {
          const result = await chrome.storage.sync.get(['mytab-config'])
          if (result['mytab-config']?.theme) {
            savedTheme = result['mytab-config'].theme
          }
        } else {
          // 降级到 localStorage
          const savedConfig = localStorage.getItem('mytab-config')
          if (savedConfig) {
            const parsed = JSON.parse(savedConfig)
            savedTheme = parsed.theme || 'light'
          }
        }
        
        const shouldBeDark = savedTheme === 'dark'
        
        setIsDarkMode(shouldBeDark)
        
        if (shouldBeDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      } catch (error) {
        console.error('主题加载失败:', error)
        // 降级到亮色主题
        setIsDarkMode(false)
        document.documentElement.classList.remove('dark')
      }
    }

    updateTheme()
  }, [])

  /**
   * 处理主题切换
   */
  const handleThemeChange = async (theme: 'light' | 'dark') => {
    try {
      // 保存主题设置
      const config = { theme }
      
      if (chrome?.storage?.sync) {
        const result = await chrome.storage.sync.get(['mytab-config'])
        const currentConfig = result['mytab-config'] || {}
        await chrome.storage.sync.set({ 'mytab-config': { ...currentConfig, theme } })
      } else {
        const savedConfig = localStorage.getItem('mytab-config')
        const currentConfig = savedConfig ? JSON.parse(savedConfig) : {}
        localStorage.setItem('mytab-config', JSON.stringify({ ...currentConfig, theme }))
      }
      
      // 立即应用主题
      const shouldBeDark = theme === 'dark'
      
      setIsDarkMode(shouldBeDark)
      
      if (shouldBeDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } catch (error) {
      console.error('主题保存失败:', error)
    }
  }



  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 mt-16 mr-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">设置菜单</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* 模式切换 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">页面模式</h4>
            <div className="space-y-2">
              {Object.entries(modeConfig).map(([mode, config]) => (
                <button
                  key={mode}
                  onClick={() => onModeChange(mode)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    currentMode === mode
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="text-lg">{config.icon}</div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{config.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{config.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 主题切换 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">主题模式</h4>
            <div className="flex space-x-2">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`flex-1 p-2 rounded-lg text-sm transition-colors ${
                    !isDarkMode
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  ☀️ 亮色
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`flex-1 p-2 rounded-lg text-sm transition-colors ${
                    isDarkMode
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  🌙 暗色
                </button>
              </div>
          </div>



          {/* 管理功能 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">管理功能</h4>
            <div className="space-y-2">
                <button
                   onClick={() => {
                     if (chrome?.runtime?.openOptionsPage) {
                       chrome.runtime.openOptionsPage()
                     } else {
                       window.open(chrome.runtime.getURL('options.html'))
                     }
                     onClose()
                   }}
                   className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                 >
                   <div className="flex items-center space-x-3">
                     <div className="text-lg">⚙️</div>
                     <div className="text-left">
                       <div className="text-sm font-medium text-gray-800 dark:text-gray-200">扩展设置</div>
                       <div className="text-xs text-gray-500 dark:text-gray-400">管理链接和模型配置</div>
                     </div>
                   </div>
                   <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                   </svg>
                 </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 新标签页组件
 */
/**
 * 同步获取保存的模式，避免异步加载导致的闪烁
 */
function getSavedModeSync(): string {
  try {
    // 优先尝试从 localStorage 同步读取（Chrome扩展环境下localStorage是同步的）
    const saved = localStorage.getItem('mytab-current-mode')
    if (saved && Object.values(TabMode).includes(saved)) {
      return saved
    }
  } catch (error) {
    console.warn('同步读取模式失败:', error)
  }
  
  // 返回默认模式
  return TabMode.NORMAL
}

function NewTabPage() {
  // 使用同步方式获取初始模式，避免闪烁
  const [currentMode, setCurrentMode] = useState(() => getSavedModeSync())
  const [showPopupMenu, setShowPopupMenu] = useState(false)
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 字体设置Hook
  const { fontSettings, getEnabledFont } = useFontSettings()

  // 立即初始化字体设置，避免闪烁
  useEffect(() => {
    const enabledFont = getEnabledFont()
    if (enabledFont && fontSettings.applyToAllPages) {
      fontInjector.initialize(enabledFont, fontSettings)
    }
  }, []) // 只在组件挂载时执行一次

  /**
   * 管理body类，确保极简模式样式立即生效
   */
  useEffect(() => {
    const updateBodyClass = () => {
      // 移除所有模式相关的类
      document.body.classList.remove('minimal-mode', 'normal-mode', 'pro-mode')
      
      // 添加当前模式的类
      if (currentMode === TabMode.MINIMAL) {
        document.body.classList.add('minimal-mode')
      } else if (currentMode === TabMode.NORMAL) {
        document.body.classList.add('normal-mode')
      } else if (currentMode === TabMode.PRO) {
        document.body.classList.add('pro-mode')
      }
    }

    // 立即更新body类
    updateBodyClass()

    // 清理函数
    return () => {
      document.body.classList.remove('minimal-mode', 'normal-mode', 'pro-mode')
    }
  }, [currentMode])

  /**
   * 从Chrome存储异步同步模式（作为备用）
   */
  useEffect(() => {
    const syncModeFromChromeStorage = async () => {
      try {
        // 如果在Chrome扩展环境中，尝试从Chrome存储同步
        if (chrome?.storage?.sync) {
          const result = await chrome.storage.sync.get(['mytab-current-mode'])
          if (result['mytab-current-mode'] && Object.values(TabMode).includes(result['mytab-current-mode'])) {
            const chromeMode = result['mytab-current-mode']
            // 只有当Chrome存储的模式与当前模式不同时才更新
            if (chromeMode !== currentMode) {
              setCurrentMode(chromeMode)
              // 同时更新localStorage保持同步
              localStorage.setItem('mytab-current-mode', chromeMode)
            }
          }
        }
      } catch (error) {
        console.warn('Chrome存储同步失败:', error)
      } finally {
        // 标记加载完成
        setIsLoading(false)
      }
    }

    // 短暂延迟后执行同步，确保页面已经渲染
    const timer = setTimeout(syncModeFromChromeStorage, 50)
    return () => clearTimeout(timer)
  }, [])

  /**
   * 应用字体设置
   * 当字体配置变化时自动应用到页面
   */
  useEffect(() => {
    try {
      const enabledFont = getEnabledFont()
      if (enabledFont && fontSettings.applyToAllPages) {
        // 使用同步方法立即应用，避免闪烁
        fontInjector.applySyncFontSettings(enabledFont, fontSettings)
        console.log(`字体已同步应用: ${enabledFont.displayName}`)
      }
    } catch (error) {
      console.error('应用字体设置失败:', error)
    }
  }, [fontSettings, getEnabledFont])

  /**
   * 处理模式切换并保存到存储
   */
  const handleModeChange = async (mode: string) => {
    try {
      // 立即更新UI
      setCurrentMode(mode)
      
      // 同步保存到localStorage（立即生效）
      localStorage.setItem('mytab-current-mode', mode)
      
      // 异步保存到Chrome存储（作为备用）
      if (chrome?.storage?.sync) {
        chrome.storage.sync.set({ 'mytab-current-mode': mode }).catch(error => {
          console.warn('Chrome存储保存失败:', error)
        })
      }
    } catch (error) {
      console.error('模式保存失败:', error)
    }
  }







  /**
   * 处理全局快捷键
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+K 或 Ctrl+K 调出模式选择面板
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsModeSelectorOpen(true)
        setShowPopupMenu(false)
        return
      }

      // Command+数字键快速切换模式（仅在模式选择面板未打开时）
      if (!isModeSelectorOpen && !showPopupMenu && (e.metaKey || e.ctrlKey)) {
        const modes = Object.keys(modeConfig)
        switch (e.key) {
          case '1':
            e.preventDefault()
            if (modes[0]) handleModeChange(modes[0])
            break
          case '2':
            e.preventDefault()
            if (modes[1]) handleModeChange(modes[1])
            break
          case '3':
            e.preventDefault()
            if (modes[2]) handleModeChange(modes[2])
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModeSelectorOpen, showPopupMenu])

  /**
   * 渲染当前模式的内容
   */
  const renderModeContent = () => {
    // 如果是极简模式，立即返回空白内容，不等待加载完成
    if (currentMode === TabMode.MINIMAL) {
      return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
          {/* 极简模式 - 完全空白 */}
        </div>
      )
    }

    // 对于其他模式，如果还在加载中，显示与目标模式匹配的加载状态
    if (isLoading) {
      switch (currentMode) {
        case TabMode.PRO:
          return (
            <div className="min-h-screen w-full bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">加载中...</p>
              </div>
            </div>
          )
        default:
          // NORMAL模式的加载状态 - 显示简化版本避免闪烁
          return (
            <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">加载中...</p>
                </div>
              </div>
            </div>
          )
      }
    }

    // 加载完成后渲染完整内容
    switch (currentMode) {
      case TabMode.NORMAL:
         return <NormalMode />
      case TabMode.PRO:
        return <ProMode />

      default:
        return <NormalMode />
    }
  }

  return (
    <div className="relative">
      {/* 设置按钮 */}
      <button
        onClick={() => setShowPopupMenu(true)}
        className="fixed top-4 right-4 z-40 p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
        title="设置菜单"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </button>

      {/* 弹出菜单 */}
         <PopupMenu
           isOpen={showPopupMenu}
           onClose={() => setShowPopupMenu(false)}
           currentMode={currentMode}
           onModeChange={(mode) => {
             handleModeChange(mode)
             setShowPopupMenu(false)
           }}
         />

      {/* 模式选择面板 */}
      <ModeSelector
        isOpen={isModeSelectorOpen}
        onClose={() => setIsModeSelectorOpen(false)}
        currentMode={currentMode}
        onModeChange={(mode) => {
          handleModeChange(mode)
          setIsModeSelectorOpen(false)
        }}
        modeConfig={modeConfig}
      />

      {/* 调试信息面板 - 隐藏但保留代码 */}
       <div className="hidden absolute top-4 left-4 p-3 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 z-50">
         <div className="font-bold mb-2">🔍 主题调试信息</div>
         <div id="theme-debug" className="mb-2">检测中...</div>
         <div className="text-xs opacity-70">
           <div>• 按 F12 打开控制台查看详细日志</div>
           <div>• 在系统设置中切换主题测试</div>
         </div>
         <div className="mt-2 text-xs">
           <div>当前模式: {modeConfig[currentMode].title}</div>
           <div>当前背景: <span className="dark:hidden">亮色</span><span className="hidden dark:inline">暗色</span></div>
         </div>
       </div>



      {/* 当前模式内容 */}
      {renderModeContent()}
    </div>
  )
}

export default NewTabPage