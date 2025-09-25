import React, { useState, useEffect, useCallback } from 'react'

interface ModeSelectorProps {
  isOpen: boolean
  onClose: () => void
  currentMode: string
  onModeChange: (mode: string) => void
  modeConfig: Record<string, { title: string; description: string; icon: string }>
}

/**
 * 模式选择面板组件
 * 支持快捷键调出和数字键切换
 */
export function ModeSelector({
  isOpen,
  onClose,
  currentMode,
  onModeChange,
  modeConfig
}: ModeSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const modes = Object.keys(modeConfig)

  /**
   * 处理模式选择
   */
  const handleModeSelect = useCallback((index: number) => {
    if (index >= 0 && index < modes.length) {
      const mode = modes[index]
      onModeChange(mode)
      onClose()
    }
  }, [modes, onModeChange, onClose])

  /**
   * 处理键盘事件
   */
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case '1':
          // Command+数字键快速切换模式
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            handleModeSelect(0)
          }
          break
        case '2':
          // Command+数字键快速切换模式
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            handleModeSelect(1)
          }
          break
        case '3':
          // Command+数字键快速切换模式
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            handleModeSelect(2)
          }
          break

        case 'Enter':
          e.preventDefault()
          handleModeSelect(selectedIndex)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handleModeSelect, selectedIndex, modes.length])

  /**
   * 获取当前模式索引 - 仅在面板打开时初始化
   */
  useEffect(() => {
    if (isOpen) {
      const currentIndex = modes.findIndex(mode => mode === currentMode)
      if (currentIndex !== -1) {
        setSelectedIndex(currentIndex)
      }
    }
  }, [isOpen, modes, currentMode])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-96 max-w-[90vw] overflow-hidden">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              选择模式
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                ⌘K
              </kbd>
              <span>打开</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            使用数字键 1-3 快速切换模式
          </p>
        </div>

        {/* 模式选项 */}
        <div className="p-4 space-y-2">
          {modes.map((mode, index) => {
            const config = modeConfig[mode]
            const isSelected = selectedIndex === index
            const isCurrent = currentMode === mode
            
            return (
              <button
                key={mode}
                onClick={() => handleModeSelect(index)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`
                  w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-200
                  ${isSelected 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 transform scale-[1.02]' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'
                  }
                  ${isCurrent ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                `}
              >
                {/* 数字标识 */}
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold
                  ${isSelected 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }
                `}>
                  {index + 1}
                </div>

                {/* 模式图标 */}
                <div className="text-2xl">
                  {config.icon}
                </div>

                {/* 模式信息 */}
                <div className="flex-1 text-left">
                  <div className={`
                    text-base font-medium
                    ${isSelected 
                      ? 'text-blue-700 dark:text-blue-300' 
                      : 'text-gray-800 dark:text-gray-200'
                    }
                  `}>
                    {config.title}
                    {isCurrent && (
                      <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                        当前
                      </span>
                    )}
                  </div>
                  <div className={`
                    text-sm
                    ${isSelected 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}>
                    {config.description}
                  </div>
                </div>

                {/* 选中指示器 */}
                {isSelected && (
                  <div className="text-blue-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* 底部提示 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">

              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border">Enter</kbd>
                <span>选择</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border">Esc</kbd>
              <span>关闭</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}