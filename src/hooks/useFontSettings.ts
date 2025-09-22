import { useState, useEffect, useCallback } from 'react'
import { Storage } from '@plasmohq/storage'
import { FontConfig, FontSettings, FontCategory } from '../types'
import fontConfigData from '../config/fontConfig.json'

const storage = new Storage()
const FONT_SETTINGS_KEY = 'fontSettings'

/**
 * 默认字体设置
 */
const defaultFontSettings: FontSettings = {
  enabledFontId: 'system-default',
  customFonts: [],
  applyToAllPages: true,
  fontSize: 16,
  lineHeight: 1.6
}

/**
 * 字体设置管理Hook
 * 提供字体配置的读取、保存和管理功能
 */
export const useFontSettings = () => {
  const [fontSettings, setFontSettings] = useState<FontSettings>(defaultFontSettings)
  const [availableFonts, setAvailableFonts] = useState<FontConfig[]>([])
  const [loading, setLoading] = useState(true)

  /**
   * 从存储中加载字体设置
   */
  const loadFontSettings = useCallback(async () => {
    try {
      setLoading(true)
      const stored = await storage.get(FONT_SETTINGS_KEY)
      const settings = stored ? JSON.parse(stored) : defaultFontSettings
      
      // 合并默认字体和自定义字体
      const defaultFonts = fontConfigData.defaultFonts as FontConfig[]
      const allFonts = [...defaultFonts, ...settings.customFonts]
      
      setFontSettings(settings)
      setAvailableFonts(allFonts)
    } catch (error) {
      console.error('Failed to load font settings:', error)
      setFontSettings(defaultFontSettings)
      setAvailableFonts(fontConfigData.defaultFonts as FontConfig[])
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 保存字体设置到存储
   */
  const saveFontSettings = useCallback(async (settings: FontSettings) => {
    try {
      await storage.set(FONT_SETTINGS_KEY, JSON.stringify(settings))
      setFontSettings(settings)
    } catch (error) {
      console.error('Failed to save font settings:', error)
    }
  }, [])

  /**
   * 启用指定字体
   */
  const enableFont = useCallback(async (fontId: string) => {
    const updatedSettings = {
      ...fontSettings,
      enabledFontId: fontId
    }
    await saveFontSettings(updatedSettings)
  }, [fontSettings, saveFontSettings])

  /**
   * 添加自定义字体
   */
  const addCustomFont = useCallback(async (font: Omit<FontConfig, 'id' | 'isEnabled'>) => {
    const newFont: FontConfig = {
      ...font,
      id: `custom-${Date.now()}`,
      isEnabled: false
    }
    
    const updatedSettings = {
      ...fontSettings,
      customFonts: [...fontSettings.customFonts, newFont]
    }
    
    await saveFontSettings(updatedSettings)
    setAvailableFonts(prev => [...prev, newFont])
  }, [fontSettings, saveFontSettings])

  /**
   * 删除自定义字体
   */
  const removeCustomFont = useCallback(async (fontId: string) => {
    const updatedSettings = {
      ...fontSettings,
      customFonts: fontSettings.customFonts.filter(font => font.id !== fontId)
    }
    
    // 如果删除的是当前启用的字体，切换到系统默认
    if (fontSettings.enabledFontId === fontId) {
      updatedSettings.enabledFontId = 'system-default'
    }
    
    await saveFontSettings(updatedSettings)
    setAvailableFonts(prev => prev.filter(font => font.id !== fontId))
  }, [fontSettings, saveFontSettings])

  /**
   * 更新字体大小
   */
  const updateFontSize = useCallback(async (fontSize: number) => {
    const updatedSettings = {
      ...fontSettings,
      fontSize
    }
    await saveFontSettings(updatedSettings)
  }, [fontSettings, saveFontSettings])

  /**
   * 更新行高
   */
  const updateLineHeight = useCallback(async (lineHeight: number) => {
    const updatedSettings = {
      ...fontSettings,
      lineHeight
    }
    await saveFontSettings(updatedSettings)
  }, [fontSettings, saveFontSettings])

  /**
   * 切换是否应用到所有页面
   */
  const toggleApplyToAllPages = useCallback(async () => {
    const updatedSettings = {
      ...fontSettings,
      applyToAllPages: !fontSettings.applyToAllPages
    }
    await saveFontSettings(updatedSettings)
  }, [fontSettings, saveFontSettings])

  /**
   * 获取当前启用的字体
   */
  const getEnabledFont = useCallback(() => {
    return availableFonts.find(font => font.id === fontSettings.enabledFontId)
  }, [availableFonts, fontSettings.enabledFontId])

  /**
   * 按分类获取字体
   */
  const getFontsByCategory = useCallback((category: FontCategory) => {
    return availableFonts.filter(font => font.category === category)
  }, [availableFonts])

  /**
   * 重置字体设置
   */
  const resetFontSettings = useCallback(async () => {
    await saveFontSettings(defaultFontSettings)
    setAvailableFonts(fontConfigData.defaultFonts as FontConfig[])
  }, [saveFontSettings])

  // 初始化加载
  useEffect(() => {
    loadFontSettings()
  }, [loadFontSettings])

  return {
    fontSettings,
    availableFonts,
    loading,
    enableFont,
    addCustomFont,
    removeCustomFont,
    updateFontSize,
    updateLineHeight,
    toggleApplyToAllPages,
    getEnabledFont,
    getFontsByCategory,
    resetFontSettings,
    saveFontSettings
  }
}