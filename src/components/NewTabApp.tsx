import { useState, useEffect } from 'react'
import { TabMode } from '@/types'
import MinimalMode from './modes/MinimalMode'
import NormalMode from './modes/NormalMode'
import ModeSelector from './ModeSelector'
import { cn } from '@/lib/utils'

/**
 * 新标签页主应用组件
 * 管理不同模式的切换和渲染
 */
export default function NewTabApp() {
  const [currentMode, setCurrentMode] = useState<TabMode>(TabMode.MINIMAL)
  const [isLoading, setIsLoading] = useState(true)
  const [showModeSelector, setShowModeSelector] = useState(false)

  /**
   * 从存储中加载用户设置
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 从本地存储加载用户选择的模式
        const savedMode = localStorage.getItem('newtab-mode')
        if (savedMode && (savedMode === TabMode.MINIMAL || savedMode === TabMode.NORMAL)) {
          setCurrentMode(savedMode as TabMode)
        }
        
        // 模拟加载过程
        await new Promise(resolve => setTimeout(resolve, 300))
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load settings:', error)
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  /**
   * 处理模式切换
   * @param mode - 新模式
   */
  const handleModeChange = (mode: TabMode) => {
    setCurrentMode(mode)
    setShowModeSelector(false)
    
    // 保存用户选择的模式到本地存储
    try {
      localStorage.setItem('newtab-mode', mode)
    } catch (error) {
      console.error('Failed to save mode setting:', error)
    }
  }

  /**
   * 处理键盘快捷键
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + M 切换模式选择器
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'M') {
        event.preventDefault()
        setShowModeSelector(prev => !prev)
      }
      
      // ESC 关闭模式选择器
      if (event.key === 'Escape') {
        setShowModeSelector(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /**
   * 渲染加载状态
   */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  /**
   * 根据当前模式渲染对应组件
   */
  const renderCurrentMode = () => {
    switch (currentMode) {
      case TabMode.MINIMAL:
        return <MinimalMode />
      case TabMode.NORMAL:
        return <NormalMode />
      default:
        return <MinimalMode />
    }
  }

  return (
    <div className={cn(
      "min-h-screen transition-all duration-300",
      currentMode === TabMode.MINIMAL && "bg-white dark:bg-gray-900",
      currentMode === TabMode.NORMAL && "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800"
    )}>
      {/* 模式选择器 */}
      {showModeSelector && (
        <ModeSelector
          currentMode={currentMode}
          onModeChange={handleModeChange}
          onClose={() => setShowModeSelector(false)}
        />
      )}

      {/* 模式切换按钮 */}
      <button
        onClick={() => setShowModeSelector(true)}
        className={cn(
          "fixed top-4 right-4 z-50 p-2 rounded-full transition-all duration-200",
          "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm",
          "border border-gray-200 dark:border-gray-700",
          "hover:bg-white dark:hover:bg-gray-800",
          "hover:scale-110 active:scale-95",
          "shadow-lg hover:shadow-xl"
        )}
        title="切换模式 (Ctrl+Shift+M)"
      >
        <svg
          className="w-5 h-5 text-gray-600 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* 当前模式内容 */}
      <main className="relative z-10">
        {renderCurrentMode()}
      </main>
    </div>
  )
}