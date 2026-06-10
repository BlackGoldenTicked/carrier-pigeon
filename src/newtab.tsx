import React, { useState, useEffect } from 'react'
import './style.css'

import { ModeSelector } from './components/ui/mode-selector'
import { VideoBackground } from './components/ui/VideoBackground'
import { ImageBackground } from './components/ui/ImageBackground'
import { getAIIcon } from './components/icons/ai'
import { ArrowUpIcon, SettingsIcon, LinkIcon, SunIcon, MoonIcon, VideoIcon, VideoOffIcon, ImageIcon, ImageOffIcon } from './components/icons/ui'
import { getQuickLinks, getAIModels, getModeConfig, getTabMode } from './utils/configLoader'
import { useFontSettings } from './hooks/useFontSettings'
import { fontInjector } from './utils/fontInjector'
import { getRandomQuote } from './config/quotes'
import { startTitleMarquee } from './utils/titleMarquee'
import { ensureHeroFonts } from './utils/heroFonts'
import { getHeroTitleConfig, applyHeroTitleStyle, DEFAULT_HERO_TITLE } from './utils/heroTitle'
import { getVideoSource, loadLocalVideoURL } from './utils/videoSource'
import { getImageSource, loadLocalImageURL } from './utils/imageSource'
import { getImageEffect } from './utils/imageEffect'
import heroVideoUrl from 'url:./assets/hero.mp4'

/** Hero 背景视频（本地内置 720p 低码率版本，省内存、离线、无需联网） */
const HERO_VIDEO_URL = heroVideoUrl

/** 打开扩展设置页 */
function openOptionsPage(): void {
  if (chrome?.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage()
  } else {
    window.open(chrome.runtime.getURL('options.html'), '_blank')
  }
}

/**
 * 背景模式（视频 / 图片 / 无）—— 单一状态来源，三者互斥
 * - 'video'：内置/在线/本地背景视频（默认，老机器可切到 none 提升性能）
 * - 'image'：背景图片（需先在设置中配置图片来源）
 * - 'none' ：纯色背景
 */
type BgMode = 'video' | 'image' | 'none'

const BG_MODE_KEY = 'mytab-bg-mode'
/** 旧版背景视频开关 key（用于一次性迁移） */
const LEGACY_BG_VIDEO_KEY = 'mytab-bg-video'

function readBgMode(): BgMode {
  try {
    const saved = localStorage.getItem(BG_MODE_KEY)
    if (saved === 'video' || saved === 'image' || saved === 'none') {
      return saved
    }
    // 迁移旧偏好：此前仅有「背景视频开关」，关 → none，其余 → video
    const legacyVideoOff = localStorage.getItem(LEGACY_BG_VIDEO_KEY) === '0'
    return legacyVideoOff ? 'none' : 'video'
  } catch {
    return 'video'
  }
}

function writeBgMode(mode: BgMode): void {
  try {
    localStorage.setItem(BG_MODE_KEY, mode)
  } catch {
    /* 忽略存储异常 */
  }
}

/** 主题偏好（深/浅），未设置时跟随当前 <html> 上的 .dark（由 initTheme 按系统设置） */
const THEME_KEY = 'mytab-theme'

function readDarkPref(): boolean {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark') return true
    if (saved === 'light') return false
  } catch {
    /* 忽略 */
  }
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

function writeDarkPref(isDark: boolean): void {
  try {
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
  } catch {
    /* 忽略存储异常 */
  }
}


/**
 * 初始化系统主题检测
 */
function initTheme() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const updateTheme = () => {
    if (mediaQuery.matches) {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  }

  updateTheme()
  mediaQuery.addEventListener('change', updateTheme)
}

// 初始化主题
initTheme()

/**
 * 配置数据类型定义
 */
interface LinkConfig {
  id: number
  title: string
  url: string
  icon?: string // 网站图标URL，可选字段
}

interface BasicModelConfig {
  id: string
  name: string
  type: 'language' | 'multimedia'
  url: string
  enabled: boolean
  selectedColor?: string
}

interface ConfigData {
  links: LinkConfig[][]
  basicModels: BasicModelConfig[]
  theme: 'light' | 'dark'
}

/**
 * 从JSON配置文件加载默认数据
 */
const TabMode = getTabMode()
const defaultQuickLinks = getQuickLinks()
const defaultAIModelCategories = getAIModels()
const modeConfig = getModeConfig()

// 扁平化所有AI模型用于兼容性
const allAIModels = defaultAIModelCategories.flatMap(category => category.models)

/**
 * 一般模式组件
 */
function NormalMode({
  bgVideoEnabled = true,
  bgImageEnabled = true
}: {
  bgVideoEnabled?: boolean
  bgImageEnabled?: boolean
}) {
  const [selectedLinks, setSelectedLinks] = useState(new Set())
  /**
   * 模型选择集合
   * 默认选中全部模型，发送时一起打开
   */
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    new Set(allAIModels.map((model) => model.id))
  )
  const [inputText, setInputText] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState(null)
  const [config, setConfig] = useState<ConfigData>({
    links: defaultQuickLinks,
    basicModels: [],
    theme: 'light'
  })

  /**
   * 智能合并配置数据
   * @param storedConfig 存储中的配置
   * @param jsonConfig JSON文件中的配置
   * @returns 合并后的配置
   */
  const mergeConfigs = (storedConfig: ConfigData | null, jsonConfig: ConfigData): ConfigData => {
    if (!storedConfig) {
      return jsonConfig
    }

    // 智能合并链接：保留用户自定义的链接，补充JSON中新增的链接
    const mergedLinks = [...jsonConfig.links]
    
    // 智能合并基础模型：保留用户的启用状态和颜色设置
    const mergedBasicModels = jsonConfig.basicModels.map(jsonModel => {
      const storedModel = storedConfig.basicModels.find(m => m.id === jsonModel.id)
      return storedModel ? {
        ...jsonModel,
        enabled: storedModel.enabled,
        selectedColor: storedModel.selectedColor
      } : jsonModel
    })

    return {
      ...storedConfig,
      links: mergedLinks,
      basicModels: mergedBasicModels
    }
  }

  /**
   * 从storage加载配置并智能合并JSON数据
   */
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // 准备JSON默认配置
        const jsonDefaultConfig: ConfigData = {
          links: defaultQuickLinks,
          basicModels: defaultAIModelCategories.flatMap(category => 
            category.models.map(model => ({
              id: model.id,
              name: model.name,
              type: model.type as 'language' | 'multimedia',
              url: model.url,
              enabled: true,
              selectedColor: model.selectedColor
            }))
          ),
          theme: 'light' as const
        }

        // 从storage加载配置
        const result = await chrome.storage.sync.get(['mytab-config'])
        const storedConfig = result['mytab-config'] || null
        
        // 智能合并配置
        const mergedConfig = mergeConfigs(storedConfig, jsonDefaultConfig)
        
        setConfig(mergedConfig)
        /**
         * 加载配置后默认选中全部已启用的模型
         */
        setSelectedModels(
          new Set(
            mergedConfig.basicModels
              .filter((m) => m.enabled)
              .map((m) => m.id)
          )
        )

        // 如果配置有变化，同步到storage
        if (!storedConfig || JSON.stringify(storedConfig) !== JSON.stringify(mergedConfig)) {
          await chrome.storage.sync.set({ 'mytab-config': mergedConfig })
          console.log('✅ 新标签页配置已同步到存储')
        }
        
      } catch (error) {
        console.error('Failed to load config:', error)
        // 使用默认配置作为fallback
        const fallbackConfig: ConfigData = {
          links: defaultQuickLinks,
          basicModels: defaultAIModelCategories.flatMap(category => 
            category.models.map(model => ({
              id: model.id,
              name: model.name,
              type: model.type as 'language' | 'multimedia',
              url: model.url,
              enabled: true,
              selectedColor: model.selectedColor
            }))
          ),
          theme: 'light' as const
        }
        setConfig(fallbackConfig)
      }
    }

    loadConfig()

    // 监听chrome.storage变化，实现实时同步
    const handleChromeStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'sync' && changes['mytab-config'] && changes['mytab-config'].newValue) {
        setConfig(changes['mytab-config'].newValue)
      }
    }

    chrome.storage.onChanged.addListener(handleChromeStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleChromeStorageChange)
    }
  }, [])


  /**
   * 注入 Hero 字体（Instrument Serif + Inter）
   */
  useEffect(() => {
    ensureHeroFonts()
  }, [])

  /**
   * 首页大标题配置（文案 / 字体 / 字号），首屏同步读取避免闪烁
   */
  const [heroTitle] = useState(() => getHeroTitleConfig())
  useEffect(() => {
    applyHeroTitleStyle(heroTitle)
  }, [heroTitle])

  /**
   * 解析背景视频来源（内置 / 在线地址 / 本地上传）
   */
  const [videoSrc, setVideoSrc] = useState<string>(HERO_VIDEO_URL)
  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    const resolve = async () => {
      const source = getVideoSource()
      if (source.type === 'url' && source.url) {
        if (!cancelled) setVideoSrc(source.url)
      } else if (source.type === 'local') {
        const local = await loadLocalVideoURL()
        if (cancelled) {
          if (local) URL.revokeObjectURL(local)
          return
        }
        if (local) {
          objectUrl = local
          setVideoSrc(local)
        } else {
          setVideoSrc(HERO_VIDEO_URL)
        }
      } else if (!cancelled) {
        setVideoSrc(HERO_VIDEO_URL)
      }
    }
    void resolve()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [])

  /**
   * 解析背景图片来源（在线地址 / 本地上传），未配置时为空
   */
  const [imageSrc, setImageSrc] = useState<string>('')
  /** 图片特效配置（打开页面时读取一次，设置页修改后新标签页生效） */
  const [imageEffect] = useState(() => getImageEffect())
  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    const resolve = async () => {
      const source = getImageSource()
      if (source.type === 'url' && source.url) {
        if (!cancelled) setImageSrc(source.url)
      } else if (source.type === 'local') {
        const local = await loadLocalImageURL()
        if (cancelled) {
          if (local) URL.revokeObjectURL(local)
          return
        }
        if (local) {
          objectUrl = local
          setImageSrc(local)
        } else {
          setImageSrc('')
        }
      } else if (!cancelled) {
        setImageSrc('')
      }
    }
    void resolve()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [])

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
    const allLinks = config.links.flat()
    linkIds.forEach((id: number) => {
      const link = allLinks.find(l => l.id === id)
      if (link) {
        window.open(link.url, '_blank')
      }
    })
  }

  /**
   * 处理模型选择
   * 支持多选、单选或不选
   */
  const toggleModel = (modelId: string) => {
    const newSelected = new Set(selectedModels)
    if (newSelected.has(modelId)) {
      // 如果已选中，则取消选择（允许取消所有选择）
      newSelected.delete(modelId)
    } else {
      // 如果未选中，则添加选择
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
   * 处理键盘事件 - 支持 Cmd/Ctrl + Enter 快捷键发送
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 检测 Cmd(Mac) 或 Ctrl(Windows/Linux) + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault() // 阻止默认的换行行为
      
      // 检查发送条件（与发送按钮相同的逻辑）
      if (inputText.trim() && selectedModels.size > 0) {
        handleSend()
      }
    }
  }

  /**
   * 处理发送 - 自动化流程（支持性能优化）
   */
  const handleSend = async () => {
    // 验证输入文本
    if (!inputText.trim()) {
      alert('请输入要发送的内容')
      return
    }

    // 验证模型选择
    const selectedModelIds = Array.from(selectedModels)
    if (selectedModelIds.length === 0) {
      alert('请至少选择一个AI模型')
      return
    }

    // 获取选中模型的详细信息
    const selectedModelDetails = config.basicModels.filter(model => 
      selectedModelIds.includes(model.id) && model.enabled
    )

    if (selectedModelDetails.length === 0) {
      alert('没有可用的模型，请检查模型配置')
      return
    }

    try {
      // 复制文本到剪贴板
      await navigator.clipboard.writeText(inputText)

      // 显示操作提示
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300'
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span>💬 正在同时打开 ${selectedModelDetails.length} 个AI页面...</span>
        </div>
      `
      document.body.appendChild(notification)

      // 一起打开所有选中的模型页面
      await Promise.allSettled(
        selectedModelDetails.map(model => openModelPage(model, inputText))
      )

      // 3秒后移除通知
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.opacity = '0'
          setTimeout(() => {
            document.body.removeChild(notification)
          }, 300)
        }
      }, 3000)

      // 清空输入框
      setInputText('')
      // 保留模型选择，方便用户重复使用
      
    } catch (error) {
      console.error('自动化流程执行失败:', error)
      alert('操作失败，请检查浏览器权限设置')
    }
  }

  /**
   * 为指定模型打开页面并自动填充发送
   * 一般模式：打开AI页面后自动填充文本并发送
   */
  const openModelPage = async (model: BasicModelConfig, text?: string) => {
    try {
      // 如果有文本内容，针对不同模型进行特殊处理
       if (text && text.trim()) {
         // 支持自动填充的模型列表
          const supportedModels: Record<string, { url: string[]; action: string }> = {
            'ChatGPT': { url: ['chatgpt.com', 'chat.openai.com'], action: 'autoFillAndSend' },
            'kimi': { url: ['kimi.moonshot.cn'], action: 'fillAndSend' },
            'deepseek': { url: ['chat.deepseek.com'], action: 'fillAndSend' },
            'claude-3': { url: ['claude.ai'], action: 'fillAndSend' }
          }
          
          // 检查是否为支持的模型 - 优先使用精确ID匹配
          let modelConfig: { url: string[]; action: string } | undefined = supportedModels[model.id]
          
          // 如果没有精确匹配，则检查URL模式匹配（更严格的匹配）
          if (!modelConfig) {
            modelConfig = Object.values(supportedModels).find(config => 
              config.url.some(urlPattern => {
                // 使用更严格的URL匹配：检查域名部分
                const modelDomain = model.url.replace(/^https?:\/\//, '').split('/')[0]
                return modelDomain.includes(urlPattern) || urlPattern.includes(modelDomain)
              })
            )
          }
         
         if (modelConfig) {
           // 支持的模型使用background script打开标签页并发送消息
           try {
             await new Promise((resolve) => {
               chrome.runtime.sendMessage({
                 action: 'openTabAndSendMessage',
                 url: model.url,
                 message: {
                   action: modelConfig.action,
                   text: text
                 }
               }, resolve)
             })
           } catch (error) {
             console.error(`${model.name}自动填充和发送失败:`, error)
             // 降级处理：直接打开页面并复制文本
             window.open(model.url, '_blank')
             await navigator.clipboard.writeText(text)
           }
         } else {
           // 不支持的模型先打开页面，然后复制文本到剪贴板
           window.open(model.url, '_blank')
           await navigator.clipboard.writeText(text)
         }
      } else {
        // 没有文本内容，直接打开页面
        window.open(model.url, '_blank')
      }
    } catch (error) {
      console.error(`打开 ${model.name} 页面失败:`, error)
      // 降级处理：直接打开页面
      window.open(model.url, '_blank')
    }
  }

  return (
    <div className="hero-root relative min-h-screen w-full overflow-hidden bg-white dark:bg-[#0a0a0a]">
      {/* 背景图片（来源与特效可在设置中选择，配置后可单独开关） */}
      {bgImageEnabled && imageSrc && <ImageBackground src={imageSrc} effect={imageEffect} />}

      {/* 背景视频（来源可在设置中选择，可关闭以提升老机器性能） */}
      {bgVideoEnabled && <VideoBackground src={videoSrc} />}

      {/* 内容层（顶部控制栏由 NewTabPage 全局渲染） */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Hero 主体 */}
        <main
          className="flex flex-1 flex-col items-center px-6 text-center"
          style={{ paddingTop: '9rem', paddingBottom: '6rem' }}
        >
          <h1
            className="hero-title font-display animate-fade-rise max-w-5xl whitespace-pre-wrap break-words text-5xl font-normal text-black sm:text-7xl md:text-8xl dark:text-white dark:[text-shadow:0_2px_24px_rgba(0,0,0,0.55)]"
            style={{ lineHeight: 0.95, letterSpacing: '-0.03em' }}
          >
            {heroTitle.text.trim() || DEFAULT_HERO_TITLE}
          </h1>

          {/* AI 指令台 */}
          <div className="animate-fade-rise-delay-2 mt-12 w-full max-w-4xl">
            <div className="rounded-[28px] border border-black/10 bg-white/80 p-3 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.3)] backdrop-blur-md dark:border-white/20 dark:bg-black/60 dark:shadow-[0_24px_70px_-24px_rgba(0,0,0,0.95)]">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="向 AI 提问任何问题…（⌘/Ctrl + Enter 发送）"
                rows={3}
                className="w-full resize-none bg-transparent px-4 pt-3 text-base text-black placeholder:text-[#9b9b9b] focus:outline-none dark:text-white dark:placeholder:text-[#a3a3a3]"
              />
              <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-2">
                {/* 模型选择（语言模型） */}
                <div className="flex flex-wrap items-center gap-2">
                  {config.basicModels
                    .filter((model) => model.type === 'language' && model.enabled)
                    .map((model: BasicModelConfig) => {
                      const Icon = getAIIcon(model.id)
                      const active = selectedModels.has(model.id)
                      return (
                        <button
                          key={model.id}
                          onClick={() => toggleModel(model.id)}
                          title={`${model.name} — 点击选择`}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                            active
                              ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                              : 'border-black/10 bg-white text-[#6F6F6F] hover:border-black/40 hover:text-black dark:border-white/25 dark:bg-white/[0.14] dark:text-white/90 dark:hover:border-white/60 dark:hover:text-white'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {model.name}
                        </button>
                      )
                    })}
                </div>

                {/* 发送（与模型胶囊一致的精致样式） */}
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || selectedModels.size === 0}
                  title={
                    selectedModels.size === 0
                      ? '请先选择至少一个模型'
                      : !inputText.trim()
                        ? '请输入内容'
                        : '发送 (⌘/Ctrl + Enter)'
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:scale-100 dark:bg-white dark:text-black"
                >
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                  发送
                </button>
              </div>
            </div>

            {/* 状态 / 字数 */}
            <div className="mt-3 flex items-center justify-center gap-3 text-xs text-[#9b9b9b] dark:text-[#a3a3a3]">
              <span>{selectedModels.size === 0 ? '未选择模型' : `已选择 ${selectedModels.size} 个模型`}</span>
              <span>·</span>
              <span>{inputText.length}/6000</span>
            </div>
          </div>

          {/* 快捷链接 */}
          {config.links.flat().length > 0 && (
            <div className="animate-fade-rise-delay-2 mt-12 w-full max-w-4xl">
              {selectedLinks.size > 0 && (
                <div className="mb-4 flex items-center justify-center gap-2 text-xs text-[#6F6F6F] dark:text-[#b0b0b0]">
                  <span>已选择 {selectedLinks.size} 个链接</span>
                  <button
                    onClick={() => {
                      openMultipleLinks(Array.from(selectedLinks) as number[])
                      setSelectedLinks(new Set())
                    }}
                    className="rounded-full bg-black px-3 py-1 text-white transition-transform hover:scale-[1.03] dark:bg-white dark:text-black"
                  >
                    全部打开
                  </button>
                  <button
                    onClick={() => setSelectedLinks(new Set())}
                    className="rounded-full border border-black/15 px-3 py-1 text-[#6F6F6F] hover:text-black dark:border-white/20 dark:text-[#b0b0b0] dark:hover:text-white"
                  >
                    清除
                  </button>
                </div>
              )}

              <div className="grid grid-cols-5 gap-3">
                {config.links.flat().map((link: LinkConfig) => {
                  const selected = selectedLinks.has(link.id)
                  return (
                    <button
                      key={link.id}
                      onClick={(e) => handleLinkClick(link, e)}
                      title={link.url}
                      className={`group flex w-full min-w-0 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-all duration-200 ${
                        selected
                          ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                          : 'border-black/10 bg-white/70 text-[#3a3a3a] backdrop-blur hover:border-black/30 hover:bg-white dark:border-white/20 dark:bg-black/55 dark:text-white/90 dark:hover:border-white/40 dark:hover:bg-black/70'
                      }`}
                    >
                      {link.icon ? (
                        <img
                          src={link.icon}
                          alt=""
                          className="h-4 w-4 shrink-0 rounded-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <LinkIcon className="h-4 w-4 shrink-0 opacity-60" />
                      )}
                      <span className="truncate">{link.title}</span>
                    </button>
                  )
                })}
              </div>

              <p className="mt-5 text-center text-xs text-[#9b9b9b] dark:text-[#a3a3a3]">
                按住 ⌘ / Ctrl 点击可多选链接，再点任意链接批量打开
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}


/**
 * 新标签页组件
 */
/**
 * 同步获取保存的模式，避免异步加载导致的闪烁
 */
function getSavedModeSync(): string {
  try {
    // 优先尝试从 localStorage 同步读取（Chrome扩展环境下localStorage是同步的）
    const saved = localStorage.getItem('mytab-current-mode')
    if (saved && Object.values(TabMode).includes(saved)) {
      return saved
    }
  } catch (error) {
    console.warn('同步读取模式失败:', error)
  }
  
  // 返回默认模式
  return TabMode.NORMAL
}

function NewTabPage() {
  // 使用同步方式获取初始模式，避免闪烁
  const [currentMode, setCurrentMode] = useState(() => getSavedModeSync())
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [bgMode, setBgMode] = useState<BgMode>(() => readBgMode())
  const [hasBgImage] = useState(() => getImageSource().type !== 'none')
  const [isDark, setIsDark] = useState(() => readDarkPref())

  // 视频 / 图片是否生效（由单一的背景模式派生，天然互斥）
  const bgVideoEnabled = bgMode === 'video'
  const bgImageEnabled = bgMode === 'image'

  /**
   * 切换背景模式并持久化；再次点击同一项则回到「无」
   */
  const switchBgMode = (mode: BgMode) => {
    setBgMode((prev) => {
      const next = prev === mode ? 'none' : mode
      writeBgMode(next)
      return next
    })
  }

  /**
   * 应用并持久化主题
   */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      writeDarkPref(next)
      return next
    })
  }

  // 字体设置Hook
  const { fontSettings, getEnabledFont } = useFontSettings()

  // 字体初始化已合并到下方的字体应用 useEffect 中

  /**
   * 标签标题：每次打开随机一句心灵毒鸡汤；过长时在标签栏里滚动显示
   */
  useEffect(() => {
    const stop = startTitleMarquee(getRandomQuote())
    return stop
  }, [])

  /**
   * 管理body类，确保极简模式样式立即生效
   */
  useEffect(() => {
    const updateBodyClass = () => {
      // 移除所有模式相关的类
      document.body.classList.remove('minimal-mode', 'normal-mode', 'pro-mode')
      
      // 添加当前模式的类
      if (currentMode === TabMode.MINIMAL) {
        document.body.classList.add('minimal-mode')
      } else if (currentMode === TabMode.NORMAL) {
        document.body.classList.add('normal-mode')
      } else if (currentMode === TabMode.PRO) {
        document.body.classList.add('pro-mode')
      }
    }

    // 立即更新body类
    updateBodyClass()

    // 清理函数
    return () => {
      document.body.classList.remove('minimal-mode', 'normal-mode', 'pro-mode')
    }
  }, [currentMode])

  /**
   * 从Chrome存储异步同步模式（作为备用）
   */
  useEffect(() => {
    const syncModeFromChromeStorage = async () => {
      try {
        // 如果在Chrome扩展环境中，尝试从Chrome存储同步
        if (chrome?.storage?.sync) {
          const result = await chrome.storage.sync.get(['mytab-current-mode'])
          if (result['mytab-current-mode'] && Object.values(TabMode).includes(result['mytab-current-mode'])) {
            const chromeMode = result['mytab-current-mode']
            // 只有当Chrome存储的模式与当前模式不同时才更新
            if (chromeMode !== currentMode) {
              setCurrentMode(chromeMode)
              // 同时更新localStorage保持同步
              localStorage.setItem('mytab-current-mode', chromeMode)
            }
          }
        }
      } catch (error) {
        console.warn('Chrome存储同步失败:', error)
      } finally {
        // 标记加载完成
        setIsLoading(false)
      }
    }

    // 短暂延迟后执行同步，确保页面已经渲染
    const timer = setTimeout(syncModeFromChromeStorage, 50)
    return () => clearTimeout(timer)
  }, [])

  /**
   * 应用字体设置
   * newtab 页面始终应用选中的字体，不受 applyToAllPages 控制
   * applyToAllPages 仅控制是否通过 content script 注入到其他网页
   */
  useEffect(() => {
    try {
      const enabledFont = getEnabledFont()
      if (enabledFont) {
        fontInjector.applySyncFontSettings(enabledFont, fontSettings)
      }
    } catch (error) {
      console.error('应用字体设置失败:', error)
    }
  }, [fontSettings, getEnabledFont])

  /**
   * 处理模式切换并保存到存储
   */
  const handleModeChange = async (mode: string) => {
    try {
      // 立即更新UI
      setCurrentMode(mode)
      
      // 同步保存到localStorage（立即生效）
      localStorage.setItem('mytab-current-mode', mode)
      
      // 异步保存到Chrome存储（作为备用）
      if (chrome?.storage?.sync) {
        chrome.storage.sync.set({ 'mytab-current-mode': mode }).catch(error => {
          console.warn('Chrome存储保存失败:', error)
        })
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
        return
      }

      // Command+数字键快速切换模式（仅在模式选择面板未打开时）
      if (!isModeSelectorOpen && (e.metaKey || e.ctrlKey)) {
        const modes = Object.keys(modeConfig)
        switch (e.key) {
          case '1':
            e.preventDefault()
            if (modes[0]) handleModeChange(modes[0])
            break
          case '2':
            e.preventDefault()
            if (modes[1]) handleModeChange(modes[1])
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModeSelectorOpen])

  /**
   * 渲染当前模式的内容
   */
  const renderModeContent = () => {
    // 如果是极简模式，立即返回空白内容，不等待加载完成
    if (currentMode === TabMode.MINIMAL) {
      return (
        <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a]">
          {/* 极简模式 - 完全空白 */}
        </div>
      )
    }

    // 对于其他模式，如果还在加载中，显示与目标模式匹配的加载状态
    if (isLoading) {
      // NORMAL模式的加载状态 - 显示简化版本避免闪烁
      return (
        <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a]">
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-black/70 dark:border-white/70"></div>
          </div>
        </div>
      )
    }

    // 加载完成后渲染完整内容
    switch (currentMode) {
      case TabMode.NORMAL:
         return <NormalMode bgVideoEnabled={bgVideoEnabled} bgImageEnabled={bgImageEnabled} />

      default:
        return <NormalMode bgVideoEnabled={bgVideoEnabled} bgImageEnabled={bgImageEnabled} />
    }
  }

  const iconBtnClass =
    'flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/70 text-[#3a3a3a] backdrop-blur transition-colors hover:bg-white hover:text-black dark:border-white/15 dark:bg-black/40 dark:text-white/80 dark:hover:bg-black/60 dark:hover:text-white'

  const segBtnClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? 'bg-black text-white dark:bg-white dark:text-black'
        : 'text-[#6F6F6F] hover:text-black dark:text-[#a3a3a3] dark:hover:text-white'
    }`

  return (
    <div className="relative">
      {/* 顶部右侧控制栏 */}
      <div className="fixed top-6 right-6 z-40 flex items-center gap-2">
        {/* 模式切换：一般 / 极简 */}
        <div className="flex items-center rounded-full border border-black/10 bg-white/70 p-0.5 backdrop-blur dark:border-white/15 dark:bg-black/40">
          <button onClick={() => handleModeChange(TabMode.NORMAL)} className={segBtnClass(currentMode === TabMode.NORMAL)}>
            一般
          </button>
          <button onClick={() => handleModeChange(TabMode.MINIMAL)} className={segBtnClass(currentMode === TabMode.MINIMAL)}>
            极简
          </button>
        </div>

        {/* 主题切换 */}
        <button onClick={toggleTheme} className={iconBtnClass} title={isDark ? '切换到浅色' : '切换到深色'}>
          {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        </button>

        {/* 背景图片开关（仅在已配置图片来源时显示，与视频互斥） */}
        {hasBgImage && (
          <button
            onClick={() => switchBgMode('image')}
            className={iconBtnClass}
            title={bgImageEnabled ? '关闭背景图片' : '使用背景图片'}
          >
            {bgImageEnabled ? <ImageIcon className="h-4 w-4" /> : <ImageOffIcon className="h-4 w-4" />}
          </button>
        )}

        {/* 背景视频开关（与图片互斥） */}
        <button
          onClick={() => switchBgMode('video')}
          className={iconBtnClass}
          title={bgVideoEnabled ? '关闭背景视频' : '使用背景视频'}
        >
          {bgVideoEnabled ? <VideoIcon className="h-4 w-4" /> : <VideoOffIcon className="h-4 w-4" />}
        </button>

        {/* 管理 */}
        <button
          onClick={openOptionsPage}
          className="inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-transform duration-200 hover:scale-[1.03] dark:bg-white dark:text-black"
          title="扩展设置"
        >
          <SettingsIcon className="h-4 w-4" />
          管理
        </button>
      </div>

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