import React from 'react'
import { useFontSettings } from '../hooks/useFontSettings'
import { fontInjector } from '../utils/fontInjector'

/**
 * 字体管理组件
 * 提供字体选择和基础排版配置功能
 */
export const FontManager: React.FC = () => {
  const {
    fontSettings,
    availableFonts,
    loading,
    enableFont,
    updateFontSize,
    updateLineHeight,
    toggleApplyToAllPages,
    getEnabledFont
  } = useFontSettings()

  const enabledFont = getEnabledFont()

  /**
   * 处理字体选择
   */
  const handleFontSelect = async (fontId: string) => {
    const font = availableFonts.find(f => f.id === fontId)
    if (font) {
      await enableFont(fontId)
      // 应用字体到当前页面
      await fontInjector.applyFontSettings(font, fontSettings)
    }
  }

  /**
   * 处理字体大小变化
   */
  const handleFontSizeChange = (size: number) => {
    updateFontSize(size)
    if (enabledFont) {
      fontInjector.applyFontSettings(enabledFont, { ...fontSettings, fontSize: size })
    }
  }

  /**
   * 处理行高变化
   */
  const handleLineHeightChange = (lineHeight: number) => {
    updateLineHeight(lineHeight)
    if (enabledFont) {
      fontInjector.applyFontSettings(enabledFont, { ...fontSettings, lineHeight })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink/70"></div>
        <span className="ml-2 text-ink2">加载字体配置中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 字体设置 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 字体大小 */}
        <div>
          <label className="block text-sm font-medium text-ink2 mb-2">
            字体大小: {fontSettings.fontSize}px
          </label>
          <input
            type="range"
            min="12"
            max="24"
            step="1"
            value={fontSettings.fontSize}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-bg3 accent-[var(--accent)]"
          />
          <div className="flex justify-between text-xs text-ink3 mt-1">
            <span>12px</span>
            <span>24px</span>
          </div>
        </div>

        {/* 行高 */}
        <div>
          <label className="block text-sm font-medium text-ink2 mb-2">
            行高: {fontSettings.lineHeight}
          </label>
          <input
            type="range"
            min="1.2"
            max="2.0"
            step="0.1"
            value={fontSettings.lineHeight}
            onChange={(e) => handleLineHeightChange(Number(e.target.value))}
            className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-bg3 accent-[var(--accent)]"
          />
          <div className="flex justify-between text-xs text-ink3 mt-1">
            <span>1.2</span>
            <span>2.0</span>
          </div>
        </div>
      </div>

      {/* 应用设置 */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="applyToAllPages"
          checked={fontSettings.applyToAllPages}
          onChange={toggleApplyToAllPages}
          className="h-4 w-4 rounded accent-[var(--accent)]"
        />
        <label htmlFor="applyToAllPages" className="ml-2 text-sm text-ink2">
          应用到所有页面
        </label>
      </div>

      {/* 字体列表 */}
      <div>
        <h3 className="text-lg font-semibold text-ink mb-4">可用字体</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableFonts.map(font => (
            <button
              key={font.id}
              type="button"
              onClick={() => handleFontSelect(font.id)}
              className={`cursor-pointer rounded-xl border p-4 text-left transition-all ${
                enabledFont?.id === font.id
                  ? 'border-accent bg-[var(--accent-bg)]'
                  : 'border-line hover:border-line2 hover:bg-card-hover'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4
                  className="font-medium text-ink"
                  style={{ fontFamily: font.fontFamily, fontWeight: font.fontWeight || '400' }}
                >
                  {font.displayName}
                </h4>
                {enabledFont?.id === font.id && (
                  <div className="h-2 w-2 rounded-full bg-accent"></div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
