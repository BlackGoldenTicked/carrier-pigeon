import React, { useState, useEffect, useCallback } from 'react'

interface ModeSelectorProps {
  isOpen: boolean
  onClose: () => void
  currentMode: string
  onModeChange: (mode: string) => void
  modeConfig: Record<string, { title: string; description: string; icon: string }>
}

/**
 * 模式选择面板组件（⌘K 调出）
 * 支持数字键、方向键与回车选择
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

  const handleModeSelect = useCallback(
    (index: number) => {
      if (index >= 0 && index < modes.length) {
        onModeChange(modes[index])
        onClose()
      }
    },
    [modes, onModeChange, onClose]
  )

  /** 面板内键盘交互 */
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % modes.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + modes.length) % modes.length)
          break
        case '1':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            handleModeSelect(0)
          }
          break
        case '2':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            handleModeSelect(1)
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

  /** 打开时定位到当前模式 */
  useEffect(() => {
    if (isOpen) {
      const currentIndex = modes.findIndex((mode) => mode === currentMode)
      if (currentIndex !== -1) {
        setSelectedIndex(currentIndex)
      }
    }
  }, [isOpen, modes, currentMode])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-label="选择模式"
    >
      <div className="w-96 max-w-[90vw] overflow-hidden rounded-token border border-line bg-card shadow-token-l">
        {/* 头部 */}
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">选择模式</h2>
            <kbd className="rounded-token-sm border border-line bg-bg2 px-2 py-1 text-xs text-ink3">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* 模式选项 */}
        <div className="space-y-1 p-3">
          {modes.map((mode, index) => {
            const config = modeConfig[mode]
            const isSelected = selectedIndex === index
            const isCurrent = currentMode === mode

            return (
              <button
                key={mode}
                onClick={() => handleModeSelect(index)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center gap-3 rounded-token-sm border px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'border-accent bg-[var(--accent-bg)]'
                    : 'border-transparent hover:bg-bg2'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-token-sm text-xs font-semibold tabular-nums ${
                    isSelected ? 'bg-accent text-white' : 'bg-bg2 text-ink2'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-xl" aria-hidden>
                  {config.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    {config.title}
                    {isCurrent && (
                      <span className="rounded-full bg-[var(--accent-bg)] px-2 py-0.5 text-[10px] text-accent-deep">
                        当前
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-ink3">{config.description}</span>
                </span>
              </button>
            )
          })}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between border-t border-line bg-bg2 px-5 py-3 text-xs text-ink3">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line bg-card px-1.5 py-0.5">Enter</kbd>
            选择
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line bg-card px-1.5 py-0.5">Esc</kbd>
            关闭
          </span>
        </div>
      </div>
    </div>
  )
}
