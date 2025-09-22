import React, { useState, useEffect } from 'react'
import { FontConfig, FontCategory } from '../types'
import { useFontSettings } from '../hooks/useFontSettings'
import { fontInjector } from '../utils/fontInjector'

/**
 * 字体管理组件
 * 提供字体选择、预览和配置功能
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

  const [selectedCategory, setSelectedCategory] = useState<FontCategory | 'all'>('all')
  const [previewText, setPreviewText] = useState('霞鹜文楷，优雅的中文字体 The quick brown fox jumps over the lazy dog.')

  const enabledFont = getEnabledFont()

  /**
   * 处理字体选择
   */
  const handleFontSelect = async (fontId: string) => {
    const font = availableFonts.find(f => f.id === fontId)
    if (font) {
      await enableFont(fontId)
      // 应用字体到当前页面进行预览
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

  /**
   * 获取分类显示名称
   */
  const getCategoryDisplayName = (category: FontCategory | 'all'): string => {
    const categoryNames = {
      all: '全部',
      handwriting: '手写风格',
      display: '展示字体',
      monospace: '等宽字体',
      'sans-serif': '无衬线',
      serif: '衬线字体'
    }
    return categoryNames[category] || category
  }

  /**
   * 过滤字体列表
   */
  const filteredFonts = selectedCategory === 'all' 
    ? availableFonts 
    : availableFonts.filter(font => font.category === selectedCategory)

  /**
   * 获取可用的分类
   */
  const availableCategories = Array.from(new Set(availableFonts.map(font => font.category)))

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载字体配置中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">字体设置</h2>
        <p className="text-gray-600 mt-1">选择和配置您喜欢的字体样式</p>
      </div>

      {/* 字体预览区域 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">字体预览</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预览文本
            </label>
            <textarea
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={2}
              placeholder="输入预览文本..."
            />
          </div>
          <div 
            className="bg-white p-6 border border-gray-200 rounded-md min-h-[120px] flex items-center justify-center"
            style={{
              fontFamily: enabledFont?.fontFamily || 'inherit',
              fontSize: `${fontSettings.fontSize}px`,
              lineHeight: fontSettings.lineHeight,
              fontWeight: enabledFont?.fontWeight || '400'
            }}
          >
            <div className="text-center">
              <p className="text-lg">{previewText}</p>
              <p className="text-sm text-gray-500 mt-2">
                当前字体: {enabledFont?.displayName || '系统默认'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 字体设置 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 字体大小 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            字体大小: {fontSettings.fontSize}px
          </label>
          <input
            type="range"
            min="12"
            max="24"
            step="1"
            value={fontSettings.fontSize}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>12px</span>
            <span>24px</span>
          </div>
        </div>

        {/* 行高 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            行高: {fontSettings.lineHeight}
          </label>
          <input
            type="range"
            min="1.2"
            max="2.0"
            step="0.1"
            value={fontSettings.lineHeight}
            onChange={(e) => handleLineHeightChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
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
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="applyToAllPages" className="ml-2 text-sm text-gray-700">
          应用到所有页面
        </label>
      </div>

      {/* 字体分类筛选 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">字体分类</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          {availableCategories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getCategoryDisplayName(category)}
            </button>
          ))}
        </div>
      </div>

      {/* 字体列表 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">可用字体</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFonts.map(font => (
            <div
              key={font.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                enabledFont?.id === font.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleFontSelect(font.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{font.displayName}</h4>
                {enabledFont?.id === font.id && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">{font.description}</p>
              <div 
                className="text-sm p-2 bg-white border border-gray-100 rounded"
                style={{
                  fontFamily: font.fontFamily,
                  fontWeight: font.fontWeight || '400'
                }}
              >
                {font.previewText || previewText.substring(0, 20) + '...'}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {getCategoryDisplayName(font.category)}
                </span>
                {font.cssUrl && (
                  <span className="text-xs text-green-600">在线字体</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}