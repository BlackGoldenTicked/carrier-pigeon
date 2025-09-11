import { useState, useEffect } from 'react'
import { Storage } from '@plasmohq/storage'
import type { UserSettings, TabMode, QuickLink, AIModel } from '@/types'

const storage = new Storage()

/**
 * 默认用户设置
 */
const defaultSettings: UserSettings = {
  mode: 'minimal' as TabMode,
  theme: 'auto',
  quickLinks: [
    {
      id: '1',
      title: 'Google',
      url: 'https://www.google.com',
      icon: 'https://www.google.com/favicon.ico',
      description: '搜索引擎',
      category: '搜索'
    },
    {
      id: '2',
      title: 'GitHub',
      url: 'https://github.com',
      icon: 'https://github.com/favicon.ico',
      description: '代码托管平台',
      category: '开发'
    },
    {
      id: '3',
      title: 'YouTube',
      url: 'https://www.youtube.com',
      icon: 'https://www.youtube.com/favicon.ico',
      description: '视频平台',
      category: '娱乐'
    }
  ],
  aiModels: [
    {
      id: 'gpt-3.5',
      name: 'GPT-3.5 Turbo',
      provider: 'OpenAI',
      model: 'gpt-3.5-turbo',
      maxTokens: 4096,
      temperature: 0.7,
      isActive: true
    }
  ],
  defaultModel: 'gpt-3.5',
  backgroundType: 'solid',
  backgroundValue: '#ffffff',
  showClock: true,
  showWeather: false,
  showSearch: true
}

/**
 * 存储管理 Hook
 * @returns 存储相关的状态和方法
 */
export function useStorage() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * 从存储中加载设置
   */
  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const stored = await storage.get('userSettings')
      if (stored) {
        setSettings({ ...defaultSettings, ...stored })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 保存设置到存储
   * @param newSettings - 新的设置
   */
  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings }
      setSettings(updatedSettings)
      await storage.set('userSettings', updatedSettings)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  /**
   * 更新模式
   * @param mode - 新模式
   */
  const updateMode = async (mode: TabMode) => {
    await saveSettings({ mode })
  }

  /**
   * 更新主题
   * @param theme - 新主题
   */
  const updateTheme = async (theme: 'light' | 'dark' | 'auto') => {
    await saveSettings({ theme })
  }

  /**
   * 添加快捷链接
   * @param link - 新链接
   */
  const addQuickLink = async (link: Omit<QuickLink, 'id'>) => {
    const newLink: QuickLink = {
      ...link,
      id: Date.now().toString()
    }
    const updatedLinks = [...settings.quickLinks, newLink]
    await saveSettings({ quickLinks: updatedLinks })
  }

  /**
   * 删除快捷链接
   * @param id - 链接 ID
   */
  const removeQuickLink = async (id: string) => {
    const updatedLinks = settings.quickLinks.filter(link => link.id !== id)
    await saveSettings({ quickLinks: updatedLinks })
  }

  /**
   * 更新快捷链接
   * @param id - 链接 ID
   * @param updates - 更新内容
   */
  const updateQuickLink = async (id: string, updates: Partial<QuickLink>) => {
    const updatedLinks = settings.quickLinks.map(link =>
      link.id === id ? { ...link, ...updates } : link
    )
    await saveSettings({ quickLinks: updatedLinks })
  }

  /**
   * 添加 AI 模型
   * @param model - 新模型
   */
  const addAIModel = async (model: Omit<AIModel, 'id'>) => {
    const newModel: AIModel = {
      ...model,
      id: Date.now().toString()
    }
    const updatedModels = [...settings.aiModels, newModel]
    await saveSettings({ aiModels: updatedModels })
  }

  /**
   * 删除 AI 模型
   * @param id - 模型 ID
   */
  const removeAIModel = async (id: string) => {
    const updatedModels = settings.aiModels.filter(model => model.id !== id)
    await saveSettings({ aiModels: updatedModels })
  }

  /**
   * 更新 AI 模型
   * @param id - 模型 ID
   * @param updates - 更新内容
   */
  const updateAIModel = async (id: string, updates: Partial<AIModel>) => {
    const updatedModels = settings.aiModels.map(model =>
      model.id === id ? { ...model, ...updates } : model
    )
    await saveSettings({ aiModels: updatedModels })
  }

  /**
   * 重置设置
   */
  const resetSettings = async () => {
    await storage.remove('userSettings')
    setSettings(defaultSettings)
  }

  // 组件挂载时加载设置
  useEffect(() => {
    loadSettings()
  }, [])

  return {
    settings,
    isLoading,
    saveSettings,
    updateMode,
    updateTheme,
    addQuickLink,
    removeQuickLink,
    updateQuickLink,
    addAIModel,
    removeAIModel,
    updateAIModel,
    resetSettings,
    loadSettings
  }
}