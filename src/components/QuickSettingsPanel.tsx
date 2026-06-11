import React, { useEffect, useRef, useState } from 'react'

import { toast } from './ui/toast'
import { LinkIcon, XmarkIcon, ArrowUpRightIcon } from './icons/ui'
import {
  MAX_LINKS,
  faviconUrl,
  deriveTitle,
  normalizeHttpUrl,
  type AppConfig,
  type AIModelItem,
  type QuickLinkItem
} from '../utils/appConfig'
import type { BgMode } from '../utils/prefs'

interface QuickSettingsPanelProps {
  open: boolean
  onClose: () => void
  config: AppConfig
  onLinksChange: (links: QuickLinkItem[]) => void
  onModelsChange: (models: AIModelItem[]) => void
  bgMode: BgMode
  onBgModeChange: (mode: BgMode) => void
  /** 是否已在设置页配置图片来源 */
  hasBgImage: boolean
  onOpenOptions: () => void
}

const BG_OPTIONS: Array<{ mode: BgMode; label: string }> = [
  { mode: 'video', label: '视频' },
  { mode: 'image', label: '图片' },
  { mode: 'none', label: '纯色' }
]

/**
 * 首页内嵌管理面板（右侧滑出）
 * 承载高频操作：快捷链接增删改排序、AI 平台启用、背景切换
 * 低频配置（字体 / 背景来源 / 标题文字）在独立设置页
 */
export function QuickSettingsPanel({
  open,
  onClose,
  config,
  onLinksChange,
  onModelsChange,
  bgMode,
  onBgModeChange,
  hasBgImage,
  onOpenOptions
}: QuickSettingsPanelProps) {
  const [newUrl, setNewUrl] = useState('')
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  /** ESC 关闭 */
  useEffect(() => {
    if (!open) {
      return
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) {
    return null
  }

  const addLink = () => {
    const url = normalizeHttpUrl(newUrl)
    if (!url) {
      toast('请输入有效的网址，例如 github.com', { kind: 'error' })
      return
    }
    if (config.links.length >= MAX_LINKS) {
      toast(`最多支持 ${MAX_LINKS} 个快捷链接，删除一些再试试`, { kind: 'error' })
      return
    }
    if (config.links.some((l) => l.url === url)) {
      toast('这个链接已经添加过了', { kind: 'info' })
      return
    }
    const link: QuickLinkItem = {
      id: Date.now(),
      title: deriveTitle(url),
      url,
      icon: faviconUrl(url)
    }
    onLinksChange([...config.links, link])
    setNewUrl('')
    toast(`已添加「${link.title}」，点击标题可改名`, { kind: 'success' })
  }

  const updateLink = (id: number, patch: Partial<QuickLinkItem>) => {
    onLinksChange(config.links.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const deleteLink = (link: QuickLinkItem) => {
    const previous = config.links
    onLinksChange(previous.filter((l) => l.id !== link.id))
    toast(`已删除「${link.title}」`, {
      kind: 'info',
      action: {
        label: '撤销',
        onAction: () => onLinksChange(previous)
      }
    })
  }

  const moveLink = (from: number, to: number) => {
    if (from === to) {
      return
    }
    const next = [...config.links]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onLinksChange(next)
  }

  const toggleModel = (model: AIModelItem) => {
    onModelsChange(
      config.models.map((m) => (m.id === model.id ? { ...m, enabled: !m.enabled } : m))
    )
  }

  const handleBgClick = (mode: BgMode) => {
    if (mode === 'image' && !hasBgImage) {
      toast('还没有配置背景图片，先去设置页选择图片来源', {
        kind: 'info',
        action: { label: '去设置', onAction: onOpenOptions }
      })
      return
    }
    onBgModeChange(mode)
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="管理面板">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />

      {/* 面板 */}
      <div className="animate-panel-in absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-bg shadow-token-l">
        {/* 头部 */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
          <h2 className="text-sm font-semibold text-ink">管理</h2>
          <button
            onClick={onClose}
            aria-label="关闭管理面板"
            className="rounded-token-sm p-1.5 text-ink3 transition-colors hover:bg-bg2 hover:text-ink"
          >
            <XmarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-6">
          {/* 背景 */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink3">背景</h3>
            <div className="inline-flex items-center gap-1 rounded-token-sm border border-line bg-bg2 p-1">
              {BG_OPTIONS.map(({ mode, label }) => {
                const active = bgMode === mode
                const needsSetup = mode === 'image' && !hasBgImage
                return (
                  <button
                    key={mode}
                    onClick={() => handleBgClick(mode)}
                    aria-pressed={active}
                    className={`rounded-[6px] px-4 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-card text-ink shadow-token-s'
                        : needsSetup
                          ? 'text-ink3'
                          : 'text-ink2 hover:text-ink'
                    }`}
                  >
                    {label}
                    {needsSetup && <span className="ml-1 text-[10px] text-ink3">未配置</span>}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-ink3">视频与图片的来源可在设置页更换</p>
          </section>

          {/* 快捷链接 */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-ink3">快捷链接</h3>
              <span className="text-xs tabular-nums text-ink3">
                {config.links.length}/{MAX_LINKS}
              </span>
            </div>

            {/* 添加：只需输入网址，标题与图标自动补全 */}
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
                placeholder="输入网址，如 github.com"
                aria-label="新链接网址"
                className="min-w-0 flex-1 rounded-token-sm border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink3 focus:border-line2 focus:outline-none"
              />
              <button
                onClick={addLink}
                className="shrink-0 rounded-token-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
              >
                添加
              </button>
            </div>

            {config.links.length === 0 ? (
              <p className="rounded-token-sm border border-dashed border-line2 px-4 py-6 text-center text-xs text-ink3">
                输入网址添加你的第一个链接，标题和图标会自动补全
              </p>
            ) : (
              <ul className="space-y-1.5">
                {config.links.map((link, index) => (
                  <li
                    key={link.id}
                    draggable
                    onDragStart={() => {
                      dragIndex.current = index
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverIndex(index)
                    }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragIndex.current !== null) {
                        moveLink(dragIndex.current, index)
                      }
                      dragIndex.current = null
                      setDragOverIndex(null)
                    }}
                    onDragEnd={() => {
                      dragIndex.current = null
                      setDragOverIndex(null)
                    }}
                    className={`group flex items-center gap-2 rounded-token-sm border bg-card px-2.5 py-2 transition-colors ${
                      dragOverIndex === index ? 'border-accent' : 'border-line'
                    }`}
                  >
                    {/* 拖拽手柄 */}
                    <span
                      className="cursor-grab select-none text-ink3 transition-colors group-hover:text-ink2"
                      title="拖动排序"
                      aria-hidden
                    >
                      ⋮⋮
                    </span>
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
                      <LinkIcon className="h-4 w-4 shrink-0 text-ink3" />
                    )}
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={link.title}
                        onChange={(e) => updateLink(link.id, { title: e.target.value })}
                        aria-label={`链接标题：${link.title}`}
                        className="w-full bg-transparent text-sm font-medium text-ink focus:outline-none"
                      />
                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) => updateLink(link.id, { url: e.target.value })}
                        onBlur={(e) => {
                          const url = normalizeHttpUrl(e.target.value)
                          if (url) {
                            updateLink(link.id, { url, icon: link.icon ?? faviconUrl(url) })
                          } else {
                            toast('网址格式不正确，已保留原值', { kind: 'error' })
                            updateLink(link.id, { url: link.url })
                          }
                        }}
                        aria-label={`链接网址：${link.title}`}
                        className="w-full truncate bg-transparent text-xs text-ink3 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => deleteLink(link)}
                      aria-label={`删除链接 ${link.title}`}
                      className="shrink-0 rounded-token-sm p-1.5 text-ink3 opacity-0 transition-all hover:bg-bg2 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <XmarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* AI 平台 */}
          <section>
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink3">
              AI 平台
            </h3>
            <ul className="space-y-1.5">
              {config.models.map((model) => (
                <li key={model.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-token-sm border border-line bg-card px-3 py-2.5 transition-colors hover:border-line2">
                    <input
                      type="checkbox"
                      checked={model.enabled}
                      onChange={() => toggleModel(model)}
                      className="h-4 w-4 shrink-0 rounded accent-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{model.name}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-ink3">
                      {model.type === 'language' ? '对话' : '多媒体'}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 底部：低频配置入口 */}
        <div className="shrink-0 border-t border-line px-5 py-3">
          <button
            onClick={onOpenOptions}
            className="flex w-full items-center justify-between rounded-token-sm px-3 py-2 text-sm text-ink2 transition-colors hover:bg-bg2 hover:text-ink"
          >
            <span>全部设置：字体 · 标题文字 · 背景来源</span>
            <ArrowUpRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
