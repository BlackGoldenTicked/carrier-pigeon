import React, { useEffect, useMemo, useState } from 'react'

import { VideoBackground } from './ui/VideoBackground'
import { ImageBackground } from './ui/ImageBackground'
import { toast } from './ui/toast'
import { getAIIcon } from './icons/ai'
import { ArrowUpIcon, LinkIcon, XmarkIcon } from './icons/ui'
import type { AppConfig, AIModelItem, QuickLinkItem } from '../utils/appConfig'
import { ensureHeroFonts } from '../utils/heroFonts'
import { getHeroTitleConfig, applyHeroTitleStyle, DEFAULT_HERO_TITLE } from '../utils/heroTitle'
import { getVideoSource, loadLocalVideoURL } from '../utils/videoSource'
import { getImageSource, loadLocalImageURL } from '../utils/imageSource'
import { getImageEffect } from '../utils/imageEffect'
import { isOnboardingDismissed, dismissOnboarding } from '../utils/prefs'
import heroVideoUrl from 'url:../assets/hero.mp4'

/** Hero 背景视频（本地内置 720p 低码率版本，省内存、离线、无需联网） */
const HERO_VIDEO_URL = heroVideoUrl

const INPUT_MAX = 6000
/** 接近上限时计数器变色提醒 */
const INPUT_WARN = 5400

/** 支持自动填充发送的模型（通过 background script + content script 实现） */
const AUTO_FILL_MODELS: Record<string, { url: string[]; action: string }> = {
  ChatGPT: { url: ['chatgpt.com', 'chat.openai.com'], action: 'autoFillAndSend' },
  kimi: { url: ['kimi.moonshot.cn'], action: 'fillAndSend' },
  deepseek: { url: ['chat.deepseek.com'], action: 'fillAndSend' },
  'claude-3': { url: ['claude.ai'], action: 'fillAndSend' }
}

function findAutoFillConfig(model: AIModelItem): { url: string[]; action: string } | undefined {
  const exact = AUTO_FILL_MODELS[model.id]
  if (exact) {
    return exact
  }
  const modelDomain = model.url.replace(/^https?:\/\//, '').split('/')[0]
  return Object.values(AUTO_FILL_MODELS).find((config) =>
    config.url.some((pattern) => modelDomain.includes(pattern) || pattern.includes(modelDomain))
  )
}

interface NormalModeProps {
  config: AppConfig
  bgVideoEnabled: boolean
  bgImageEnabled: boolean
  onOpenPanel: () => void
}

/**
 * 一般模式：Hero 标题 + AI 指令台 + 快捷链接
 */
export function NormalMode({ config, bgVideoEnabled, bgImageEnabled, onOpenPanel }: NormalModeProps) {
  const enabledModels = useMemo(() => config.models.filter((m) => m.enabled), [config.models])
  const languageModels = useMemo(
    () => enabledModels.filter((m) => m.type === 'language'),
    [enabledModels]
  )

  const [selectedModelIds, setSelectedModelIds] = useState<ReadonlySet<string>>(new Set())
  const [selectedLinkIds, setSelectedLinkIds] = useState<ReadonlySet<number>>(new Set())
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDismissed())

  /** 启用的模型变化时，默认全选（保留用户已手动取消的不强行恢复会增加心智负担，全选是最常用场景） */
  useEffect(() => {
    setSelectedModelIds(new Set(languageModels.map((m) => m.id)))
  }, [languageModels])

  /** 注入展示字体并应用标题配置（首屏同步读取避免闪烁） */
  const [heroTitle] = useState(() => getHeroTitleConfig())
  useEffect(() => {
    ensureHeroFonts()
    applyHeroTitleStyle(heroTitle)
  }, [heroTitle])

  /** 解析背景视频来源（内置 / 在线地址 / 本地上传） */
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

  /** 解析背景图片来源（在线地址 / 本地上传），未配置时为空 */
  const [imageSrc, setImageSrc] = useState<string>('')
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

  const toggleModel = (modelId: string) => {
    setSelectedModelIds((prev) => {
      const next = new Set(prev)
      if (next.has(modelId)) {
        next.delete(modelId)
      } else {
        next.add(modelId)
      }
      return next
    })
  }

  /** 链接点击：⌘/Ctrl 多选，已有选择时点击任意链接批量打开 */
  const handleLinkClick = (link: QuickLinkItem, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      setSelectedLinkIds((prev) => {
        const next = new Set(prev)
        if (next.has(link.id)) {
          next.delete(link.id)
        } else {
          next.add(link.id)
        }
        return next
      })
      return
    }
    if (selectedLinkIds.size > 0) {
      openLinks([...Array.from(selectedLinkIds), link.id])
      setSelectedLinkIds(new Set())
      return
    }
    window.open(link.url, '_blank')
  }

  const openLinks = (linkIds: number[]) => {
    let blocked = 0
    for (const id of linkIds) {
      const link = config.links.find((l) => l.id === id)
      if (link && !window.open(link.url, '_blank')) {
        blocked++
      }
    }
    if (blocked > 0) {
      toast(`有 ${blocked} 个标签页被浏览器拦截，请允许此页面打开多个标签页`, { kind: 'error' })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value.slice(0, INPUT_MAX))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (inputText.trim() && selectedModelIds.size > 0 && !isSending) {
        void handleSend()
      }
    }
  }

  /** 通过 background script 打开标签页并自动填充发送 */
  const openWithAutoFill = (model: AIModelItem, action: string, text: string): Promise<void> =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          {
            action: 'openTabAndSendMessage',
            url: model.url,
            message: { action, text }
          },
          () => {
            // 即使 background 未响应也不阻塞整体流程
            void chrome.runtime.lastError
            resolve()
          }
        )
      } catch {
        window.open(model.url, '_blank')
        resolve()
      }
    })

  /**
   * 发送：自动填充支持的模型走 background 打开 + 注入，
   * 不支持的模型打开页面并复制文本到剪贴板（明确告知用户）
   */
  const handleSend = async () => {
    const targets = config.models.filter((m) => selectedModelIds.has(m.id) && m.enabled)
    if (!inputText.trim() || targets.length === 0) {
      return
    }

    setIsSending(true)
    try {
      const autoTargets: Array<{ model: AIModelItem; action: string }> = []
      const manualTargets: AIModelItem[] = []
      for (const model of targets) {
        const autoFill = findAutoFillConfig(model)
        if (autoFill) {
          autoTargets.push({ model, action: autoFill.action })
        } else {
          manualTargets.push(model)
        }
      }

      // 手动模型：先复制（一次），再打开页面，告知用户粘贴即可
      if (manualTargets.length > 0) {
        try {
          await navigator.clipboard.writeText(inputText)
          toast(`内容已复制，在 ${manualTargets.map((m) => m.name).join('、')} 中粘贴即可`, {
            kind: 'info'
          })
        } catch {
          toast('复制到剪贴板失败，请手动复制内容', { kind: 'error' })
        }
        let blocked = 0
        for (const model of manualTargets) {
          if (!window.open(model.url, '_blank')) {
            blocked++
          }
        }
        if (blocked > 0) {
          toast(`有 ${blocked} 个标签页被浏览器拦截，请允许此页面打开多个标签页`, { kind: 'error' })
        }
      }

      await Promise.allSettled(
        autoTargets.map(({ model, action }) => openWithAutoFill(model, action, inputText))
      )

      toast(`已向 ${targets.length} 个 AI 平台发送`, { kind: 'success' })
      setInputText('')
      // 保留模型选择，方便连续提问
    } finally {
      setIsSending(false)
    }
  }

  const canSend = Boolean(inputText.trim()) && selectedModelIds.size > 0 && !isSending
  const nearLimit = inputText.length >= INPUT_WARN

  return (
    <div className="hero-root relative min-h-screen w-full overflow-hidden bg-bg">
      {/* 背景图片（来源与特效可在设置中选择，配置后可单独开关） */}
      {bgImageEnabled && imageSrc && <ImageBackground src={imageSrc} effect={imageEffect} />}

      {/* 背景视频（来源可在设置中选择，可关闭以提升老机器性能） */}
      {bgVideoEnabled && <VideoBackground src={videoSrc} />}

      {/* 可读性渐晕：有媒体背景时保证文字始终可读 */}
      {(bgVideoEnabled || (bgImageEnabled && imageSrc)) && (
        <div className="bg-scrim pointer-events-none absolute inset-0 z-[1]" aria-hidden />
      )}

      {/* 内容层（顶部控制栏由 NewTabPage 全局渲染） */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <main
          className="flex flex-1 flex-col items-center px-6 text-center"
          style={{ paddingTop: '8.5rem', paddingBottom: '5rem' }}
        >
          <h1
            className="hero-title font-display animate-fade-rise max-w-5xl whitespace-pre-wrap break-words text-5xl text-ink sm:text-7xl md:text-8xl"
            style={{ lineHeight: 1.02, letterSpacing: '-0.02em' }}
          >
            {heroTitle.text.trim() || DEFAULT_HERO_TITLE}
          </h1>

          {/* AI 指令台 */}
          <div className="animate-fade-rise-delay-2 mt-12 w-full max-w-4xl">
            <div className="rounded-[var(--radius)] border border-line bg-card/85 p-3 shadow-token-l backdrop-blur-md">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                maxLength={INPUT_MAX}
                placeholder="向 AI 提问任何问题…（⌘/Ctrl + Enter 发送）"
                aria-label="向 AI 提问"
                rows={3}
                className="w-full resize-none bg-transparent px-4 pt-3 text-base text-ink placeholder:text-ink3 focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-2">
                {/* 模型选择（语言模型） */}
                <div className="flex flex-wrap items-center gap-2">
                  {languageModels.map((model) => {
                    const Icon = getAIIcon(model.id)
                    const active = selectedModelIds.has(model.id)
                    return (
                      <button
                        key={model.id}
                        onClick={() => toggleModel(model.id)}
                        aria-pressed={active}
                        title={`${model.name} — 点击${active ? '取消' : '选择'}`}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                          active
                            ? 'border-ink bg-ink text-bg'
                            : 'border-line bg-card text-ink2 hover:border-line2 hover:text-ink'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {model.name}
                      </button>
                    )
                  })}
                </div>

                {/* 发送：主操作用主题色 + 方角，与模型胶囊形成形状层级 */}
                <button
                  onClick={() => void handleSend()}
                  disabled={!canSend}
                  title={
                    selectedModelIds.size === 0
                      ? '请先选择至少一个模型'
                      : !inputText.trim()
                        ? '请输入内容'
                        : `发送 (⌘/Ctrl + Enter)，将打开 ${selectedModelIds.size} 个标签页`
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-token-sm bg-accent px-4 py-2 text-xs font-medium text-white transition-colors duration-200 hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                  {isSending ? '发送中…' : '发送'}
                </button>
              </div>
            </div>

            {/* 状态 / 字数 */}
            <div className="mt-3 flex items-center justify-center gap-3 text-xs text-ink3">
              <span>
                {selectedModelIds.size === 0
                  ? '未选择模型'
                  : `已选 ${selectedModelIds.size} 个模型 · 发送将打开 ${selectedModelIds.size} 个标签页`}
              </span>
              {(inputText.length > 0 || nearLimit) && (
                <>
                  <span aria-hidden>·</span>
                  <span className={nearLimit ? 'font-medium text-accent' : ''}>
                    {inputText.length}/{INPUT_MAX}
                  </span>
                </>
              )}
            </div>

            {/* 新手提示条（关闭后不再出现） */}
            {showOnboarding && (
              <div className="mx-auto mt-4 flex max-w-xl items-center gap-3 rounded-token-sm border border-line bg-bg2/90 px-4 py-2.5 text-left text-xs text-ink2">
                <span className="min-w-0 flex-1">
                  小技巧：⌘/Ctrl + Enter 发送 · ⌘/Ctrl + 点击链接可多选批量打开 · ⌘/Ctrl + K
                  切换模式
                </span>
                <button
                  onClick={() => {
                    dismissOnboarding()
                    setShowOnboarding(false)
                  }}
                  aria-label="不再显示小技巧"
                  className="shrink-0 rounded p-1 text-ink3 transition-colors hover:text-ink"
                >
                  <XmarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* 快捷链接 */}
          <div className="animate-fade-rise-delay-2 mt-12 w-full max-w-4xl">
            {config.links.length > 0 ? (
              <>
                <div className="mb-3 flex items-baseline justify-between px-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-ink3">
                    快捷链接
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedLinkIds.size > 0 && (
                      <>
                        <button
                          onClick={() => {
                            openLinks(Array.from(selectedLinkIds))
                            setSelectedLinkIds(new Set())
                          }}
                          className="rounded-token-sm bg-ink px-3 py-1 text-xs text-bg transition-opacity hover:opacity-85"
                        >
                          打开 {selectedLinkIds.size} 个
                        </button>
                        <button
                          onClick={() => setSelectedLinkIds(new Set())}
                          className="rounded-token-sm border border-line px-3 py-1 text-xs text-ink2 transition-colors hover:text-ink"
                        >
                          清除
                        </button>
                      </>
                    )}
                    <button
                      onClick={onOpenPanel}
                      className="text-xs text-ink3 underline-offset-4 transition-colors hover:text-ink hover:underline"
                    >
                      管理链接
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {config.links.map((link, index) => {
                    const selected = selectedLinkIds.has(link.id)
                    return (
                      <button
                        key={link.id}
                        onClick={(e) => handleLinkClick(link, e)}
                        title={link.url}
                        aria-pressed={selected}
                        className={`group flex w-full min-w-0 items-center gap-2.5 rounded-token-sm border px-3.5 py-2.5 text-left text-sm transition-colors duration-150 ${
                          selected
                            ? 'border-accent bg-[var(--accent-bg)] text-ink'
                            : 'border-line bg-card/90 text-ink2 hover:border-line2 hover:bg-card hover:text-ink'
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
                          <LinkIcon className="h-4 w-4 shrink-0 opacity-50" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{link.title}</span>
                        <span
                          className="shrink-0 text-[10px] tabular-nums text-ink3 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <p className="mt-4 text-center text-xs text-ink3">
                  按住 ⌘ / Ctrl 点击可多选，再点任意链接批量打开
                </p>
              </>
            ) : (
              /* 空状态：教学卡 */
              <div className="mx-auto max-w-md rounded-token border border-dashed border-line2 bg-card/70 px-8 py-10">
                <LinkIcon className="mx-auto h-7 w-7 text-ink3" />
                <p className="mt-3 text-sm font-medium text-ink">还没有快捷链接</p>
                <p className="mt-1 text-xs leading-relaxed text-ink2">
                  把每天都要打开的网站放在这里，新标签页一打开就能直达
                </p>
                <button
                  onClick={onOpenPanel}
                  className="mt-5 rounded-token-sm bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
                >
                  添加第一个链接
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
