import React, { useState } from 'react'
import './style.css'

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
 * 模式枚举
 */
const TabMode = {
  MINIMAL: 'minimal',
  NORMAL: 'normal', 
  PRO: 'pro'
}

/**
 * 模式配置
 */
const modeConfig = {
  [TabMode.MINIMAL]: {
    title: '极简模式',
    description: '纯净的空白页面',
    icon: '○'
  },
  [TabMode.NORMAL]: {
    title: '一般模式', 
    description: '快捷链接和AI对话',
    icon: '◐'
  },
  [TabMode.PRO]: {
    title: 'Pro 模式',
    description: '完整的AI对话界面',
    icon: '●'
  }
}

/**
 * 新标签页组件
 */
function NewTabPage() {
  // 当前模式状态
  const [currentMode, setCurrentMode] = useState(TabMode.MINIMAL)
  const [showModeSelector, setShowModeSelector] = useState(false)

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
        return (
          <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">一般模式</h1>
              <p className="text-gray-600 dark:text-gray-400">快捷链接和AI对话功能开发中...</p>
            </div>
          </div>
        )
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
        return renderModeContent()
    }
  }

  return (
    <div className="relative">
      {/* 模式切换按钮 */}
      <button
        onClick={() => setShowModeSelector(true)}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
        title="切换模式 (Ctrl+Shift+M)"
      >
        <div className="text-lg">{modeConfig[currentMode].icon}</div>
      </button>

      {/* 调试信息面板 */}
      <div className="absolute top-4 left-4 p-3 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 z-50">
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

      {/* 模式选择器 */}
      {showModeSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">选择模式</h2>
            <div className="space-y-3">
              {Object.entries(modeConfig).map(([mode, config]) => (
                <button
                  key={mode}
                  onClick={() => {
                    setCurrentMode(mode)
                    setShowModeSelector(false)
                  }}
                  className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    currentMode === mode
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{config.icon}</div>
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">{config.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{config.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModeSelector(false)}
              className="w-full mt-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 当前模式内容 */}
      {renderModeContent()}
    </div>
  )
}

export default NewTabPage