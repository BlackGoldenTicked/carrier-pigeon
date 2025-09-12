import React, { useState, useEffect } from 'react'
import './style.css'

import { Button as MovingBorderButton, AdvancedMovingBorder } from './components/ui/moving-border'
import { AnimatedBorder, AnimatedBorderContainer } from './components/ui/animated-border'
import { ModeSelector } from './components/ui/mode-selector'
import { getQuickLinks, getAIModels, getModeConfig, getTabMode } from './utils/configLoader'


/**
 * 初始化系统主题检测
 */
function initTheme() {
  const updateTheme = () => {
    // 检测系统主题偏好
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const isDarkSystem = mediaQuery.matches
    
    // 检测浏览器主题设置
    const isDarkBrowser = document.documentElement.style.colorScheme === 'dark'
    
    // 检测当前时间（作为备用方案）
    const hour = new Date().getHours()
    const isDarkTime = hour < 7 || hour > 19
    
    console.log('🔍 详细主题检测:')
    console.log('  📱 系统偏好:', isDarkSystem ? '暗色' : '亮色')
    console.log('  🌐 浏览器设置:', isDarkBrowser ? '暗色' : '亮色')
    console.log('  ⏰ 当前时间:', hour + ':00', isDarkTime ? '(夜间)' : '(白天)')
    console.log('  🔧 User Agent:', navigator.userAgent.includes('Chrome') ? 'Chrome' : '其他浏览器')
    
    // 决定最终主题（优先级：系统偏好 > 时间 > 默认亮色）
    let finalDark = isDarkSystem
    
    // 如果系统检测失败，使用时间作为备用
    if (!isDarkSystem && isDarkTime) {
      console.log('⚠️ 系统主题检测可能失败，使用时间备用方案')
      finalDark = true
    }
    
    console.log('🎨 最终主题决定:', finalDark ? '暗色模式' : '亮色模式')
    
    if (finalDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
      console.log('✅ 已设置暗色模式')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
      console.log('☀️ 已设置亮色模式')
    }
    
    console.log('📋 当前状态:')
    console.log('  HTML 类名:', document.documentElement.className || '(无类名)')
    console.log('  Color Scheme:', document.documentElement.style.colorScheme)
    
    // 更新调试信息显示
    const debugEl = document.getElementById('theme-debug')
    if (debugEl) {
      debugEl.innerHTML = `
        <div>系统偏好: ${isDarkSystem ? '暗色' : '亮色'}</div>
        <div>浏览器: ${isDarkBrowser ? '暗色' : '亮色'}</div>
        <div>时间: ${hour}:00 ${isDarkTime ? '(夜间)' : '(白天)'}</div>
        <div>最终: ${finalDark ? '暗色' : '亮色'}</div>
        <div>HTML: ${document.documentElement.classList.contains('dark') ? '有dark' : '无dark'}</div>
      `
    }
  }
  
  console.log('🚀 初始化增强主题检测...')
  updateTheme()
  
  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    console.log('🔄 系统主题发生变化:', e.matches ? '暗色模式' : '亮色模式')
    updateTheme()
  })
  
  // 每分钟检查一次（用于时间备用方案）
  setInterval(updateTheme, 60000)
  
  console.log('✨ 增强主题检测初始化完成')
}

// 初始化主题
initTheme()

/**
 * 从JSON配置文件加载数据
 */
const TabMode = getTabMode()
const quickLinks = getQuickLinks()
const aiModels = getAIModels()
const modeConfig = getModeConfig()

/**
 * 一般模式组件
 */
function NormalMode() {
  const [selectedLinks, setSelectedLinks] = useState(new Set())
  const [selectedModels, setSelectedModels] = useState(new Set(['gpt-4']))
  const [inputText, setInputText] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState(null)

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
    const allLinks = [...quickLinks[0], ...quickLinks[1]]
    linkIds.forEach((id: number) => {
      const link = allLinks.find(l => l.id === id)
      if (link) {
        window.open(link.url, '_blank')
      }
    })
  }

  /**
   * 处理模型选择
   */
  const toggleModel = (modelId: string) => {
    const newSelected = new Set(selectedModels)
    if (newSelected.has(modelId)) {
      if (newSelected.size > 1) {
        newSelected.delete(modelId)
      }
    } else {
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
   * 处理发送
   */
  const handleSend = () => {
    if (inputText.trim()) {
      console.log('发送消息:', inputText)
      console.log('选中模型:', Array.from(selectedModels))
      // 这里可以添加实际的发送逻辑
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-6 py-12">
        {/* 快捷链接区域 */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-8 text-center">快捷访问</h2>
          
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
             {quickLinks.map((row, rowIndex) => (
               <AnimatedBorderContainer
                 key={rowIndex}
                 className="flex justify-center space-x-6 max-w-6xl mx-auto"
                 autoPlay={true}
                 interval={3000}
               >
                 {row.map((link) => (
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
                       {link.title}
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
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI 模型:</span>
                    <div className="flex space-x-2">
                      {aiModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => toggleModel(model.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                            selectedModels.has(model.id)
                              ? `${model.color} text-white shadow-md`
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {model.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 字数统计 */}
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {inputText.length}/6000
                  </div>
                </div>

                {/* 输入框 */}
                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="向 AI 提问任何问题..."
                    className="w-full h-32 p-4 pr-20 border-0 resize-none rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                  
                  {/* 右侧按钮组 */}
                  <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                    {/* 语音按钮 */}
                    <button className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* 发送按钮 */}
                    <button 
                      onClick={handleSend}
                      disabled={!inputText.trim()}
                      className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
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
function NewTabPage() {
  // 当前模式状态
  const [currentMode, setCurrentMode] = useState(TabMode.NORMAL)
  const [showPopupMenu, setShowPopupMenu] = useState(false)
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false)

  /**
   * 从存储加载上次保存的模式
   */
  useEffect(() => {
    const loadSavedMode = async () => {
      try {
        let savedMode = TabMode.NORMAL
        
        // 尝试从 Chrome 存储读取模式设置
        if (chrome?.storage?.sync) {
          const result = await chrome.storage.sync.get(['mytab-current-mode'])
          if (result['mytab-current-mode']) {
            savedMode = result['mytab-current-mode']
          }
        } else {
          // 降级到 localStorage
          const saved = localStorage.getItem('mytab-current-mode')
          if (saved) {
            savedMode = saved
          }
        }
        
        // 验证模式是否有效
        if (Object.values(TabMode).includes(savedMode)) {
          setCurrentMode(savedMode)
        }
      } catch (error) {
        console.error('模式加载失败:', error)
        // 降级到默认模式
        setCurrentMode(TabMode.NORMAL)
      }
    }

    loadSavedMode()
  }, [])

  /**
   * 处理模式切换并保存到存储
   */
  const handleModeChange = async (mode: string) => {
    try {
      // 立即更新UI
      setCurrentMode(mode)
      
      // 保存到存储
      if (chrome?.storage?.sync) {
        await chrome.storage.sync.set({ 'mytab-current-mode': mode })
      } else {
        localStorage.setItem('mytab-current-mode', mode)
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

      // 数字键快速切换模式（仅在模式选择面板未打开时）
      if (!isModeSelectorOpen && !showPopupMenu) {
        const modes = Object.keys(modeConfig)
        switch (e.key) {
          case '1':
            if (modes[0]) handleModeChange(modes[0])
            break
          case '2':
            if (modes[1]) handleModeChange(modes[1])
            break
          case '3':
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
    switch (currentMode) {
      case TabMode.MINIMAL:
        return (
          <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            {/* 极简模式 - 完全空白 */}
          </div>
        )
      case TabMode.NORMAL:
         return <NormalMode />
      case TabMode.PRO:
        return (
          <div className="min-h-screen w-full bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">Pro 模式</h1>
              <p className="text-gray-600 dark:text-gray-400">完整的AI对话界面开发中...</p>
            </div>
          </div>
        )

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