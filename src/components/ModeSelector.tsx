import { useState, useEffect } from 'react'
import { TabMode } from '@/types'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { cn } from '@/lib/utils'

interface ModeSelectorProps {
  currentMode: TabMode
  onModeChange: (mode: TabMode) => void
  onClose: () => void
}

/**
 * 模式配置
 */
const modeConfig = {
  [TabMode.MINIMAL]: {
    title: '极简模式',
    description: '纯净的空白页面，专注于简洁体验',
    icon: '○',
    color: 'from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900'
  },
  [TabMode.NORMAL]: {
    title: '一般模式',
    description: '快捷链接和AI对话，平衡功能与简洁',
    icon: '◐',
    color: 'from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-900'
  },
  [TabMode.PRO]: {
    title: 'Pro 模式',
    description: '完整的AI对话界面，专业用户首选',
    icon: '●',
    color: 'from-purple-100 to-pink-200 dark:from-purple-900 dark:to-pink-900'
  }
}

/**
 * 模式选择器组件
 * 允许用户在不同模式之间切换
 */
export default function ModeSelector({ currentMode, onModeChange, onClose }: ModeSelectorProps) {
  const [isVisible, setIsVisible] = useState(false)

  /**
   * 组件挂载动画
   */
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  /**
   * 处理模式选择
   */
  const handleModeSelect = (mode: TabMode) => {
    onModeChange(mode)
  }

  /**
   * 处理键盘事件
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
      // Command+数字键快速切换模式
      if ((event.metaKey || event.ctrlKey) && event.key >= '1' && event.key <= '3') {
        event.preventDefault()
        const modes = [TabMode.MINIMAL, TabMode.NORMAL, TabMode.PRO]
        const index = parseInt(event.key) - 1
        if (modes[index]) {
          handleModeSelect(modes[index])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onModeChange])

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4",
      "transition-all duration-300 ease-out",
      isVisible ? "opacity-100" : "opacity-0"
    )}>
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 模式选择器内容 */}
      <div className={cn(
        "relative z-10 w-full max-w-4xl",
        "transform transition-all duration-300 ease-out",
        isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
      )}>
        <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-gray-200/50 dark:border-gray-700/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              选择新标签页模式
            </CardTitle>
            <CardDescription className="text-base">
              使用数字键 1-3 快速切换，或点击下方卡片选择模式
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(modeConfig).map(([mode, config], index) => {
                const isSelected = currentMode === mode
                return (
                  <div
                    key={mode}
                    className={cn(
                      "relative group cursor-pointer",
                      "transform transition-all duration-200 ease-out",
                      "hover:scale-105 hover:-translate-y-1",
                      isSelected && "scale-105 -translate-y-1"
                    )}
                    onClick={() => handleModeSelect(mode as TabMode)}
                  >
                    <Card className={cn(
                      "h-full border-2 transition-all duration-200",
                      isSelected 
                        ? "border-blue-500 shadow-lg shadow-blue-500/25" 
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600",
                      "bg-gradient-to-br", config.color
                    )}>
                      <CardHeader className="text-center pb-4">
                        <div className="text-4xl mb-2 transition-transform duration-200 group-hover:scale-110">
                          {config.icon}
                        </div>
                        <CardTitle className="text-lg">
                          {config.title}
                          <span className="ml-2 text-sm text-muted-foreground font-normal">
                            ({index + 1})
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <CardDescription className="text-center text-sm leading-relaxed">
                          {config.description}
                        </CardDescription>
                        {isSelected && (
                          <div className="mt-4 flex justify-center">
                            <div className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full">
                              当前模式
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
            
            {/* 底部操作按钮 */}
            <div className="flex justify-center mt-8">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="px-8"
              >
                关闭 (ESC)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}